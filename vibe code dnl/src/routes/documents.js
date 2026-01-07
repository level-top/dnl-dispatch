// src/routes/documents.js
// Routes for document uploads
const express = require('express');
const router = express.Router();
const { uploadDocument, getDocument, deleteDocument, upload } = require('../controllers/documentsController');

// Upload document for a load
router.post('/loads/:id/upload-document', upload.single('document'), uploadDocument);

// Get/download document
router.get('/loads/:id/documents/:filename', getDocument);

// Delete document
router.delete('/loads/:id/delete-document', deleteDocument);

module.exports = router;
