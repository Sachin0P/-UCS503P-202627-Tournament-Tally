const express = require('express');
const {
  createRegistration, listRegistrations, myRegistrations,
  approveRegistration, rejectRegistration, cancelRegistration,
} = require('../controllers/registrationController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

// Nested under /api/competitions/:competitionId/registrations
router.get('/', requireAuth, listRegistrations);
router.post('/', requireAuth, createRegistration);

// Top-level convenience routes, mounted separately in app.js at /api/registrations
router.get('/mine', requireAuth, myRegistrations);
router.put('/:id/approve', requireAuth, approveRegistration);
router.put('/:id/reject', requireAuth, rejectRegistration);
router.delete('/:id', requireAuth, cancelRegistration);

module.exports = router;
