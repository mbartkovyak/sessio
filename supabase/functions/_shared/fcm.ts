// FCM HTTP v1 sender for Supabase edge functions.
//
// - Reads FCM_SERVICE_ACCOUNT_JSON (single-line JSON) + FCM_PROJECT_ID from env
// - Mints OAuth2 access tokens from the service account using native
//   crypto.subtle (no npm deps), caches them in module scope until expiry
// - POSTs to https://fcm.googleapis.com/v1/projects/{project_id}/messages:send
// - Throws typed errors so callers can decide how to handle stale tokens

export type FcmPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  sender_id?: string;
};

/**
 * Thrown when the FCM token is no longer valid and the caller should delete
 * the row from push_subscriptions. Matches the same cleanup contract as
 * web-push 410/404.
 */
export class FcmUnregisteredError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'FcmUnregisteredError';
  }
}

// ── Service account + access token ────────────────────────────────────────
type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri: string;
};

let cachedToken: { token: string; expiresAt: number } | null = null;
let cachedServiceAccount: ServiceAccount | null = null;
let cachedPrivateKey: CryptoKey | null = null;

function getServiceAccount(): ServiceAccount {
  if (cachedServiceAccount) return cachedServiceAccount;
  const raw = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error('FCM_SERVICE_ACCOUNT_JSON env var is not set');
  try {
    cachedServiceAccount = JSON.parse(raw) as ServiceAccount;
  } catch (e: any) {
    throw new Error(`FCM_SERVICE_ACCOUNT_JSON is not valid JSON: ${e.message}`);
  }
  return cachedServiceAccount;
}

function getProjectId(): string {
  const id = Deno.env.get('FCM_PROJECT_ID');
  if (!id) throw new Error('FCM_PROJECT_ID env var is not set');
  return id;
}

/** Convert a PEM-encoded RSA private key to a CryptoKey for RS256 signing. */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  if (cachedPrivateKey) return cachedPrivateKey;
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  cachedPrivateKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return cachedPrivateKey;
}

function base64UrlEncode(bytes: Uint8Array | string): string {
  const b64 = typeof bytes === 'string'
    ? btoa(bytes)
    : btoa(String.fromCharCode(...bytes));
  return b64.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Mint a new Google OAuth2 access token by signing a JWT with the service account. */
async function mintAccessToken(): Promise<{ token: string; expiresAt: number }> {
  const sa = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // Google caps at 1h

  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: sa.token_uri,
    iat: now,
    exp,
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const key = await importPrivateKey(sa.private_key);
  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)),
  );
  const jwt = `${unsigned}.${base64UrlEncode(signature)}`;

  const resp = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google OAuth token exchange failed: ${resp.status} ${text}`);
  }

  const data = await resp.json() as { access_token: string; expires_in: number };
  // Refresh 5 min before expiry so in-flight requests don't race
  return { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 300) * 1000 };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  cachedToken = await mintAccessToken();
  return cachedToken.token;
}

// ── Send ────────────────────────────────────────────────────────────────────

/**
 * Send a push notification to a single FCM token. Throws FcmUnregisteredError
 * if the token is stale so the caller can delete the row.
 */
export async function sendFcmV1(token: string, payload: FcmPayload): Promise<void> {
  const accessToken = await getAccessToken();
  const projectId = getProjectId();

  // Use `data` only — the service worker / Firebase Messaging SDK constructs
  // the visible notification on the client. All fields are coerced to strings
  // because FCM's data payload only accepts string values.
  const data: Record<string, string> = {
    title: payload.title,
    body: payload.body,
  };
  if (payload.url)       data.url       = payload.url;
  if (payload.tag)       data.tag       = payload.tag;
  if (payload.sender_id) data.sender_id = payload.sender_id;

  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          data,
          android: { priority: 'HIGH', notification: { tag: payload.tag ?? 'sessio' } },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { sound: 'default', 'thread-id': payload.tag ?? 'sessio' } },
          },
        },
      }),
    },
  );

  if (resp.ok) return;

  const text = await resp.text();

  // FCM error mapping — cleanup contract mirrors web-push 410/404.
  // https://firebase.google.com/docs/cloud-messaging/send-message#rest
  // UNREGISTERED = app uninstalled or token revoked
  // INVALID_ARGUMENT on a malformed token also means "drop the row"
  // NOT_FOUND = token never existed
  const isStale =
    text.includes('UNREGISTERED') ||
    text.includes('INVALID_ARGUMENT') ||
    text.includes('NOT_FOUND') ||
    resp.status === 404 ||
    resp.status === 410;

  if (isStale) {
    throw new FcmUnregisteredError(`FCM token stale: ${resp.status} ${text}`);
  }

  throw new Error(`FCM send failed: ${resp.status} ${text}`);
}
