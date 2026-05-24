import { config } from '../config.js';

export function requireAdmin(req, res, next) {
  if (!config.adminApiKey) {
    return res.status(503).json({ error: 'admin_disabled', detail: 'ADMIN_API_KEY not configured on server' });
  }
  const provided = req.header('x-admin-key') || req.query.adminKey;
  if (provided !== config.adminApiKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}
