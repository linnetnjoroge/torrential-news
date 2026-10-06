// Tells the dashboard which optional features are configured.
// It only returns true/false. It NEVER returns the keys themselves.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
    oneDriveEnterprise: Boolean(
      process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET
    ),
  });
}
