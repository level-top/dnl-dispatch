// src/routes/assignments.js
// Router for managing dispatcher-driver assignments
const express = require('express');
const assignmentsController = require('../controllers/assignmentsController');
const router = express.Router();

// Create a new assignment
router.post('/', assignmentsController.createAssignment);
// Get all assignments
router.get('/', assignmentsController.getAllAssignments);
// Get all drivers for a dispatcher
router.get('/drivers/:dispatcherId', assignmentsController.getDriversForDispatcher);
// Get all dispatchers for a driver
router.get('/dispatchers/:driverId', assignmentsController.getDispatchersForDriver);
// Delete an assignment
router.delete('/', assignmentsController.deleteAssignment);

module.exports = router;
