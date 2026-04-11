/**
 * Supabase Auth Send Email Hook — routes all auth emails through Resend.
 *
 * Supabase Auth calls this function (HTTP webhook) whenever it needs to send
 * an email (signup confirmation, password recovery, magic link, email change,
 * etc.). The function verifies the svix signature, builds a branded HTML
 * email, and sends it via the Resend API.
 *
 * Env vars (auto-provided or via `supabase secrets set`):
 *   SUPABASE_URL           — auto-provided by Supabase runtime
 *   RESEND_API_KEY          — Resend API key
 *   SEND_EMAIL_HOOK_SECRET  — svix webhook secret (format: "v1,whsec_<base64>")
 */

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const FROM_EMAIL = 'Sessio <noreply@get-sessio.com>';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface HookPayload {
  user: {
    id: string;
    email: string;
    email_change?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new: string;
    token_hash_new: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Email content per action type
// ─────────────────────────────────────────────────────────────────────────────

interface EmailContent {
  subject: string;
  heading: string;
  body: string;
  buttonText?: string;
  /** true = show the OTP code in the email */
  showOtp?: boolean;
  /** true = no verification link, just informational */
  notificationOnly?: boolean;
}

function getEmailContent(actionType: string): EmailContent {
  switch (actionType) {
    case 'signup':
      return {
        subject: 'Confirm your email — Sessio',
        heading: 'Welcome to Sessio',
        body: 'Confirm your email address to get started with Sessio.',
        buttonText: 'Confirm Email',
        showOtp: true,
      };
    case 'recovery':
      return {
        subject: 'Reset your password — Sessio',
        heading: 'Reset Your Password',
        body: 'Click the button below to set a new password for your Sessio account.',
        buttonText: 'Reset Password',
        showOtp: true,
      };
    case 'magiclink':
      return {
        subject: 'Sign in to Sessio',
        heading: 'Sign In to Sessio',
        body: 'Click the button below to sign in to your account.',
        buttonText: 'Sign In',
        showOtp: true,
      };
    case 'email_change':
      return {
        subject: 'Confirm email change — Sessio',
        heading: 'Confirm Your New Email',
        body: 'Confirm that you want to change the email address on your Sessio account.',
        buttonText: 'Confirm Change',
        showOtp: true,
      };
    case 'invite':
      return {
        subject: "You're invited to Sessio",
        heading: "You're Invited",
        body: "You've been invited to join Sessio — the sports coaching platform.",
        buttonText: 'Accept Invite',
        showOtp: true,
      };
    case 'reauthentication':
      return {
        subject: 'Verification code — Sessio',
        heading: 'Confirm Your Identity',
        body: 'Enter the code below to verify your identity.',
        showOtp: true,
      };
    case 'password_changed_notification':
      return {
        subject: 'Password changed — Sessio',
        heading: 'Your Password Was Changed',
        body: 'Your Sessio account password was recently changed. If this was not you, please reset your password immediately or contact support.',
        notificationOnly: true,
      };
    case 'email_changed_notification':
      return {
        subject: 'Email changed — Sessio',
        heading: 'Your Email Was Changed',
        body: 'The email address on your Sessio account was recently changed. If this was not you, please contact support immediately.',
        notificationOnly: true,
      };
    default:
      // Covers any future types — always send something, never silently drop
      return {
        subject: 'Sessio — Action Required',
        heading: 'Sessio Verification',
        body: 'Use the button or code below to continue.',
        buttonText: 'Verify',
        showOtp: true,
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification URL
// ─────────────────────────────────────────────────────────────────────────────

function buildVerifyUrl(
  tokenHash: string,
  actionType: string,
  redirectTo: string,
): string {
  const params = new URLSearchParams({
    token: tokenHash,
    type: actionType,
    redirect_to: redirectTo,
  });
  return `${SUPABASE_URL}/auth/v1/verify?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML template
// ─────────────────────────────────────────────────────────────────────────────

function buildEmailHtml(opts: {
  heading: string;
  bodyText: string;
  buttonText?: string;
  buttonUrl?: string;
  otpCode?: string;
}): string {
  const { heading, bodyText, buttonText, buttonUrl, otpCode } = opts;

  const buttonBlock =
    buttonText && buttonUrl
      ? `<tr><td style="padding:24px 0 0">
           <a href="${escapeHtml(buttonUrl)}" target="_blank" rel="noopener noreferrer"
              style="display:inline-block;padding:14px 32px;background:#171717;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;">
             ${escapeHtml(buttonText)}
           </a>
         </td></tr>`
      : '';

  const otpBlock = otpCode
    ? `<tr><td style="padding:16px 0 0">
         <p style="margin:0;font-size:13px;color:#888;">Or enter this code manually:</p>
         <p style="margin:8px 0 0;font-size:24px;font-weight:700;letter-spacing:4px;color:#171717;">${escapeHtml(otpCode)}</p>
       </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <img src="https://get-sessio.com/icons/icon-192.png" alt="Sessio" width="48" height="48" style="border-radius:12px;" />
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:24px 32px 32px;text-align:center;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#171717;">${escapeHtml(heading)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#555;">${escapeHtml(bodyText)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            ${buttonBlock}
            ${otpBlock}
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px 24px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#999;">Sessio — Sports coaching platform</p>
          <p style="margin:4px 0 0;font-size:11px;color:#bbb;">If you didn't request this email, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────────────────────
// Send via Resend REST API
// ─────────────────────────────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API ${res.status}: ${body}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Fail fast on missing config
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    // 1. Read raw payload (required for signature verification)
    const payload = await req.text();
    let parsed: HookPayload;

    // 2. Verify svix signature
    if (HOOK_SECRET) {
      const secret = HOOK_SECRET.replace('v1,whsec_', '');
      const wh = new Webhook(secret);
      const headers = Object.fromEntries(req.headers);
      parsed = wh.verify(payload, headers) as unknown as HookPayload;
    } else {
      // No secret configured — parse directly (dev/testing fallback)
      parsed = JSON.parse(payload);
    }

    const { user, email_data } = parsed;
    const {
      token,
      token_hash,
      redirect_to,
      email_action_type,
      site_url,
      token_new,
      token_hash_new,
    } = email_data;

    const content = getEmailContent(email_action_type);

    // 3. Notification-only emails (no verification link)
    if (content.notificationOnly) {
      const html = buildEmailHtml({
        heading: content.heading,
        bodyText: content.body,
      });
      await sendEmail(user.email, content.subject, html);
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Build verification URL
    const effectiveRedirect = redirect_to || site_url || '';
    const verifyUrl = token_hash
      ? buildVerifyUrl(token_hash, email_action_type, effectiveRedirect)
      : undefined;

    // 5. Handle email_change with secure mode (two emails)
    if (email_action_type === 'email_change' && token_new && token_hash_new) {
      // Email to current address — confirm the change
      const currentHtml = buildEmailHtml({
        heading: 'Email Change Requested',
        bodyText:
          'We received a request to change your Sessio email. Confirm from your current email address.',
        buttonText: 'Confirm Change',
        buttonUrl: verifyUrl,
        otpCode: content.showOtp ? token : undefined,
      });
      await sendEmail(user.email, 'Confirm email change — Sessio', currentHtml);

      // Email to new address — confirm the new email
      const newEmail = user.email_change || '';
      if (newEmail) {
        const newVerifyUrl = buildVerifyUrl(
          token_hash_new,
          email_action_type,
          effectiveRedirect,
        );
        const newHtml = buildEmailHtml({
          heading: 'Confirm Your New Email',
          bodyText: 'Confirm this is your new email address for Sessio.',
          buttonText: 'Confirm Email',
          buttonUrl: newVerifyUrl,
          otpCode: token_new || undefined,
        });
        await sendEmail(newEmail, 'Confirm your new email — Sessio', newHtml);
      }

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. Standard single email
    const html = buildEmailHtml({
      heading: content.heading,
      bodyText: content.body,
      buttonText: content.buttonText,
      buttonUrl: verifyUrl,
      otpCode: content.showOtp ? token : undefined,
    });
    await sendEmail(user.email, content.subject, html);

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[send-email] Error:', message);
    return new Response(
      JSON.stringify({ error: { http_code: 500, message } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
