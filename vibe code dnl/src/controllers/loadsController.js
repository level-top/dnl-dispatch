// src/controllers/loadsController.js
// Controller for Loads CRUD operations
const { pool } = require('../db');

// Get all loads
exports.getAllLoads = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Loads');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get load by ID
exports.getLoadById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Loads WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Load not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new load
exports.createLoad = async (req, res) => {
  try {
    const {
      pickedUp_dateTime,
      dropOff_dateTime,
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
    // console.log('Creating new load:', req.body);
    // console.log(pickedUp_dateTime, dropOff_dateTime, driverName, dispatcherId, loadFrom, loadTo, brokerCompany, brokerMC, brokerName, loadNumber, loadAmount, loadPercentage, netAmount, loadStatus, dateTime);
    const [result] = await pool.query(
      `INSERT INTO Loads (
        pickedUp_dateTime, dropOff_dateTime, driverName, dispatcherId, loadFrom, loadTo, brokerCompany, brokerMC, brokerName, loadNumber, loadAmount, miles, loadStatus, equipmentType, loadCategory, paymentTerms, quickPayFee, bolStatus, podStatus, rateConfStatus, expectedPaymentDate
      ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pickedUp_dateTime,
        dropOff_dateTime,
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
    res.status(201).json({
      id: result.insertId,
      pickedUp_dateTime,
      dropOff_dateTime,
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
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update load by ID
exports.updateLoad = async (req, res) => {
  try {
    const {
      pickedUp_dateTime,
      dropOff_dateTime,
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
    res.json({
      id: req.params.id,
      pickedUp_dateTime,
      dropOff_dateTime,
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
    const [result] = await pool.query('DELETE FROM Loads WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Load not found' });
    res.json({ message: 'Load deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
