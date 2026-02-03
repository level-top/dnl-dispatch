// src/controllers/driverExtraDocumentsController.js
// Multi-file "Extra Documents" for Drivers
const { pool } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { canAccessDriver } = require('../utils/access');

const driversUploadsDir = path.join(__dirname, '../../uploads/drivers');

if (!fs.existsSync(driversUploadsDir)) {
  fs.mkdirSync(driversUploadsDir, { recursive: true });
}

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) return cb(null, true);
  cb(new Error('Only PDF, images, and document files are allowed'));
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const driverId = req.params.id;
    const driverDir = path.join(driversUploadsDir, driverId.toString(), 'extra');

    if (!fs.existsSync(driverDir)) {
      fs.mkdirSync(driverDir, { recursive: true });
    }

    cb(null, driverDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `extra_${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

exports.upload = upload;

exports.listExtraDocuments = async (req, res) => {
  try {
    const driverId = req.params.id;

    const allowed = await canAccessDriver(pool, req.user, driverId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const [drivers] = await pool.query('SELECT id FROM Drivers WHERE id = ?', [driverId]);
    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const [rows] = await pool.query(
      'SELECT id, originalName, storedName, path, uploadedAt FROM DriverExtraDocuments WHERE driverId = ? ORDER BY uploadedAt DESC, id DESC',
      [driverId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadExtraDocuments = async (req, res) => {
  try {
    const driverId = req.params.id;

    const allowed = await canAccessDriver(pool, req.user, driverId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const [drivers] = await pool.query('SELECT id FROM Drivers WHERE id = ?', [driverId]);
    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const values = files.map((f) => {
      const relativePath = `/uploads/drivers/${driverId}/extra/${f.filename}`;
      return [driverId, f.originalname, f.filename, relativePath];
    });

    await pool.query(
      'INSERT INTO DriverExtraDocuments (driverId, originalName, storedName, path) VALUES ?',
      [values]
    );

    res.json({ message: 'Extra documents uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteExtraDocument = async (req, res) => {
  try {
    const driverId = req.params.id;
    const docId = req.params.docId;

    const allowed = await canAccessDriver(pool, req.user, driverId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const [rows] = await pool.query(
      'SELECT id, path FROM DriverExtraDocuments WHERE id = ? AND driverId = ?',
      [docId, driverId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = rows[0].path;
    if (filePath) {
      const fullPath = path.join(__dirname, '../..', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await pool.query('DELETE FROM DriverExtraDocuments WHERE id = ? AND driverId = ?', [docId, driverId]);

    res.json({ message: 'Extra document deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
