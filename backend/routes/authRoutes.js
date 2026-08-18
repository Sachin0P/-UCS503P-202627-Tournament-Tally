const express = require('express');
const rateLimit = require('express-rate-limit');
const { googleLogin, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

router.post('/google', loginLimiter, googleLogin);
router.get('/me', requireAuth, me);

module.exports = router;
