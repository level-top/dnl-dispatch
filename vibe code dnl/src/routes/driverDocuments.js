// src/routes/driverDocuments.js
// Routes for driver document uploads
const express = require('express');
const router = express.Router();

const {
  upload,
  uploadDriverDocument,
  getDriverDocument,
  deleteDriverDocument,
} = require('../controllers/driverDocumentsController');

// Upload a document for a driver
router.post('/:id/upload-document', upload.single('document'), uploadDriverDocument);

// Get/download a document
router.get('/:id/documents/:filename', getDriverDocument);

// Delete a document
router.delete('/:id/delete-document', deleteDriverDocument);

module.exports = router;
