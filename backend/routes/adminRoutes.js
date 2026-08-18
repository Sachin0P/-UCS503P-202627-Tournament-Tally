const express = require('express');
const admin = require('../controllers/adminController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/reports', requireAuth, admin.createReport);

router.use(requireAuth, requireRole('admin'));

router.get('/stats', admin.platformStats);

router.get('/users', admin.listUsers);
router.put('/users/:id/status', admin.setUserStatus);
router.put('/users/:id/role', admin.setUserRole);

router.get('/organizations', admin.listOrganizations);
router.put('/organizations/:id/verify', admin.verifyOrganization);

router.get('/competitions', admin.listAllCompetitions);
router.put('/competitions/:id/hide', admin.hideCompetition);

router.get('/reports', admin.listReports);
router.put('/reports/:id', admin.resolveReport);

module.exports = router;
