// src/controllers/driverDocumentsController.js
// Controller for handling document uploads for drivers
const { pool } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/drivers');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedDocumentTypes = [
  'driverLicenseFront',
  'driverLicenseBack',
  'coi',
  'mcAuthority',
  'w9',
  'voidedCheck',
  'factoringCompany',
];

const columnMap = {
  driverLicenseFront: 'driverLicenseFrontPath',
  driverLicenseBack: 'driverLicenseBackPath',
  coi: 'coiDocumentPath',
  mcAuthority: 'mcAuthorityDocumentPath',
  w9: 'w9DocumentPath',
  voidedCheck: 'voidedCheckDocumentPath',
  factoringCompany: 'factoringCompanyDocumentPath',
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const driverId = req.params.id;
    const driverDir = path.join(uploadsDir, driverId.toString());

    if (!fs.existsSync(driverDir)) {
      fs.mkdirSync(driverDir, { recursive: true });
    }

    cb(null, driverDir);
  },
  filename: function (req, file, cb) {
    const docType = req.body.documentType;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${docType}_${timestamp}${ext}`);
  },
});

// File filter to only accept PDFs, images, and common document types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }

  cb(new Error('Only PDF, images, and document files are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

exports.upload = upload;

// Upload document
exports.uploadDriverDocument = async (req, res) => {
  try {
    const driverId = req.params.id;
    const { documentType } = req.body;

    if (!allowedDocumentTypes.includes(documentType)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const column = columnMap[documentType];

    // Verify driver exists
    const [drivers] = await pool.query('SELECT id FROM Drivers WHERE id = ?', [driverId]);
    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const relativePath = `/uploads/drivers/${driverId}/${req.file.filename}`;

    await pool.query(`UPDATE Drivers SET ${column} = ? WHERE id = ?`, [relativePath, driverId]);

    res.json({
      message: 'Document uploaded successfully',
      path: relativePath,
      filename: req.file.filename,
      documentType,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get document (download/view)
exports.getDriverDocument = async (req, res) => {
  try {
    const { id, filename } = req.params;
    const filePath = path.join(uploadsDir, id, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete document
exports.deleteDriverDocument = async (req, res) => {
  try {
    const driverId = req.params.id;
    const { documentType } = req.body;

    if (!allowedDocumentTypes.includes(documentType)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    const column = columnMap[documentType];

    const [rows] = await pool.query('SELECT * FROM Drivers WHERE id = ?', [driverId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const currentPath = rows[0][column];
    if (currentPath) {
      const fullPath = path.join(__dirname, '../..', currentPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await pool.query(`UPDATE Drivers SET ${column} = NULL WHERE id = ?`, [driverId]);

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
