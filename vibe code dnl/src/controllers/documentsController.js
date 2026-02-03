// src/controllers/documentsController.js
// Controller for handling document uploads for loads
const { pool } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { canAccessLoad } = require('../utils/access');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/loads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const loadId = req.params.id;
    const loadDir = path.join(uploadsDir, loadId.toString());
    
    // Create load-specific directory if it doesn't exist
    if (!fs.existsSync(loadDir)) {
      fs.mkdirSync(loadDir, { recursive: true });
    }
    
    cb(null, loadDir);
  },
  filename: function (req, file, cb) {
    const docType = req.body.documentType; // 'bol', 'pod', or 'rateConf'
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${docType}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// File filter to only accept PDFs, images, and common document types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, images, and document files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload document
exports.uploadDocument = async (req, res) => {
  try {
    const loadId = req.params.id;
    const { documentType } = req.body; // 'bol', 'pod', or 'rateConf'

    const allowed = await canAccessLoad(pool, req.user, loadId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
    
    if (!['bol', 'pod', 'rateConf'].includes(documentType)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Store relative path from uploads directory
    const relativePath = `/uploads/loads/${loadId}/${req.file.filename}`;
    
    // Update database with file path
    const columnMap = {
      bol: 'bolDocumentPath',
      pod: 'podDocumentPath',
      rateConf: 'rateConfDocumentPath'
    };
    
    const statusColumnMap = {
      bol: 'bolStatus',
      pod: 'podStatus',
      rateConf: 'rateConfStatus'
    };
    
    const column = columnMap[documentType];
    const statusColumn = statusColumnMap[documentType];
    
    await pool.query(
      `UPDATE Loads SET ${column} = ?, ${statusColumn} = 'received' WHERE id = ?`,
      [relativePath, loadId]
    );
    
    res.json({
      message: 'Document uploaded successfully',
      path: relativePath,
      filename: req.file.filename,
      documentType
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get document (download)
exports.getDocument = async (req, res) => {
  try {
    const { id, filename } = req.params;

    const allowed = await canAccessLoad(pool, req.user, id);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

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
exports.deleteDocument = async (req, res) => {
  try {
    const loadId = req.params.id;
    const { documentType } = req.body;

    const allowed = await canAccessLoad(pool, req.user, loadId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
    
    if (!['bol', 'pod', 'rateConf'].includes(documentType)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }
    
    const columnMap = {
      bol: 'bolDocumentPath',
      pod: 'podDocumentPath',
      rateConf: 'rateConfDocumentPath'
    };
    
    const statusColumnMap = {
      bol: 'bolStatus',
      pod: 'podStatus',
      rateConf: 'rateConfStatus'
    };
    
    // Get current file path
    const [rows] = await pool.query('SELECT * FROM Loads WHERE id = ?', [loadId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Load not found' });
    }
    
    const column = columnMap[documentType];
    const filePath = rows[0][column];
    
    if (filePath) {
      const fullPath = path.join(__dirname, '../..', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    
    // Update database
    const statusColumn = statusColumnMap[documentType];
    await pool.query(
      `UPDATE Loads SET ${column} = NULL, ${statusColumn} = 'pending' WHERE id = ?`,
      [loadId]
    );
    
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upload = upload;
