// ============================================
// FILE: server/scripts/migratePurchaseInvoiceBranches.js
// ✅ FEATURE #36: Add branch fields to existing purchase invoices
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PurchaseInvoice from '../models/PurchaseInvoice.js';
import Organization from '../models/Organization.js';

dotenv.config();

const migratePurchaseInvoiceBranches = async () => {
  try {
    console.log('🚀 Starting Purchase Invoice Branch Migration...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all purchase invoices without branch info
    const invoices = await PurchaseInvoice.find({
      $or: [
        { ourBranchGSTIN: { $exists: false } },
        { ourBranchGSTIN: null },
        { ourBranchGSTIN: '' },
      ],
    }).populate('organization');

    console.log(`📊 Found ${invoices.length} purchase invoices to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const invoice of invoices) {
      try {
        // Get the organization's default GSTIN
        const org = invoice.organization;
        
        if (!org) {
          console.log(`⚠️  Skipping invoice ${invoice.piNumber} - No organization found`);
          skipped++;
          continue;
        }

        // Use organization's primary GSTIN
        const defaultGSTIN = org.gstin || org.gstinNumber;
        const defaultBranchName = org.companyName ? `${org.companyName} - Main Branch` : 'Main Branch';

        // Update the invoice
        invoice.ourBranchGSTIN = defaultGSTIN;
        invoice.ourBranchName = defaultBranchName;
        
        // Note: vendorBranchGSTIN and vendorBranchName will remain null
        // These should be filled when users edit the invoices
        
        await invoice.save();
        
        migrated++;
        if (migrated % 10 === 0) {
          console.log(`   Migrated ${migrated} invoices...`);
        }
      } catch (error) {
        console.error(`❌ Error migrating invoice ${invoice.piNumber}:`, error.message);
        skipped++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migrated}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   📝 Total processed: ${invoices.length}`);
    
    console.log('\n✨ Migration completed!');
    console.log('\n📌 Next Steps:');
    console.log('   1. Update purchase invoice form to capture branch details');
    console.log('   2. Users can now edit invoices to set correct vendor branches');
    console.log('   3. New invoices will automatically use branch selection');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
};

// Run migration
migratePurchaseInvoiceBranches();

// ============================================
// HOW TO RUN THIS MIGRATION:
// ============================================
// 
// 1. Save this file to: server/scripts/migratePurchaseInvoiceBranches.js
// 
// 2. Run from server directory:
//    node scripts/migratePurchaseInvoiceBranches.js
// 
// 3. The script will:
//    - Find all purchase invoices without branch info
//    - Set ourBranchGSTIN to the organization's default GSTIN
//    - Set ourBranchName to "Company Name - Main Branch"
//    - Leave vendor branch fields empty (to be filled by users)
// 
// ============================================