const express = require('express');
const {
  listOrganizations, getOrganization, createOrganization, updateOrganization,
} = require('../controllers/organizationController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', listOrganizations);
router.get('/:id', getOrganization);
router.post('/', requireAuth, createOrganization);
router.put('/:id', requireAuth, updateOrganization);

module.exports = router;
