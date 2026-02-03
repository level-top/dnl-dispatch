// src/routes/drivers.js
// Express router for Drivers entity
const express = require('express');
const driversController = require('../controllers/driversController');
const driverExtraDocumentsController = require('../controllers/driverExtraDocumentsController');
const driverAgreementsController = require('../controllers/driverAgreementsController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

// Get all drivers
router.get('/', driversController.getAllDrivers);
// Get driver by ID
router.get('/:id', driversController.getDriverById);
// Create new driver
router.post('/', driversController.createDriver);
// Update driver by ID
router.put('/:id', driversController.updateDriver);
// Delete driver by ID
router.delete('/:id', driversController.deleteDriver);

// Extra Documents (multi-file)
router.get('/:id/extra-documents', driverExtraDocumentsController.listExtraDocuments);
router.post(
	'/:id/extra-documents',
	driverExtraDocumentsController.upload.array('documents'),
	driverExtraDocumentsController.uploadExtraDocuments
);
router.delete('/:id/extra-documents/:docId', driverExtraDocumentsController.deleteExtraDocument);

// Driver Agreements (signing links)
router.get('/:id/agreements', driverAgreementsController.listAgreementsForDriver);
router.post('/:id/agreements', driverAgreementsController.createAgreementForDriver);

module.exports = router;
