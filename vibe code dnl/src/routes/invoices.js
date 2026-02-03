// src/routes/invoices.js
// Express router for Invoices CRUD and Transactional Operations
const express = require('express');
const invoicesController = require('../controllers/invoicesController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

// Get all invoices
router.get('/', invoicesController.getAllInvoices);

// Create new invoice with transactional logic
router.post('/', invoicesController.createInvoice);

// Get all invoices for a specific driver
router.get('/driver/:driverId', invoicesController.getInvoicesByDriver);

// Get loads linked to an invoice
router.get('/:invoiceId/loads', invoicesController.getLoadsForInvoice);

// Get payments linked to an invoice (if schema upgrade is applied)
router.get('/:invoiceId/payments', invoicesController.getPaymentsForInvoice);

// Get audit entries linked to an invoice (if schema upgrade is applied)
router.get('/:invoiceId/audit', invoicesController.getAuditForInvoice);

// Get invoice by ID
router.get('/:invoiceId', invoicesController.getInvoiceById);

// Update invoice by ID
router.put('/:invoiceId', invoicesController.updateInvoice);

// Mark invoice as paid
router.patch('/:invoiceId/pay', invoicesController.payInvoice);

// Also support POST for pay (front-end uses POST)
router.post('/:invoiceId/pay', invoicesController.payInvoice);

// Undo invoice payment
router.post('/:invoiceId/undo-pay', invoicesController.undoPayInvoice);

// Delete invoice by ID
router.delete('/:invoiceId', invoicesController.deleteInvoice);

module.exports = router;
