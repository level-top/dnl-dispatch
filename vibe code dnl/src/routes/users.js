// src/routes/users.js
// Express router for Users entity
const express = require('express');
const usersController = require('../controllers/usersController');
const router = express.Router();

// Get all users
router.get('/', usersController.getAllUsers);
// Get user by ID
router.get('/:id', usersController.getUserById);
// Create new user
router.post('/', usersController.createUser);
// Update user by ID
router.put('/:id', usersController.updateUser);
// Delete user by ID
router.delete('/:id', usersController.deleteUser);

module.exports = router;
