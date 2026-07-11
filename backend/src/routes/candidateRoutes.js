const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { createCandidate, listCandidates, createJob, listJobs } = require('../controllers/candidateController');

router.use(requireAuth);


router.post('/candidates', upload.single('resume'), createCandidate);// text or file both we take
router.get('/candidates', listCandidates);

router.post('/jobs', createJob);
router.get('/jobs', listJobs);

module.exports = router;
