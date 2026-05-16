// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { normalizeRole } = require('../middleware/auth');
const { getJwtSecret } = require('../config/security');

function isBcryptHash(value) {
  return typeof value === 'string' && value.startsWith('$2');
}

exports.login = async (req, res) => {
  try {
    const { userName, password } = req.body || {};

    if (!userName || !password) {
      return res.status(400).json({ error: 'userName and password are required' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, userName, password, role, contactNumber, email FROM Users WHERE userName = ? LIMIT 1',
      [String(userName)]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const stored = user.password;

    let ok = false;
    if (isBcryptHash(stored)) {
      ok = await bcrypt.compare(String(password), stored);
    } else {
      ok = String(password) === String(stored);
      // Opportunistic upgrade to bcrypt
      if (ok) {
        const hash = await bcrypt.hash(String(password), 10);
        await pool.query('UPDATE Users SET password = ? WHERE id = ?', [hash, user.id]);
      }
    }

    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const role = normalizeRole(user.role);

    const token = jwt.sign(
      { id: user.id, role, name: user.name, userName: user.userName },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        userName: user.userName,
        role,
        contactNumber: user.contactNumber,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.me = async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      role: req.user.role,
      name: req.user.name,
      userName: req.user.userName,
    },
  });
};
