// src/controllers/companyDetailsController.js
// Controller for Company Details CRUD operations
const { pool } = require('../db');

// Get all company details
exports.getAllCompanyDetails = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM CompanyDetails ORDER BY CompanyID DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get company details by ID
exports.getCompanyDetailsById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM CompanyDetails WHERE CompanyID = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Company details not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new company details
exports.createCompanyDetails = async (req, res) => {
  try {
    const { CompanyName, Address, Phone, Email, BankName, IBAN, AccountHolder, LogoURL } = req.body;

    if (!CompanyName) {
      return res.status(400).json({ error: 'CompanyName is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO CompanyDetails (CompanyName, Address, Phone, Email, BankName, IBAN, AccountHolder, LogoURL) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [CompanyName, Address, Phone, Email, BankName, IBAN, AccountHolder, LogoURL]
    );
    res.status(201).json({
      CompanyID: result.insertId,
      CompanyName,
      Address,
      Phone,
      Email,
      BankName,
      IBAN,
      AccountHolder,
      LogoURL
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update company details by ID
exports.updateCompanyDetails = async (req, res) => {
  try {
    const { CompanyName, Address, Phone, Email, BankName, IBAN, AccountHolder, LogoURL } = req.body;

    const [result] = await pool.query(
      'UPDATE CompanyDetails SET CompanyName=?, Address=?, Phone=?, Email=?, BankName=?, IBAN=?, AccountHolder=?, LogoURL=? WHERE CompanyID=?',
      [CompanyName, Address, Phone, Email, BankName, IBAN, AccountHolder, LogoURL, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Company details not found' });
    res.json({
      CompanyID: req.params.id,
      CompanyName,
      Address,
      Phone,
      Email,
      BankName,
      IBAN,
      AccountHolder,
      LogoURL
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete company details by ID
exports.deleteCompanyDetails = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM CompanyDetails WHERE CompanyID = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Company details not found' });
    res.json({ message: 'Company details deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
