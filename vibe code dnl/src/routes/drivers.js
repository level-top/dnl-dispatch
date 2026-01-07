// src/routes/drivers.js
// Express router for Drivers entity
const express = require('express');
const driversController = require('../controllers/driversController');
const router = express.Router();

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

module.exports = router;
