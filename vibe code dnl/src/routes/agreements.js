// src/routes/agreements.js
// Public agreement token endpoints
const express = require('express');
const agreementsController = require('../controllers/agreementsController');

const router = express.Router();

router.get('/:token', agreementsController.getAgreementByToken);
router.post('/:token/sign', agreementsController.signAgreementByToken);

module.exports = router;
