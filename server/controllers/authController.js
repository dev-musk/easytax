// ============================================
// FILE: server/controllers/authController.js
// ✅ CORRECTED: Integrated with Role system
// ============================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Role from '../models/Role.js';
import { initializeDefaultRoles } from './roleController.js';

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '30d',
  });

  return { accessToken, refreshToken };
};

// ✅ Register - WITH ROLE INITIALIZATION
export const register = async (req, res) => {
  try {
    const { name, email, password, organizationName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create organization
    const organization = await Organization.create({
      name: organizationName || name,
      email,
    });

    // ✅ Initialize default roles for the organization
    await initializeDefaultRoles(organization._id);

    // ✅ Get the OWNER role
    const ownerRole = await Role.findOne({
      organization: organization._id,
      name: 'OWNER',
    });

    // Hash password (User model will also hash, but we need to prevent double hashing)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with role reference
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      organization: organization._id,
      role: ownerRole._id,
      legacyRole: 'OWNER', // For backward compatibility
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: 'OWNER',
        roleId: ownerRole._id,
      },
      organization: {
        id: organization._id,
        name: organization.name,
        email: organization.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// ✅ Login - WITH ORGANIZATION AND ROLE DATA
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and populate organization and role
    const user = await User.findOne({ email })
      .populate('organization', 'name email gstin pan phone city state planType')
      .populate('role', 'name displayName permissions features');

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password (using the method from User model)
    const isValidPassword = await user.matchPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // ✅ Return complete user, organization, and role data
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role?.name || user.legacyRole || 'USER',
        roleId: user.role?._id,
        roleName: user.role?.displayName,
        phone: user.phone,
        isActive: user.isActive,
      },
      organization: {
        id: user.organization._id,
        name: user.organization.name,
        email: user.organization.email,
        gstin: user.organization.gstin,
        pan: user.organization.pan,
        phone: user.organization.phone,
        city: user.organization.city,
        state: user.organization.state,
        planType: user.organization.planType,
      },
    });

    console.log('✅ Login successful:', email);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// ✅ Refresh Token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId)
      .populate('organization', 'name email')
      .populate('role', 'name displayName');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// ✅ Get Me - WITH ORGANIZATION AND ROLE DATA
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('organization', 'name email gstin pan phone city state planType')
      .populate('role', 'name displayName permissions features');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role?.name || user.legacyRole || 'USER',
        roleId: user.role?._id,
        roleName: user.role?.displayName,
        phone: user.phone,
        isActive: user.isActive,
      },
      organization: {
        id: user.organization._id,
        name: user.organization.name,
        email: user.organization.email,
        gstin: user.organization.gstin,
        pan: user.organization.pan,
        phone: user.organization.phone,
        city: user.organization.city,
        state: user.organization.state,
        planType: user.organization.planType,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ Update Profile
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, organizationName } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        name, 
        phone,
        ...(organizationName && { organizationName })
      },
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('role', 'name displayName');

    res.json({ 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        organizationName: user.organizationName,
        role: user.role?.name || user.legacyRole,
        roleName: user.role?.displayName,
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ Change Password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    // Use the matchPassword method from User model
    const isValidPassword = await user.matchPassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};