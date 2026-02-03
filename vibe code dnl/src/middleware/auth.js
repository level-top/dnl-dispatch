// src/middleware/auth.js
const jwt = require('jsonwebtoken');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-me';
}

function normalizeRole(role) {
  return String(role || '').toLowerCase();
}

function requireAuth(req, res, next) {
  const header = String(req.headers.authorization || '');
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(m[1], getJwtSecret());
    req.user = {
      id: Number(payload.id),
      role: normalizeRole(payload.role),
      name: payload.name,
      userName: payload.userName,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function requireRole(...roles) {
  const allowed = new Set((roles || []).map(normalizeRole));
  return (req, res, next) => {
    const role = normalizeRole(req.user?.role);
    if (!role || !allowed.has(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
  normalizeRole,
};
