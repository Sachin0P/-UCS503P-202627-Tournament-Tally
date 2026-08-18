const express = require('express');
const { listMine, markRead, markAllRead } = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, listMine);
router.put('/:id/read', requireAuth, markRead);
router.put('/read-all', requireAuth, markAllRead);

module.exports = router;
