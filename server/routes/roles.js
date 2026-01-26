// ============================================
// FILE: server/routes/roles.js
// Role Management API Routes
// ============================================

import express from 'express';
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  cloneRole,
  getRoleStats,
} from '../controllers/roleController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/roles - Get all roles
router.get('/', getRoles);

// GET /api/roles/stats - Get role statistics
router.get('/stats', getRoleStats);

// GET /api/roles/:id - Get single role
router.get('/:id', getRole);

// POST /api/roles - Create new role (requires admin)
router.post('/', authorize(['OWNER', 'ADMIN']), createRole);

// POST /api/roles/:id/clone - Clone role (requires admin)
router.post('/:id/clone', authorize(['OWNER', 'ADMIN']), cloneRole);

// PUT /api/roles/:id - Update role (requires admin)
router.put('/:id', authorize(['OWNER', 'ADMIN']), updateRole);

// DELETE /api/roles/:id - Delete role (requires owner)
router.delete('/:id', authorize(['OWNER']), deleteRole);

export default router;