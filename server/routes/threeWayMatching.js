// ============================================
// FILE: server/routes/threeWayMatching.js
// ✅ FEATURE #46: THREE-WAY MATCHING ROUTES
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

    // Fetch all three documents
    const [po, grn, invoice] = await Promise.all([
      PurchaseOrder.findOne({ _id: poId, organization: organizationId }),
      GRN.findOne({ _id: grnId, organization: organizationId }),
      Invoice.findOne({ _id: invoiceId, organization: organizationId }),
    ]);

    if (!po || !grn || !invoice) {
      return res.status(404).json({ error: 'One or more documents not found' });
    }

    // ✅ PERFORM THREE-WAY MATCHING
    const matchingResult = await performThreeWayMatch(po, grn, invoice);

    // Update documents with matching status
    if (matchingResult.overallStatus === 'MATCHED') {
      grn.matchingStatus = 'MATCHED';
      grn.linkedInvoice = invoice._id;
      grn.invoiceNumber = invoice.invoiceNumber;
      grn.invoiceMatchDate = new Date();
      await grn.save();

      po.linkedInvoices.push({
        invoice: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
      });
      await po.save();
    } else if (matchingResult.overallStatus === 'PARTIALLY_MATCHED') {
      grn.matchingStatus = 'PARTIALLY_MATCHED';
      grn.hasDiscrepancies = true;
      grn.discrepancies = matchingResult.discrepancies;
      await grn.save();
    } else {
      grn.matchingStatus = 'MISMATCHED';
      grn.hasDiscrepancies = true;
      grn.discrepancies = matchingResult.discrepancies;
      await grn.save();
    }

    res.json({
      success: true,
      matchingResult,
      message: `Matching complete: ${matchingResult.overallStatus}`,
    });
  } catch (error) {
    console.error('Three-way matching error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get matching suggestions
router.get('/suggestions/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const organizationId = req.user.organizationId;

    if (type === 'po') {
      // Find GRNs and Invoices for this PO
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
      // Find PO and possible Invoices for this GRN
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
      // Find PO and GRN for this Invoice
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

    // Get recent mismatches
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

    // Check if all discrepancies resolved
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

async function performThreeWayMatch(po, grn, invoice) {
  const discrepancies = [];
  let matchedItems = 0;
  let totalItems = Math.max(po.items.length, grn.items.length, invoice.items.length);

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
  if (po.vendor.toString() !== invoice.client.toString()) {
    discrepancies.push({
      type: 'ITEM_MISMATCH',
      description: 'Vendor mismatch between PO and Invoice',
      severity: 'HIGH',
    });
  }

  // 3. Check Line Items
  const tolerance = 0.05; // 5% tolerance for quantity/rate differences

  for (let i = 0; i < po.items.length; i++) {
    const poItem = po.items[i];
    const grnItem = grn.items.find(
      (g) => g.description === poItem.description
    );
    const invoiceItem = invoice.items.find(
      (inv) => inv.description === poItem.description
    );

    if (!grnItem) {
      discrepancies.push({
        type: 'ITEM_MISMATCH',
        description: `Item "${poItem.description}" in PO but not in GRN`,
        severity: 'HIGH',
      });
      continue;
    }

    if (!invoiceItem) {
      discrepancies.push({
        type: 'ITEM_MISMATCH',
        description: `Item "${poItem.description}" in PO but not in Invoice`,
        severity: 'MEDIUM',
      });
      continue;
    }

    // Quantity check
    const qtyDiff = Math.abs(grnItem.acceptedQuantity - invoiceItem.quantity);
    const qtyTolerance = grnItem.acceptedQuantity * tolerance;

    if (qtyDiff > qtyTolerance) {
      discrepancies.push({
        type: 'QUANTITY_MISMATCH',
        description: `Quantity mismatch for "${poItem.description}": GRN (${grnItem.acceptedQuantity}) vs Invoice (${invoiceItem.quantity})`,
        severity: qtyDiff > grnItem.acceptedQuantity * 0.1 ? 'HIGH' : 'MEDIUM',
      });
    } else {
      matchedItems++;
    }

    // Rate check
    const rateDiff = Math.abs(poItem.rate - invoiceItem.rate);
    const rateTolerance = poItem.rate * tolerance;

    if (rateDiff > rateTolerance) {
      discrepancies.push({
        type: 'RATE_MISMATCH',
        description: `Rate mismatch for "${poItem.description}": PO (₹${poItem.rate}) vs Invoice (₹${invoiceItem.rate})`,
        severity: 'MEDIUM',
      });
    }
  }

  // 4. Check Total Amount (within 5% tolerance)
  const amountDiff = Math.abs(po.totalValue - invoice.totalAmount);
  const amountTolerance = po.totalValue * tolerance;

  if (amountDiff > amountTolerance) {
    discrepancies.push({
      type: 'RATE_MISMATCH',
      description: `Total amount mismatch: PO (₹${po.totalValue}) vs Invoice (₹${invoice.totalAmount})`,
      severity: 'HIGH',
    });
  }

  // Determine overall status
  let overallStatus;
  if (discrepancies.length === 0) {
    overallStatus = 'MATCHED';
  } else if (matchedItems > totalItems / 2) {
    overallStatus = 'PARTIALLY_MATCHED';
  } else {
    overallStatus = 'MISMATCHED';
  }

  return {
    overallStatus,
    matchedItems,
    totalItems,
    matchPercentage: ((matchedItems / totalItems) * 100).toFixed(2),
    discrepancies,
    summary: {
      poNumber: po.poNumber,
      grnNumber: grn.grnNumber,
      invoiceNumber: invoice.invoiceNumber,
      poAmount: po.totalValue,
      grnAmount: grn.totalAmount,
      invoiceAmount: invoice.totalAmount,
      discrepancyCount: discrepancies.length,
    },
  };
}

export default router;