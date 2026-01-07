// src/controllers/usersController.js
// Controller for Users CRUD operations
const { pool } = require('../db');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const { name, userName, password, role, contactNumber, email } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Users (name, userName, password, role, contactNumber, email) VALUES (?, ?, ?, ?, ?, ?)',
      [name, userName, password, role, contactNumber, email]
    );
    res.status(201).json({ id: result.insertId, name, userName, role, contactNumber, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update user by ID
exports.updateUser = async (req, res) => {
  try {
    const { name, userName, password, role, contactNumber, email } = req.body;
    const [result] = await pool.query(
      'UPDATE Users SET name=?, userName=?, password=?, role=?, contactNumber=?, email=? WHERE id=?',
      [name, userName, password, role, contactNumber, email, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ id: req.params.id, name, userName, role, contactNumber, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete user by ID
exports.deleteUser = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
