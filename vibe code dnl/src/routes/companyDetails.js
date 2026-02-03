// src/routes/companyDetails.js
// Express router for Company Details entity
const express = require('express');
const companyDetailsController = require('../controllers/companyDetailsController');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Get all company details
router.get('/', companyDetailsController.getAllCompanyDetails);
// Get company details by ID
router.get('/:id', companyDetailsController.getCompanyDetailsById);

// Mutations are admin-only
router.use(requireAuth);
router.use(requireRole('admin'));
// Create new company details
router.post('/', companyDetailsController.createCompanyDetails);
// Update company details by ID
router.put('/:id', companyDetailsController.updateCompanyDetails);
// Delete company details by ID
router.delete('/:id', companyDetailsController.deleteCompanyDetails);

module.exports = router;
