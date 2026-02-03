// src/controllers/loadExtraDocumentsController.js
// Multi-file "Extra Documents" for Loads
const { pool } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { canAccessLoad } = require('../utils/access');

const loadsUploadsDir = path.join(__dirname, '../../uploads/loads');

// Ensure base uploads directory exists
if (!fs.existsSync(loadsUploadsDir)) {
  fs.mkdirSync(loadsUploadsDir, { recursive: true });
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
    const loadId = req.params.id;
    const loadDir = path.join(loadsUploadsDir, loadId.toString(), 'extra');

    if (!fs.existsSync(loadDir)) {
      fs.mkdirSync(loadDir, { recursive: true });
    }

    cb(null, loadDir);
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
    const loadId = req.params.id;

    const allowed = await canAccessLoad(pool, req.user, loadId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const [loads] = await pool.query('SELECT id FROM Loads WHERE id = ?', [loadId]);
    if (loads.length === 0) {
      return res.status(404).json({ error: 'Load not found' });
    }

    const [rows] = await pool.query(
      'SELECT id, originalName, storedName, path, uploadedAt FROM LoadExtraDocuments WHERE loadId = ? ORDER BY uploadedAt DESC, id DESC',
      [loadId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadExtraDocuments = async (req, res) => {
  try {
    const loadId = req.params.id;

    const allowed = await canAccessLoad(pool, req.user, loadId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const [loads] = await pool.query('SELECT id FROM Loads WHERE id = ?', [loadId]);
    if (loads.length === 0) {
      return res.status(404).json({ error: 'Load not found' });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const values = files.map((f) => {
      const relativePath = `/uploads/loads/${loadId}/extra/${f.filename}`;
      return [loadId, f.originalname, f.filename, relativePath];
    });

    await pool.query(
      'INSERT INTO LoadExtraDocuments (loadId, originalName, storedName, path) VALUES ?',
      [values]
    );

    res.json({ message: 'Extra documents uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteExtraDocument = async (req, res) => {
  try {
    const loadId = req.params.id;
    const docId = req.params.docId;

    const allowed = await canAccessLoad(pool, req.user, loadId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const [rows] = await pool.query(
      'SELECT id, path FROM LoadExtraDocuments WHERE id = ? AND loadId = ?',
      [docId, loadId]
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

    await pool.query('DELETE FROM LoadExtraDocuments WHERE id = ? AND loadId = ?', [docId, loadId]);

    res.json({ message: 'Extra document deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
