// src/routes/assignments.js
// Router for managing dispatcher-driver assignments
const express = require('express');
const assignmentsController = require('../controllers/assignmentsController');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Create a new assignment
router.post('/', requireAuth, requireRole('admin'), assignmentsController.createAssignment);
// Get all assignments
router.get('/', requireAuth, requireRole('admin'), assignmentsController.getAllAssignments);
// Get all drivers for a dispatcher
router.get('/drivers/:dispatcherId', requireAuth, requireRole('admin'), assignmentsController.getDriversForDispatcher);
// Get all dispatchers for a driver
router.get('/dispatchers/:driverId', requireAuth, requireRole('admin'), assignmentsController.getDispatchersForDriver);
// Delete an assignment
router.delete('/', requireAuth, requireRole('admin'), assignmentsController.deleteAssignment);

module.exports = router;
