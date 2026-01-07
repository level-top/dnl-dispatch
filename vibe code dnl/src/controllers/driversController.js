// src/controllers/driversController.js
// Controller for Drivers CRUD operations
const { pool } = require('../db');

// Get all drivers
exports.getAllDrivers = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Drivers');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get driver by ID
exports.getDriverById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Drivers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new driver
exports.createDriver = async (req, res) => {
  try {
    const { name, MC_number, truckType, contactNumber, email, joinDate, sales_agent_id, percentage } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Drivers (name, MC_number, truckType, contactNumber, email, joinDate, sales_agent_id, percentage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, MC_number, truckType, contactNumber, email, joinDate, sales_agent_id, percentage]
    );
    res.status(201).json({ id: result.insertId, name, MC_number, truckType, contactNumber, email, joinDate, sales_agent_id, percentage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update driver by ID
exports.updateDriver = async (req, res) => {
  try {
    const { name, MC_number, truckType, contactNumber, email, joinDate, sales_agent_id, percentage } = req.body;
    const [result] = await pool.query(
      'UPDATE Drivers SET name=?, MC_number=?, truckType=?, contactNumber=?, email=?, joinDate=?, sales_agent_id=?, percentage=? WHERE id=?',
      [name, MC_number, truckType, contactNumber, email, joinDate, sales_agent_id, percentage, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json({ id: req.params.id, name, MC_number, truckType, contactNumber, email, joinDate, sales_agent_id, percentage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete driver by ID
exports.deleteDriver = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Drivers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json({ message: 'Driver deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
