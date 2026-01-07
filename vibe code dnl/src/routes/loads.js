// src/routes/loads.js
// Express router for Loads entity
const express = require('express');
const loadsController = require('../controllers/loadsController');
const router = express.Router();

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

module.exports = router;
