// src/routes/users.js
// Express router for Users entity
const express = require('express');
const usersController = require('../controllers/usersController');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Get all users
router.get('/', requireAuth, requireRole('admin'), usersController.getAllUsers);
// Get user by ID
router.get('/:id', requireAuth, requireRole('admin'), usersController.getUserById);
// Create new user
router.post('/', requireAuth, requireRole('admin'), usersController.createUser);
// Update user by ID
router.put('/:id', requireAuth, requireRole('admin'), usersController.updateUser);
// Delete user by ID
router.delete('/:id', requireAuth, requireRole('admin'), usersController.deleteUser);

module.exports = router;
