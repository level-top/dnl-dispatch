// src/controllers/driversController.js
// Controller for Drivers CRUD operations
const { pool } = require('../db');
const { normalizeRole } = require('../middleware/auth');
const { canAccessDriver } = require('../utils/access');

// Get all drivers
exports.getAllDrivers = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    const uid = Number(req.user?.id);

    let rows;
    if (role === 'admin') {
      [rows] = await pool.query('SELECT * FROM Drivers');
    } else if (role === 'sales') {
      [rows] = await pool.query('SELECT * FROM Drivers WHERE sales_agent_id = ?', [uid]);
    } else if (role === 'dispatcher') {
      [rows] = await pool.query(
        `SELECT d.*
         FROM DispatcherDriverAssignments dda
         JOIN Drivers d ON d.id = dda.driverId
         WHERE dda.dispatcherId = ?`,
        [uid]
      );
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get driver by ID
exports.getDriverById = async (req, res) => {
  try {
    const allowed = await canAccessDriver(pool, req.user, req.params.id);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

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
    const role = normalizeRole(req.user?.role);
    const uid = Number(req.user?.id);

    const { name, MC_number, truckType, contactNumber, email, joinDate, sales_agent_id, percentage } = req.body;

    if (role === 'dispatcher') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const effectiveSalesAgentId = role === 'sales' ? uid : sales_agent_id;

    const [result] = await pool.query(
      'INSERT INTO Drivers (name, MC_number, truckType, contactNumber, email, joinDate, sales_agent_id, percentage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, MC_number, truckType, contactNumber, email, joinDate, effectiveSalesAgentId, percentage]
    );
    res.status(201).json({
      id: result.insertId,
      name,
      MC_number,
      truckType,
      contactNumber,
      email,
      joinDate,
      sales_agent_id: effectiveSalesAgentId,
      percentage,
      status: 'inactive',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update driver by ID
exports.updateDriver = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    const uid = Number(req.user?.id);
    const driverId = req.params.id;

    const allowed = await canAccessDriver(pool, req.user, driverId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const { name, MC_number, truckType, contactNumber, email, joinDate, sales_agent_id, percentage } = req.body;

    const effectiveSalesAgentId = role === 'admin' ? sales_agent_id : role === 'sales' ? uid : null;

    const [result] = await pool.query(
      'UPDATE Drivers SET name=?, MC_number=?, truckType=?, contactNumber=?, email=?, joinDate=?, sales_agent_id=COALESCE(?, sales_agent_id), percentage=? WHERE id=?',
      [name, MC_number, truckType, contactNumber, email, joinDate, effectiveSalesAgentId, percentage, driverId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json({ id: driverId, name, MC_number, truckType, contactNumber, email, joinDate, sales_agent_id: effectiveSalesAgentId ?? sales_agent_id, percentage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete driver by ID
exports.deleteDriver = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const [result] = await pool.query('DELETE FROM Drivers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json({ message: 'Driver deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
