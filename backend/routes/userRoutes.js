const express = require('express');
const { getUser, updateMe } = require('../controllers/userController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.put('/me', requireAuth, updateMe);
router.get('/:id', getUser);

module.exports = router;
