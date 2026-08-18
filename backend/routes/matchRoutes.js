const express = require('express');
const {
  myMatches, listMatches, getMatch, createMatch, generateFixtures, updateMatch, deleteMatch,
} = require('../controllers/matchController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

// Top-level, literal path registered before `/:id` so it isn't swallowed by it.
router.get('/mine', requireAuth, myMatches);

// Nested under /api/competitions/:competitionId/matches
router.get('/', listMatches);
router.post('/', requireAuth, createMatch);
router.post('/generate', requireAuth, generateFixtures);

// Top-level, mounted at /api/matches
router.get('/:id', getMatch);
router.put('/:id', requireAuth, updateMatch);
router.delete('/:id', requireAuth, deleteMatch);

module.exports = router;
