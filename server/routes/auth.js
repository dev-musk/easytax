
// ============================================
// FILE: server/routes/auth.js
// ============================================

import express from 'express';
import { register, login, refreshToken, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);

export default router;