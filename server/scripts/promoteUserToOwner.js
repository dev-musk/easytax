// ============================================
// FILE: server/scripts/promoteUserToOwner.js
// One-time script to promote test user to OWNER
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Organization from '../models/Organization.js'; // ✅ FIXED: Import Organization

dotenv.config();

async function promoteUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    const email = 'rohinim10032003@gmail.com';
    
    // Find user WITHOUT populate to avoid Organization schema errors
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log(`\n👤 Found user: ${user.name}`);
    console.log(`   Organization ID: ${user.organization}`);

    // Find OWNER role for this organization
    const ownerRole = await Role.findOne({
      organization: user.organization,
      name: 'OWNER'
    });

    if (!ownerRole) {
      console.log('❌ OWNER role not found');
      console.log('   Run migration first: node scripts/migrateToRoles.js');
      process.exit(1);
    }

    // Check current role
    console.log(`\n📋 Current role: ${user.role}`);
    console.log(`   Legacy role: ${user.legacyRole}`);

    // Update user
    user.role = ownerRole._id;
    user.legacyRole = 'OWNER';
    await user.save();

    console.log(`\n✅ User promoted to OWNER successfully!`);
    console.log(`   Role ID: ${ownerRole._id}`);
    console.log(`   Role Name: ${ownerRole.displayName}`);
    
    // Verify
    const updated = await User.findOne({ email }).populate('role');
    console.log(`\n🔍 Verification:`);
    console.log(`   User: ${updated.name}`);
    console.log(`   Role: ${updated.role?.name}`);
    console.log(`   Display Name: ${updated.role?.displayName}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

promoteUser();