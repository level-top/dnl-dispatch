// src/routes/agreementTemplate.js
const express = require('express');
const agreementTemplateController = require('../controllers/agreementTemplateController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), agreementTemplateController.getAgreementTemplate);
router.put('/', requireAuth, requireRole('admin'), agreementTemplateController.updateAgreementTemplate);

module.exports = router;
