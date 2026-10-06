// Backend route: downloads an Excel/CSV file from a OneDrive / SharePoint share link
// and passes the raw file back to the dashboard.
//
// Works in two modes:
//  1) PUBLIC links ("Anyone with the link can view"): no setup needed.
//  2) COMPANY links (restricted to your organization): needs the optional
//     MS_TENANT_ID / MS_CLIENT_ID / MS_CLIENT_SECRET environment variables
//     (an IT admin creates these in Microsoft Entra). See README.

const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions can return roughly 4.5 MB

function isAllowedHost(hostname) {
  const h = hostname.toLowerCase();
  return (
    h === '1drv.ms' ||
    h === 'onedrive.live.com' ||
    h === 'onedrive.com' ||
    h === 'sharepoint.com' ||
    h.endsWith('.sharepoint.com') ||
    h.endsWith('.sharepoint.us') ||
    h.endsWith('.sharepoint.cn')
  );
}

function shareId(url) {
  const b64 = Buffer.from(url, 'utf8').toString('base64').replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');
  return `u!${b64}`;
}

async function getGraphToken() {
  const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET } = process.env;
  if (!MS_TENANT_ID || !MS_CLIENT_ID || !MS_CLIENT_SECRET) return null;
  const r = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(MS_TENANT_ID)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  if (!r.ok) throw new Error('graph_token_failed');
  const j = await r.json();
  return j.access_token;
}

async function tryFetch(url, headers = {}) {
  const r = await fetch(url, { redirect: 'follow', headers });
  if (!r.ok) return { ok: false, status: r.status };
  const type = (r.headers.get('content-type') || '').toLowerCase();
  // A sign-in page or error page comes back as HTML: that means no permission.
  if (type.includes('text/html')) return { ok: false, status: 401 };
  const len = Number(r.headers.get('content-length') || 0);
  if (len > MAX_BYTES) return { ok: false, status: 413 };
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) return { ok: false, status: 413 };
  return { ok: true, buf };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Use POST.' });
  }

  const link = String((req.body && req.body.url) || '').trim();
  let parsed;
  try {
    parsed = new URL(link);
  } catch {
    return res.status(400).json({ error: 'bad_url', message: 'That does not look like a valid link.' });
  }
  if (parsed.protocol !== 'https:' || !isAllowedHost(parsed.hostname)) {
    return res.status(400).json({
      error: 'bad_host',
      message: 'Only OneDrive (1drv.ms, onedrive.live.com) and SharePoint (*.sharepoint.com) links are supported.',
    });
  }

  const id = shareId(link);
  let lastStatus = 0;

  try {
    // Mode 2: company access via Microsoft Graph (only if configured)
    const token = await getGraphToken();
    if (token) {
      const g = await tryFetch(`https://graph.microsoft.com/v1.0/shares/${id}/driveItem/content`, {
        Authorization: `Bearer ${token}`,
      });
      if (g.ok) return res.status(200).setHeader('Content-Type', 'application/octet-stream').send(g.buf);
      lastStatus = g.status;
    }

    // Mode 1: public share links
    const candidates = [];
    if (parsed.hostname.toLowerCase().includes('sharepoint')) {
      candidates.push(link + (link.includes('?') ? '&' : '?') + 'download=1');
    } else {
      candidates.push(`https://api.onedrive.com/v1.0/shares/${id}/root/content`);
      candidates.push(link + (link.includes('?') ? '&' : '?') + 'download=1');
    }
    for (const c of candidates) {
      const r = await tryFetch(c);
      if (r.ok) return res.status(200).setHeader('Content-Type', 'application/octet-stream').send(r.buf);
      lastStatus = r.status || lastStatus;
    }
  } catch (err) {
    if (String(err.message) === 'graph_token_failed') {
      return res.status(502).json({
        error: 'graph_auth',
        message: 'Microsoft sign-in for the company app failed. Check MS_TENANT_ID, MS_CLIENT_ID and MS_CLIENT_SECRET in Vercel.',
      });
    }
    return res.status(502).json({ error: 'network', message: 'Could not reach OneDrive. Please try again.' });
  }

  if (lastStatus === 413) {
    return res.status(413).json({
      error: 'too_large',
      message: 'That file is larger than 4 MB. Save a smaller copy (for example, only the sheet you need) and try again.',
    });
  }
  return res.status(403).json({
    error: 'no_access',
    message:
      'OneDrive did not allow access to that file. Set the link to "Anyone with the link can view", or ask your IT admin to enable company access (see the README, section "OneDrive later").',
  });
}
