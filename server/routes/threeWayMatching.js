// ============================================
// FILE: server/routes/threeWayMatching.js
// ✅ FEATURE #46: THREE-WAY MATCHING - FIXED VERSION
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import GRN from '../models/GRN.js';
import Invoice from '../models/Invoice.js';
import mongoose from 'mongoose';

const router = express.Router();
router.use(protect);

// ============================================
// ✅ THREE-WAY MATCHING: PO → GRN → INVOICE
// ============================================

// Perform automatic matching
router.post('/match', async (req, res) => {
  try {
    const { poId, grnId, invoiceId } = req.body;
    const organizationId = req.user.organizationId;

    console.log('\n🔍 THREE-WAY MATCHING: Starting...');
    console.log(`   PO: ${poId}`);
    console.log(`   GRN: ${grnId}`);
    console.log(`   Invoice: ${invoiceId}`);

    // Fetch all three documents
    const [po, grn, invoice] = await Promise.all([
      PurchaseOrder.findOne({ _id: poId, organization: organizationId }),
      GRN.findOne({ _id: grnId, organization: organizationId }),
      Invoice.findOne({ _id: invoiceId, organization: organizationId }),
    ]);

    if (!po || !grn || !invoice) {
      console.log('   ❌ One or more documents not found');
      return res.status(404).json({ error: 'One or more documents not found' });
    }

    console.log('   ✅ All documents found');

    // ✅ PERFORM THREE-WAY MATCHING
    const matchingResult = await performThreeWayMatch(po, grn, invoice);

    console.log(`   📊 Matching Result: ${matchingResult.overallStatus}`);
    console.log(`   📊 Discrepancies: ${matchingResult.discrepancies.length}`);

    // Update GRN with matching status
    grn.matchingStatus = matchingResult.overallStatus;
    grn.hasDiscrepancies = matchingResult.discrepancies.length > 0;
    grn.discrepancies = matchingResult.discrepancies;
    grn.linkedInvoice = invoice._id;
    grn.invoiceNumber = invoice.invoiceNumber;
    grn.invoiceMatchDate = new Date();
    await grn.save();

    console.log('   ✅ GRN updated with status:', matchingResult.overallStatus);

    // Update PO - add invoice to linked invoices if not already there
    const existingLink = po.linkedInvoices?.find(
      li => li.invoice?.toString() === invoice._id.toString()
    );
    
    if (!existingLink) {
      if (!po.linkedInvoices) po.linkedInvoices = [];
      po.linkedInvoices.push({
        invoice: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
      });
      await po.save();
      console.log('   ✅ Invoice linked to PO');
    }

    console.log('✅ THREE-WAY MATCHING COMPLETE!\n');

    res.json({
      success: true,
      matchingResult,
      message: `Matching complete: ${matchingResult.overallStatus}`,
    });
  } catch (error) {
    console.error('❌ Three-way matching error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get matching suggestions
router.get('/suggestions/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const organizationId = req.user.organizationId;

    if (type === 'po') {
      const po = await PurchaseOrder.findOne({
        _id: id,
        organization: organizationId,
      });

      if (!po) {
        return res.status(404).json({ error: 'PO not found' });
      }

      const [grns, invoices] = await Promise.all([
        GRN.find({ purchaseOrder: id, organization: organizationId }),
        Invoice.find({
          organization: organizationId,
          poNumber: po.poNumber,
        }),
      ]);

      res.json({ po, grns, invoices });
    } else if (type === 'grn') {
      const grn = await GRN.findOne({
        _id: id,
        organization: organizationId,
      }).populate('purchaseOrder');

      if (!grn) {
        return res.status(404).json({ error: 'GRN not found' });
      }

      const invoices = await Invoice.find({
        organization: organizationId,
        poNumber: grn.poNumber,
      });

      res.json({ grn, po: grn.purchaseOrder, invoices });
    } else if (type === 'invoice') {
      const invoice = await Invoice.findOne({
        _id: id,
        organization: organizationId,
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (!invoice.poNumber) {
        return res.json({
          invoice,
          message: 'No PO number on invoice',
          suggestions: [],
        });
      }

      const [pos, grns] = await Promise.all([
        PurchaseOrder.find({
          organization: organizationId,
          poNumber: invoice.poNumber,
        }),
        GRN.find({
          organization: organizationId,
          poNumber: invoice.poNumber,
        }),
      ]);

      res.json({ invoice, pos, grns });
    }
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get matching dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const [
      totalPOs,
      totalGRNs,
      matchedGRNs,
      mismatchedGRNs,
      pendingMatches,
    ] = await Promise.all([
      PurchaseOrder.countDocuments({ organization: organizationId }),
      GRN.countDocuments({ organization: organizationId }),
      GRN.countDocuments({
        organization: organizationId,
        matchingStatus: 'MATCHED',
      }),
      GRN.countDocuments({
        organization: organizationId,
        matchingStatus: 'MISMATCHED',
      }),
      GRN.countDocuments({
        organization: organizationId,
        matchingStatus: 'PENDING',
      }),
    ]);

    const recentMismatches = await GRN.find({
      organization: organizationId,
      matchingStatus: { $in: ['MISMATCHED', 'PARTIALLY_MATCHED'] },
      hasDiscrepancies: true,
    })
      .populate('vendor', 'companyName')
      .populate('purchaseOrder', 'poNumber')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      totalPOs,
      totalGRNs,
      matchedGRNs,
      mismatchedGRNs,
      pendingMatches,
      matchRate:
        totalGRNs > 0 ? ((matchedGRNs / totalGRNs) * 100).toFixed(2) : 0,
      recentMismatches: recentMismatches.map((grn) => ({
        _id: grn._id,
        grnNumber: grn.grnNumber,
        vendor: grn.vendor?.companyName,
        poNumber: grn.poNumber,
        discrepancyCount: grn.discrepancies.length,
        status: grn.matchingStatus,
      })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get discrepancies for a GRN
router.get('/discrepancies/:grnId', async (req, res) => {
  try {
    const { grnId } = req.params;
    const organizationId = req.user.organizationId;

    const grn = await GRN.findOne({
      _id: grnId,
      organization: organizationId,
    })
      .populate('vendor', 'companyName')
      .populate('purchaseOrder')
      .populate('linkedInvoice')
      .populate('discrepancies.resolvedBy', 'name email');

    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }

    res.json({
      grnNumber: grn.grnNumber,
      vendor: grn.vendor,
      po: grn.purchaseOrder,
      invoice: grn.linkedInvoice,
      hasDiscrepancies: grn.hasDiscrepancies,
      matchingStatus: grn.matchingStatus,
      discrepancies: grn.discrepancies,
    });
  } catch (error) {
    console.error('Discrepancies error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resolve discrepancy
router.patch('/discrepancies/:grnId/:discrepancyId/resolve', async (req, res) => {
  try {
    const { grnId, discrepancyId } = req.params;
    const { resolution } = req.body;
    const organizationId = req.user.organizationId;

    const grn = await GRN.findOne({
      _id: grnId,
      organization: organizationId,
    });

    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }

    const discrepancy = grn.discrepancies.id(discrepancyId);
    if (!discrepancy) {
      return res.status(404).json({ error: 'Discrepancy not found' });
    }

    discrepancy.resolvedBy = req.user.id;
    discrepancy.resolvedAt = new Date();
    discrepancy.resolution = resolution;

    const allResolved = grn.discrepancies.every((d) => d.resolvedAt);
    if (allResolved) {
      grn.hasDiscrepancies = false;
      grn.matchingStatus = 'MATCHED';
    }

    await grn.save();

    res.json({
      message: 'Discrepancy resolved',
      grn,
    });
  } catch (error) {
    console.error('Resolve discrepancy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ✅ HELPER: PERFORM THREE-WAY MATCHING
// ============================================

function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

export async function performThreeWayMatch(po, grn, invoice) {
  const discrepancies = [];
  let matchedItems = 0;

  console.log('\n🔍 Performing three-way match...');
  console.log(`   PO Items: ${po.items.length}`);
  console.log(`   GRN Items: ${grn.items.length}`);
  console.log(`   Invoice Items: ${invoice.items.length}`);

  // Tolerance levels
  const QTY_TOLERANCE = 0.01;      // Allow 0.01 unit difference
  const RATE_TOLERANCE_PCT = 0.1;  // Allow 0.1% rate difference
  const AMT_TOLERANCE_PCT = 1;     // Allow 1% amount difference

  // 1. Check PO Number Match
  if (po.poNumber !== grn.poNumber) {
    discrepancies.push({
      type: 'ITEM_MISMATCH',
      description: `PO number mismatch: PO (${po.poNumber}) vs GRN (${grn.poNumber})`,
      severity: 'HIGH',
    });
  }

  if (invoice.poNumber && invoice.poNumber !== po.poNumber) {
    discrepancies.push({
      type: 'ITEM_MISMATCH',
      description: `PO number mismatch: PO (${po.poNumber}) vs Invoice (${invoice.poNumber})`,
      severity: 'HIGH',
    });
  }

  // 2. Check Vendor Match
  const poVendorId = po.vendor._id || po.vendor;
  const invClientId = invoice.client._id || invoice.client;
  
  if (poVendorId.toString() !== invClientId.toString()) {
    discrepancies.push({
      type: 'ITEM_MISMATCH',
      description: 'Vendor mismatch between PO and Invoice',
      severity: 'HIGH',
    });
  }

  // 3. Create item maps for easier matching
  const grnItemMap = new Map();
  grn.items.forEach(item => {
    const key = normalizeString(item.description);
    grnItemMap.set(key, item);
  });

  const invoiceItemMap = new Map();
  invoice.items.forEach(item => {
    const key = normalizeString(item.description);
    invoiceItemMap.set(key, item);
  });

  // 4. Check each PO item
  console.log('\n   📦 Checking items...');
  
  for (const poItem of po.items) {
    const itemKey = normalizeString(poItem.description);
    console.log(`\n   Item: "${poItem.description}"`);
    console.log(`   Key: "${itemKey}"`);

    const grnItem = grnItemMap.get(itemKey);
    const invoiceItem = invoiceItemMap.get(itemKey);

    // Check if item exists in GRN
    if (!grnItem) {
      console.log('      ❌ Not found in GRN');
      discrepancies.push({
        type: 'ITEM_MISMATCH',
        description: `Item "${poItem.description}" in PO but not in GRN`,
        severity: 'HIGH',
      });
      continue;
    }

    // Check if item exists in Invoice
    if (!invoiceItem) {
      console.log('      ❌ Not found in Invoice');
      discrepancies.push({
        type: 'ITEM_MISMATCH',
        description: `Item "${poItem.description}" in PO but not in Invoice`,
        severity: 'MEDIUM',
      });
      continue;
    }

    console.log('      ✅ Found in PO, GRN, and Invoice');

    // Extract quantities
    const poQty = parseFloat(poItem.quantity) || 0;
    const grnQty = parseFloat(grnItem.acceptedQuantity) || 0;
    const invQty = parseFloat(invoiceItem.quantity) || 0;

    console.log(`      Quantities: PO=${poQty}, GRN=${grnQty}, INV=${invQty}`);

    // Check GRN vs Invoice quantity
    const qtyDiff = Math.abs(grnQty - invQty);
    if (qtyDiff > QTY_TOLERANCE) {
      console.log(`      ⚠️  Quantity mismatch (diff: ${qtyDiff})`);
      discrepancies.push({
        type: 'QUANTITY_MISMATCH',
        description: `Quantity mismatch for "${poItem.description}": GRN accepted ${grnQty}, Invoice ${invQty}`,
        severity: qtyDiff > (grnQty * 0.1) ? 'HIGH' : 'MEDIUM',
      });
    }

    // Extract rates
    const poRate = parseFloat(poItem.rate) || 0;
    const invRate = parseFloat(invoiceItem.rate) || 0;

    console.log(`      Rates: PO=${poRate}, INV=${invRate}`);

    // Check rate difference (allow 0.1% tolerance)
    const rateDiff = Math.abs(poRate - invRate);
    const rateDiffPct = poRate > 0 ? (rateDiff / poRate) * 100 : 0;

    if (rateDiffPct > RATE_TOLERANCE_PCT) {
      console.log(`      ⚠️  Rate mismatch (diff: ${rateDiffPct.toFixed(2)}%)`);
      discrepancies.push({
        type: 'RATE_MISMATCH',
        description: `Rate mismatch for "${poItem.description}": PO rate ₹${poRate.toFixed(2)}, Invoice rate ₹${invRate.toFixed(2)}`,
        severity: rateDiffPct > 5 ? 'HIGH' : 'MEDIUM',
      });
    }

    // Check amounts
    const invAmount = parseFloat(invoiceItem.amount) || 0;
    const expectedAmount = grnQty * poRate;
    const amountDiff = Math.abs(invAmount - expectedAmount);
    const amountDiffPct = expectedAmount > 0 ? (amountDiff / expectedAmount) * 100 : 0;

    console.log(`      Amounts: INV=${invAmount}, Expected=${expectedAmount.toFixed(2)}, Diff=${amountDiffPct.toFixed(2)}%`);

    // If all checks pass within tolerance, count as matched
    if (qtyDiff <= QTY_TOLERANCE && 
        rateDiffPct <= RATE_TOLERANCE_PCT && 
        amountDiffPct <= AMT_TOLERANCE_PCT) {
      matchedItems++;
      console.log('      ✅ ITEM MATCHED!');
    } else {
      console.log('      ⚠️  Item has discrepancies');
    }
  }

  // 5. Check for items in Invoice but not in PO
  for (const invItem of invoice.items) {
    const itemKey = normalizeString(invItem.description);
    const poItem = po.items.find(p => normalizeString(p.description) === itemKey);
    
    if (!poItem) {
      console.log(`\n   ⚠️  Item "${invItem.description}" in Invoice but not in PO`);
      discrepancies.push({
        type: 'ITEM_MISMATCH',
        description: `Item "${invItem.description}" in Invoice but not in PO`,
        severity: 'MEDIUM',
      });
    }
  }

  // 6. Check total amounts (with tolerance)
  const poTotal = parseFloat(po.totalValue || po.totalAmount) || 0;
  const invTotal = parseFloat(invoice.totalAmount) || 0;
  const totalDiff = Math.abs(poTotal - invTotal);
  const totalDiffPct = poTotal > 0 ? (totalDiff / poTotal) * 100 : 0;

  console.log(`\n   Total Amounts: PO=₹${poTotal}, INV=₹${invTotal}, Diff=${totalDiffPct.toFixed(2)}%`);

  if (totalDiffPct > 5) { // 5% tolerance for total amount
    discrepancies.push({
      type: 'RATE_MISMATCH',
      description: `Total amount mismatch: PO ₹${poTotal.toFixed(2)}, Invoice ₹${invTotal.toFixed(2)} (${totalDiffPct.toFixed(1)}% difference)`,
      severity: totalDiffPct > 10 ? 'HIGH' : 'MEDIUM',
    });
  }

  // 7. Determine overall status
  const totalItems = po.items.length;
  let overallStatus;

  if (discrepancies.length === 0 && matchedItems === totalItems) {
    overallStatus = 'MATCHED';
  } else if (matchedItems > 0 && matchedItems >= totalItems * 0.5) {
    overallStatus = 'PARTIALLY_MATCHED';
  } else {
    overallStatus = 'MISMATCHED';
  }

  console.log(`\n   📊 Final Result:`);
  console.log(`      Status: ${overallStatus}`);
  console.log(`      Matched: ${matchedItems}/${totalItems}`);
  console.log(`      Discrepancies: ${discrepancies.length}`);

  return {
    overallStatus,
    matchedItems,
    totalItems,
    matchPercentage: totalItems > 0 ? ((matchedItems / totalItems) * 100).toFixed(2) : 0,
    discrepancies,
    summary: {
      poNumber: po.poNumber,
      grnNumber: grn.grnNumber,
      invoiceNumber: invoice.invoiceNumber,
      poAmount: poTotal,
      grnAmount: grn.totalAmount || 0,
      invoiceAmount: invTotal,
      discrepancyCount: discrepancies.length,
    },
  };
}

export default router;