// src/controllers/assignmentsController.js
// Controller for dispatcher-driver assignments
const { pool } = require('../db');
const { tableExists } = require('../utils/schema');
const { getActorUserId, tryInsertAudit } = require('../utils/audit');

// Create a new assignment
exports.createAssignment = async (req, res) => {
  const { dispatcherId, driverId } = req.body;
  const performedByUserId = getActorUserId(req);
  if (!dispatcherId || !driverId) {
    return res.status(400).json({ error: 'dispatcherId and driverId are required' });
  }
  try {
    await pool.query(
      'INSERT INTO DispatcherDriverAssignments (dispatcherId, driverId) VALUES (?, ?)',
      [dispatcherId, driverId]
    );

    // Best-effort assignment history (requires schema upgrade)
    if (await tableExists(pool, 'DriverAssignmentsHistory')) {
      await pool.query(
        'INSERT INTO DriverAssignmentsHistory (DriverID, DispatcherID, AssignedByUserID) VALUES (?, ?, ?)',
        [driverId, dispatcherId, performedByUserId]
      );
    }

    await tryInsertAudit(pool, {
      entityType: 'Assignment',
      entityId: `${dispatcherId}:${driverId}`,
      action: 'CREATE',
      performedByUserId,
      beforeJson: null,
      afterJson: JSON.stringify({ dispatcherId, driverId }),
    });

    res.status(201).json({ dispatcherId, driverId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Assignment already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};

// Get all assignments
exports.getAllAssignments = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT dda.dispatcherId, u.name AS dispatcherName, dda.driverId, d.name AS driverName
       FROM DispatcherDriverAssignments dda
       JOIN Users u ON dda.dispatcherId = u.id
       JOIN Drivers d ON dda.driverId = d.id`
    );
    console.log(rows);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all drivers for a dispatcher
exports.getDriversForDispatcher = async (req, res) => {
  try {
    const dispatcherId = req.params.dispatcherId;
    const [rows] = await pool.query(
      `SELECT d.* FROM DispatcherDriverAssignments dda
       JOIN Drivers d ON dda.driverId = d.id
       WHERE dda.dispatcherId = ?`,
      [dispatcherId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all dispatchers for a driver
exports.getDispatchersForDriver = async (req, res) => {
  try {
    const driverId = req.params.driverId;
    const [rows] = await pool.query(
      `SELECT u.* FROM DispatcherDriverAssignments dda
       JOIN Users u ON dda.dispatcherId = u.id
       WHERE dda.driverId = ?`,
      [driverId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete an assignment
exports.deleteAssignment = async (req, res) => {
  const { dispatcherId, driverId } = req.body;
  const performedByUserId = getActorUserId(req);
  if (!dispatcherId || !driverId) {
    return res.status(400).json({ error: 'dispatcherId and driverId are required' });
  }
  try {
    const [result] = await pool.query(
      'DELETE FROM DispatcherDriverAssignments WHERE dispatcherId = ? AND driverId = ?',
      [dispatcherId, driverId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Best-effort assignment history close-out (requires schema upgrade)
    if (await tableExists(pool, 'DriverAssignmentsHistory')) {
      await pool.query(
        `UPDATE DriverAssignmentsHistory
         SET UnassignedAt = current_timestamp()
         WHERE DriverID = ? AND DispatcherID = ? AND UnassignedAt IS NULL`,
        [driverId, dispatcherId]
      );
    }

    await tryInsertAudit(pool, {
      entityType: 'Assignment',
      entityId: `${dispatcherId}:${driverId}`,
      action: 'DELETE',
      performedByUserId,
      beforeJson: null,
      afterJson: JSON.stringify({ dispatcherId, driverId }),
    });

    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
