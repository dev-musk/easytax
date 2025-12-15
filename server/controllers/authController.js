// ============================================
// FILE: server/controllers/authController.js
// ============================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

const generateTokens = (userId, organizationId) => {
  const accessToken = jwt.sign(
    { userId, organizationId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { userId, organizationId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const register = async (req, res) => {
  try {
    const { email, password, name, organizationName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const organization = await Organization.create({
      name: organizationName,
      email,
      planType: 'FREE',
      maxClients: 10,
      maxInvoices: 50,
    });

    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role: 'ADMIN',
      organization: organization._id,
    });

    const tokens = generateTokens(user._id, organization._id);

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: organization._id,
        name: organization.name,
        planType: organization.planType,
      },
      ...tokens,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('organization');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = generateTokens(user._id, user.organization._id);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: user.organization._id,
        name: user.organization.name,
        planType: user.organization.planType,
      },
      ...tokens,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const tokens = generateTokens(user._id, user.organization);
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const getMe = async (req, res) => {
  res.json(req.user);
};
