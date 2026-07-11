const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { createReport, listReports, getReport, exportReport } = require('../controllers/reportController');

router.use(requireAuth);

router.post('/', createReport);
router.get('/', listReports);
router.get('/:id', getReport);
router.get('/:id/export', exportReport);

module.exports = router;
