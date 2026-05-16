// src/routes/uploads.js
// Auth-gated serving of uploaded files.
// - /uploads/agreements is public (token-based signing flow)
// - /uploads/loads and /uploads/drivers require JWT + scoped access

const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');

const { pool } = require('../db');
const { getJwtSecret } = require('../config/security');
const { canAccessDriver, canAccessLoad } = require('../utils/access');
const { normalizeRole } = require('../middleware/auth');

const router = express.Router();

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');

function requireUploadsAuth(req, res, next) {
  const header = String(req.headers.authorization || '');
  const m = header.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1] || (typeof req.query?.token === 'string' ? req.query.token : null);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, getJwtSecret());
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

function safeJoin(baseDir, ...segments) {
  const targetPath = path.normalize(path.join(baseDir, ...segments));
  const normalizedBase = path.normalize(baseDir + path.sep);
  if (!targetPath.startsWith(normalizedBase)) return null;
  return targetPath;
}

function matchUploadPath(pattern, reqPath) {
  const match = String(reqPath || '').match(pattern);
  if (!match) return null;
  return {
    recordId: match[1],
    relativePath: match[2] || '',
  };
}

// Public: agreements (signing links)
router.use('/agreements', express.static(path.join(uploadsRoot, 'agreements')));

// Protected: loads
router.get(/^\/loads\/([^/]+)\/(.+)$/, requireUploadsAuth, async (req, res) => {
  try {
    const match = matchUploadPath(/^\/loads\/([^/]+)\/(.+)$/, req.path);
    if (!match) return res.status(400).json({ error: 'Invalid path' });

    const loadId = match.recordId;
    const allowed = await canAccessLoad(pool, req.user, loadId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const rest = match.relativePath;
    const baseDir = path.join(uploadsRoot, 'loads', String(loadId));
    const fullPath = safeJoin(baseDir, rest);
    if (!fullPath) return res.status(400).json({ error: 'Invalid path' });

    return res.sendFile(fullPath);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Protected: drivers
router.get(/^\/drivers\/([^/]+)\/(.+)$/, requireUploadsAuth, async (req, res) => {
  try {
    const match = matchUploadPath(/^\/drivers\/([^/]+)\/(.+)$/, req.path);
    if (!match) return res.status(400).json({ error: 'Invalid path' });

    const driverId = match.recordId;
    const allowed = await canAccessDriver(pool, req.user, driverId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const rest = match.relativePath;
    const baseDir = path.join(uploadsRoot, 'drivers', String(driverId));
    const fullPath = safeJoin(baseDir, rest);
    if (!fullPath) return res.status(400).json({ error: 'Invalid path' });

    return res.sendFile(fullPath);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
