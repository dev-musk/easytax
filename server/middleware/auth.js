// ============================================
// FILE: server/middleware/auth.js
// ============================================

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId)
      .populate('organization', 'name planType')
      .select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organization._id,
      organization: user.organization,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};