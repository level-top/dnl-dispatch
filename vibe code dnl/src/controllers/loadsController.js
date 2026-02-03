// src/controllers/loadsController.js
// Controller for Loads CRUD operations
const { pool } = require('../db');
const { normalizeRole } = require('../middleware/auth');
const { canAccessLoad } = require('../utils/access');

async function maybeActivateDriver(driverId, loadStatus) {
  const normalizedStatus = String(loadStatus ?? '').trim().toLowerCase();
  if (normalizedStatus !== 'booked') return;

  const id = Number(driverId);
  if (!Number.isFinite(id) || id <= 0) return;

  // If the Drivers.status column doesn't exist yet, this will error; we intentionally
  // swallow it so loads can still be created while migrations are being applied.
  try {
    await pool.query("UPDATE Drivers SET status = 'active' WHERE id = ?", [id]);
  } catch {
    // ignore
  }
}

// Get all loads
exports.getAllLoads = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    const uid = Number(req.user?.id);

    let rows;
    if (role === 'admin') {
      [rows] = await pool.query('SELECT Loads.*, Loads.driverName AS driverId FROM Loads');
    } else if (role === 'dispatcher') {
      [rows] = await pool.query(
        `SELECT l.*, l.driverName AS driverId
         FROM Loads l
         WHERE l.dispatcherId = ?
            OR l.driverName IN (SELECT driverId FROM DispatcherDriverAssignments WHERE dispatcherId = ?)`,
        [uid, uid]
      );
    } else if (role === 'sales') {
      [rows] = await pool.query(
        `SELECT l.*, l.driverName AS driverId
         FROM Loads l
         JOIN Drivers d ON d.id = l.driverName
         WHERE d.sales_agent_id = ?`,
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

// Get load by ID
exports.getLoadById = async (req, res) => {
  try {
    const allowed = await canAccessLoad(pool, req.user, req.params.id);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const [rows] = await pool.query(
      'SELECT Loads.*, Loads.driverName AS driverId FROM Loads WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Load not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new load
exports.createLoad = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    const uid = Number(req.user?.id);
    if (role === 'sales') return res.status(403).json({ error: 'Forbidden' });

    const {
      pickedUp_dateTime,
      dropOff_dateTime,
      driverId,
      driverName,
      dispatcherId,
      loadFrom,
      loadTo,
      brokerCompany,
      brokerMC,
      brokerName,
      loadNumber,
      loadAmount,
      miles,
      loadStatus,
      dateTime,
      equipmentType,
      loadCategory,
      paymentTerms,
      quickPayFee,
      bolStatus,
      podStatus,
      rateConfStatus,
      expectedPaymentDate
    } = req.body;

    const resolvedDriverId = driverId ?? driverName;
    // console.log('Creating new load:', req.body);
    // console.log(pickedUp_dateTime, dropOff_dateTime, driverName, dispatcherId, loadFrom, loadTo, brokerCompany, brokerMC, brokerName, loadNumber, loadAmount, loadPercentage, netAmount, loadStatus, dateTime);
    const effectiveDispatcherId = role === 'dispatcher' ? uid : dispatcherId;

    const [result] = await pool.query(
      `INSERT INTO Loads (
        pickedUp_dateTime, dropOff_dateTime, driverName, dispatcherId, loadFrom, loadTo, brokerCompany, brokerMC, brokerName, loadNumber, loadAmount, miles, loadStatus, equipmentType, loadCategory, paymentTerms, quickPayFee, bolStatus, podStatus, rateConfStatus, expectedPaymentDate
      ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pickedUp_dateTime,
        dropOff_dateTime,
        resolvedDriverId,
        effectiveDispatcherId,
        loadFrom,
        loadTo,
        brokerCompany,
        brokerMC,
        brokerName,
        loadNumber,
        loadAmount,
        miles,
        loadStatus,
        equipmentType || null,
        loadCategory || null,
        paymentTerms || null,
        quickPayFee || null,
        bolStatus || 'pending',
        podStatus || 'pending',
        rateConfStatus || 'pending',
        expectedPaymentDate || null
        // dateTime
      ]
    );

    await maybeActivateDriver(resolvedDriverId, loadStatus);

    res.status(201).json({
      id: result.insertId,
      pickedUp_dateTime,
      dropOff_dateTime,
      driverId: resolvedDriverId,
      driverName: resolvedDriverId,
      dispatcherId: effectiveDispatcherId,
      loadFrom,
      loadTo,
      brokerCompany,
      brokerMC,
      brokerName,
      loadNumber,
      loadAmount,
      miles,
      loadStatus,
      dateTime,
      equipmentType,
      loadCategory,
      paymentTerms,
      quickPayFee,
      bolStatus,
      podStatus,
      rateConfStatus,
      expectedPaymentDate
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update load by ID
exports.updateLoad = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    const uid = Number(req.user?.id);
    if (role === 'sales') return res.status(403).json({ error: 'Forbidden' });

    const allowed = await canAccessLoad(pool, req.user, req.params.id);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const {
      pickedUp_dateTime,
      dropOff_dateTime,
      driverId,
      driverName,
      dispatcherId,
      loadFrom,
      loadTo,
      brokerCompany,
      brokerMC,
      brokerName,
      loadNumber,
      loadAmount,
      miles,
      loadStatus,
      dateTime,
      equipmentType,
      loadCategory,
      paymentTerms,
      quickPayFee,
      bolStatus,
      podStatus,
      rateConfStatus,
      expectedPaymentDate
    } = req.body;

    const resolvedDriverId = driverId ?? driverName;
    const effectiveDispatcherId = role === 'dispatcher' ? uid : dispatcherId;

    const [result] = await pool.query(
      `UPDATE Loads SET
        pickedUp_dateTime=?,
        dropOff_dateTime=?,
        driverName=?,
        dispatcherId=?,
        loadFrom=?,
        loadTo=?,
        brokerCompany=?,
        brokerMC=?,
        brokerName=?,
        loadNumber=?,
        loadAmount=?,
        miles=?,
        loadStatus=?,
        equipmentType=?,
        loadCategory=?,
        paymentTerms=?,
        quickPayFee=?,
        bolStatus=?,
        podStatus=?,
        rateConfStatus=?,
        expectedPaymentDate=?
      WHERE id=?`,
      [
        pickedUp_dateTime,
        dropOff_dateTime,
        resolvedDriverId,
        effectiveDispatcherId,
        loadFrom,
        loadTo,
        brokerCompany,
        brokerMC,
        brokerName,
        loadNumber,
        loadAmount,
        miles,
        loadStatus,
        equipmentType || null,
        loadCategory || null,
        paymentTerms || null,
        quickPayFee || null,
        bolStatus || 'pending',
        podStatus || 'pending',
        rateConfStatus || 'pending',
        expectedPaymentDate || null,
        // dateTime,
        req.params.id
      ]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Load not found' });

    await maybeActivateDriver(resolvedDriverId, loadStatus);

    res.json({
      id: req.params.id,
      pickedUp_dateTime,
      dropOff_dateTime,
      driverId: resolvedDriverId,
      driverName: resolvedDriverId,
      dispatcherId: effectiveDispatcherId,
      loadFrom,
      loadTo,
      brokerCompany,
      brokerMC,
      brokerName,
      loadNumber,
      loadAmount,
      miles,
      loadStatus,
      equipmentType,
      loadCategory,
      paymentTerms,
      quickPayFee,
      bolStatus,
      podStatus,
      rateConfStatus,
      expectedPaymentDate
      // dateTime
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete load by ID
exports.deleteLoad = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const [result] = await pool.query('DELETE FROM Loads WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Load not found' });
    res.json({ message: 'Load deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
