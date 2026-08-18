const express = require('express');
const { getStandings, recompute, upsertAcademicScore } = require('../controllers/standingsController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router.get('/', getStandings);
router.post('/recompute', requireAuth, recompute);
router.put('/score', requireAuth, upsertAcademicScore);

module.exports = router;
