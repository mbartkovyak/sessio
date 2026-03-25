export default async function handler(req: any, res: any) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return res.status(500).json({ error: 'SUPABASE_URL not configured' });
  }

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/automation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret,
      },
      body: JSON.stringify({ action: 'full' }),
    });

    const data = await resp.json();
    return res.status(resp.ok ? 200 : 500).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
