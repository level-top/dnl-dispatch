// src/routes/settlements.js
// Weekly settlement endpoints

const express = require('express');
const settlementsController = require('../controllers/settlementsController');

const router = express.Router();

// Create a weekly invoice for a driver based on delivered loads.
router.post('/weekly', settlementsController.createWeeklyDriverInvoice);

module.exports = router;
