// ============================================
// FILE: server/routes/auth.js
// ✅ COMPLETE WITH PROFILE ROUTES
// ============================================

import express from 'express';
import { 
  register, 
  login, 
  refreshToken, 
  getMe,
  updateProfile,
  changePassword
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Existing routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);

// ✅ NEW: Profile management routes
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

export default router;