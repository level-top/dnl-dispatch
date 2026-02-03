// src/routes/loads.js
// Express router for Loads entity
const express = require('express');
const loadsController = require('../controllers/loadsController');
const loadExtraDocumentsController = require('../controllers/loadExtraDocumentsController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

// Get all loads
router.get('/', loadsController.getAllLoads);
// Get load by ID
router.get('/:id', loadsController.getLoadById);
// Create new load
router.post('/', loadsController.createLoad);
// Update load by ID
router.put('/:id', loadsController.updateLoad);
// Delete load by ID
router.delete('/:id', loadsController.deleteLoad);

// Extra Documents (multi-file)
router.get('/:id/extra-documents', loadExtraDocumentsController.listExtraDocuments);
router.post(
	'/:id/extra-documents',
	loadExtraDocumentsController.upload.array('documents'),
	loadExtraDocumentsController.uploadExtraDocuments
);
router.delete('/:id/extra-documents/:docId', loadExtraDocumentsController.deleteExtraDocument);

module.exports = router;
