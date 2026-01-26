// ============================================
// FILE: server/middleware/auth.js
// ✅ ENHANCED: Added role-based authorization
// ============================================

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Role from '../models/Role.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId)
      .populate('organization', 'name planType')
      .populate('role')
      .select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role?.name || 'USER',
      roleObject: user.role,
      organizationId: user.organization._id,
      organization: user.organization,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based authorization middleware
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

// Permission-based authorization
export const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user?.roleObject) {
        return res.status(403).json({ error: 'No role assigned' });
      }

      const hasPermission = req.user.roleObject.hasPermission(module, action);

      if (!hasPermission) {
        return res.status(403).json({
          error: `Permission denied: ${action} on ${module}`,
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Feature-based authorization
export const checkFeature = (feature) => {
  return (req, res, next) => {
    if (!req.user?.roleObject?.features?.[feature]) {
      return res.status(403).json({
        error: `Feature access denied: ${feature}`,
      });
    }
    next();
  };
};