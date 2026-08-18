const express = require('express');
const {
  listCompetitions, getCompetition, createCompetition, updateCompetition,
  updateCompetitionStatus, deleteCompetition,
} = require('../controllers/competitionController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { createRegistration } = require('../controllers/registrationController');

// Sub-resource routers mounted under /api/competitions/:competitionId/...
const teamRoutes = require('./teamRoutes');
const registrationRoutes = require('./registrationRoutes');
const matchRoutes = require('./matchRoutes');
const standingsRoutes = require('./standingsRoutes');
const announcementRoutes = require('./announcementRoutes');

const router = express.Router();

router.get('/', optionalAuth, listCompetitions);
router.get('/:id', optionalAuth, getCompetition);
router.post('/', requireAuth, requireRole('organizer', 'admin'), createCompetition);
router.put('/:id', requireAuth, requireRole('organizer', 'admin'), updateCompetition);
router.patch('/:id/status', requireAuth, requireRole('organizer', 'admin'), updateCompetitionStatus);
router.delete('/:id', requireAuth, requireRole('organizer', 'admin'), deleteCompetition);

// Alias matching the spec's literal endpoint; same handler as POST /:competitionId/registrations.
router.post('/:competitionId/register', requireAuth, createRegistration);

router.use('/:competitionId/teams', teamRoutes);
router.use('/:competitionId/registrations', registrationRoutes);
router.use('/:competitionId/matches', matchRoutes);
router.use('/:competitionId/standings', standingsRoutes);
router.use('/:competitionId/announcements', announcementRoutes);

module.exports = router;
