// ============================================
// FILE: server/scripts/migrateToRoles.js
// Migration script to add roles to existing users
// Run this ONCE after deploying role system
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Role from '../models/Role.js';
import { initializeDefaultRoles } from '../controllers/roleController.js';

dotenv.config();

async function migrateToRoles() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // Get all organizations
    const organizations = await Organization.find();
    console.log(`\n🏢 Found ${organizations.length} organizations`);

    for (const org of organizations) {
      console.log(`\n📋 Processing organization: ${org.name}`);

      // Check if roles exist for this organization
      const existingRoles = await Role.countDocuments({ organization: org._id });

      if (existingRoles === 0) {
        console.log('  ➕ Creating default roles...');
        await initializeDefaultRoles(org._id);
        console.log('  ✅ Default roles created');
      } else {
        console.log(`  ℹ️  Roles already exist (${existingRoles} roles)`);
      }

      // Get users for this organization
      const users = await User.find({ organization: org._id });
      console.log(`  👥 Found ${users.length} users`);

      let migratedCount = 0;
      let skippedCount = 0;

      for (const user of users) {
        // Skip if user already has a role assigned
        if (user.role) {
          console.log(`    ⏭️  Skipping ${user.email} (already has role)`);
          skippedCount++;
          continue;
        }

        // Find matching role based on legacyRole
        const roleName = user.legacyRole || 'USER';
        const role = await Role.findOne({
          organization: org._id,
          name: roleName,
        });

        if (!role) {
          console.log(`    ⚠️  Warning: Role ${roleName} not found for ${user.email}`);
          continue;
        }

        // Update user with role
        user.role = role._id;
        await user.save();

        console.log(`    ✅ Migrated ${user.email} → ${roleName}`);
        migratedCount++;
      }

      console.log(`  📊 Summary: ${migratedCount} migrated, ${skippedCount} skipped`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📈 Final Statistics:');

    const totalUsers = await User.countDocuments();
    const usersWithRoles = await User.countDocuments({ role: { $exists: true } });
    const totalRoles = await Role.countDocuments();

    console.log(`  Total Users: ${totalUsers}`);
    console.log(`  Users with Roles: ${usersWithRoles}`);
    console.log(`  Total Roles: ${totalRoles}`);

    if (usersWithRoles < totalUsers) {
      console.log(`\n⚠️  Warning: ${totalUsers - usersWithRoles} users still without roles!`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
console.log('🚀 Starting Role Migration...');
console.log('================================\n');
migrateToRoles();