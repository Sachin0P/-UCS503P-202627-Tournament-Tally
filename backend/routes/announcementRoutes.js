const express = require('express');
const { listAnnouncements, createAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router.get('/', listAnnouncements);
router.post('/', requireAuth, createAnnouncement);
router.delete('/:id', requireAuth, deleteAnnouncement);

module.exports = router;
