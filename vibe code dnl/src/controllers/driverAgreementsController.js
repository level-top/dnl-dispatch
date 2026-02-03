// src/controllers/driverAgreementsController.js
const crypto = require('crypto');
const { pool } = require('../db');
const { canAccessDriver } = require('../utils/access');

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function newToken() {
  // 64-char token, safe for URLs
  return crypto.randomBytes(32).toString('hex');
}

exports.listAgreementsForDriver = async (req, res) => {
  try {
    const driverId = Number(req.params.id);
    if (!Number.isFinite(driverId)) {
      return res.status(400).json({ error: 'Invalid driver id' });
    }

    const allowed = await canAccessDriver(pool, req.user, driverId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const [rows] = await pool.query(
      `SELECT id, driverId, status, createdAt, expiresAt, viewedAt, signedAt, signerName, signatureImagePath, signedPdfPath
       FROM DriverAgreements
       WHERE driverId = ?
       ORDER BY id DESC`,
      [driverId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAgreementForDriver = async (req, res) => {
  try {
    const driverId = Number(req.params.id);
    if (!Number.isFinite(driverId)) {
      return res.status(400).json({ error: 'Invalid driver id' });
    }

    const allowed = await canAccessDriver(pool, req.user, driverId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const [drivers] = await pool.query('SELECT id, name, email, contactNumber FROM Drivers WHERE id = ?', [driverId]);
    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const token = newToken();
    const tokenHash = sha256Hex(token);

    // Default: link expires in 30 days
    const expiresInDays = Number(req.body?.expiresInDays ?? 30);
    const safeDays = Number.isFinite(expiresInDays) && expiresInDays > 0 ? Math.min(expiresInDays, 365) : 30;

    const [result] = await pool.query(
      `INSERT INTO DriverAgreements (driverId, tokenHash, status, expiresAt)
       VALUES (?, ?, 'pending', DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [driverId, tokenHash, safeDays]
    );

    // We cannot reconstruct the token later (only hash is stored), so return it now.
    res.status(201).json({
      agreementId: result.insertId,
      driverId,
      token,
      expiresInDays: safeDays,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
