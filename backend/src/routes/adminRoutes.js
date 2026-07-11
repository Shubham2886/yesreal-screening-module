const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { usageSummary, triggerReprocess } = require('../controllers/adminController');


router.use(requireAuth, requireRole('admin'));

router.get('/usage-summary', usageSummary);
router.post('/reprocess-now', triggerReprocess);

module.exports = router;
