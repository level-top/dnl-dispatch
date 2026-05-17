const express = require('express');
const backupsController = require('../controllers/backupsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/', backupsController.listBackups);
router.post('/', backupsController.createBackup);
router.get('/:fileName/download', backupsController.downloadBackup);
router.delete('/:fileName', backupsController.deleteBackup);

module.exports = router;