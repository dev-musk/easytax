// ============================================
// FILE: server/routes/reports.js
// ✅ FEATURE #17: Advanced Reports - ALL 7 REPORTS
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import RecurringInvoice from '../models/RecurringInvoice.js';
import creditNote from '../models/CreditNote.js';
import PurchaseInvoice from '../models/PurchaseInvoice.js';
import Client from '../models/Client.js';
import mongoose from 'mongoose';

const router = express.Router();
router.use(protect);

// ============================================
// REPORT 1: Sales by Customer
// ============================================
router.get('/sales-by-customer', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
      status: { $nin: ['CANCELLED', 'DRAFT'] },
    };

    if (startDate && endDate) {
      matchStage.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const report = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$client',
          totalInvoices: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$balanceAmount' },
          totalDiscount: { $sum: '$discountAmount' },
          totalGST: {
            $sum: {
              $add: [
                { $ifNull: ['$cgst', 0] },
                { $ifNull: ['$sgst', 0] },
                { $ifNull: ['$igst', 0] },
              ],
            },
          },
          avgInvoiceValue: { $avg: '$totalAmount' },
        },
      },
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'clientInfo',
        },
      },
      { $unwind: '$clientInfo' },
      { $sort: { totalRevenue: -1 } },
      {
        $project: {
          client: '$clientInfo.companyName',
          clientEmail: '$clientInfo.email',
          clientGSTIN: '$clientInfo.gstin',
          totalInvoices: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalPaid: { $round: ['$totalPaid', 2] },
          totalOutstanding: { $round: ['$totalOutstanding', 2] },
          totalDiscount: { $round: ['$totalDiscount', 2] },
          totalGST: { $round: ['$totalGST', 2] },
          avgInvoiceValue: { $round: ['$avgInvoiceValue', 2] },
          collectionRate: {
            $round: [
              {
                $cond: [
                  { $eq: ['$totalRevenue', 0] },
                  0,
                  { $multiply: [{ $divide: ['$totalPaid', '$totalRevenue'] }, 100] },
                ],
              },
              2,
            ],
          },
        },
      },
    ]);

    res.json(report);
  } catch (error) {
    console.error('Sales by Customer error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// REPORT 2: Sales by Item
// ============================================
router.get('/sales-by-item', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
      status: { $nin: ['CANCELLED', 'DRAFT'] },
    };

    if (startDate && endDate) {
      matchStage.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const report = await Invoice.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            description: '$items.description',
            hsnCode: '$items.hsnSacCode',
            itemType: '$items.itemType',
          },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.amount' },
          totalDiscount: { $sum: { $ifNull: ['$items.discountAmount', 0] } },
          avgRate: { $avg: '$items.rate' },
          timesOrdered: { $sum: 1 },
          invoiceCount: { $addToSet: '$invoiceNumber' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      {
        $project: {
          description: '$_id.description',
          hsnCode: '$_id.hsnCode',
          itemType: '$_id.itemType',
          totalQuantity: { $round: ['$totalQuantity', 2] },
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalDiscount: { $round: ['$totalDiscount', 2] },
          avgRate: { $round: ['$avgRate', 2] },
          timesOrdered: 1,
          invoiceCount: { $size: '$invoiceCount' },
        },
      },
    ]);

    res.json(report);
  } catch (error) {
    console.error('Sales by Item error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// REPORT 3: Sales Return History (Credit Notes)
// ============================================
router.get('/sales-return-history', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
    };

    if (startDate && endDate) {
      matchStage.creditNoteDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Query the CreditNote collection instead of Invoice
    const report = await creditNote.find(matchStage)
      .populate('client', 'companyName email gstin')
      .populate('originalInvoice', 'invoiceNumber')
      .select('creditNoteNumber creditNoteDate client totalAmount reason reasonDescription items status')
      .sort({ creditNoteDate: -1 })
      .lean();

    const summary = {
      totalCreditNotes: report.length,
      totalAmount: report.reduce((sum, cn) => sum + cn.totalAmount, 0),
      byClient: {},
      byReason: {},
    };

    report.forEach((cn) => {
      const clientName = cn.client?.companyName || 'Unknown';
      if (!summary.byClient[clientName]) {
        summary.byClient[clientName] = {
          count: 0,
          amount: 0,
        };
      }
      summary.byClient[clientName].count++;
      summary.byClient[clientName].amount += cn.totalAmount;

      // Add reason breakdown
      const reason = cn.reason || 'UNSPECIFIED';
      if (!summary.byReason[reason]) {
        summary.byReason[reason] = {
          count: 0,
          amount: 0,
        };
      }
      summary.byReason[reason].count++;
      summary.byReason[reason].amount += cn.totalAmount;
    });

    res.json({
      summary,
      creditNotes: report,
    });
  } catch (error) {
    console.error('Sales Return History error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// REPORT 4: Sales by Salesperson
// ============================================
router.get('/sales-by-salesperson', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
      status: { $nin: ['CANCELLED', 'DRAFT'] },
      salesPersonName: { $exists: true, $ne: '' },
    };

    if (startDate && endDate) {
      matchStage.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const report = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$salesPersonName',
          totalInvoices: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$balanceAmount' },
          avgInvoiceValue: { $avg: '$totalAmount' },
          clients: { $addToSet: '$client' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      {
        $project: {
          salesperson: '$_id',
          totalInvoices: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalPaid: { $round: ['$totalPaid', 2] },
          totalOutstanding: { $round: ['$totalOutstanding', 2] },
          avgInvoiceValue: { $round: ['$avgInvoiceValue', 2] },
          uniqueClients: { $size: '$clients' },
          collectionRate: {
            $round: [
              {
                $cond: [
                  { $eq: ['$totalRevenue', 0] },
                  0,
                  { $multiply: [{ $divide: ['$totalPaid', '$totalRevenue'] }, 100] },
                ],
              },
              2,
            ],
          },
        },
      },
    ]);

    res.json(report);
  } catch (error) {
    console.error('Sales by Salesperson error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// REPORT 5: Sales Summary
// ============================================
router.get('/sales-summary', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
      status: { $nin: ['CANCELLED', 'DRAFT'] },
    };

    if (startDate && endDate) {
      matchStage.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const summary = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$balanceAmount' },
          totalSubtotal: { $sum: '$subtotal' },
          totalDiscount: { $sum: '$discountAmount' },
          totalCGST: { $sum: '$cgst' },
          totalSGST: { $sum: '$sgst' },
          totalIGST: { $sum: '$igst' },
          totalTDS: { $sum: '$tdsAmount' },
          totalTCS: { $sum: '$tcsAmount' },
        },
      },
    ]);

    const statusBreakdown = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' },
        },
      },
    ]);

    const monthlyTrend = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' },
          },
          revenue: { $sum: '$totalAmount' },
          invoices: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      summary: summary[0] || {},
      statusBreakdown,
      monthlyTrend,
    });
  } catch (error) {
    console.error('Sales Summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// REPORT 6: Recurring Invoice Details
// ============================================
router.get('/recurring-invoices', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const recurringInvoices = await RecurringInvoice.find({
      organization: organizationId,
    })
      .populate('client', 'companyName email')
      .sort({ nextInvoiceDate: 1 })
      .lean();

    const summary = {
      total: recurringInvoices.length,
      active: recurringInvoices.filter((ri) => ri.isActive).length,
      inactive: recurringInvoices.filter((ri) => !ri.isActive).length,
      totalMonthlyRevenue: recurringInvoices
        .filter((ri) => ri.isActive && ri.frequency === 'MONTHLY')
        .reduce((sum, ri) => sum + ri.totalAmount, 0),
    };

    res.json({
      summary,
      recurringInvoices,
    });
  } catch (error) {
    console.error('Recurring Invoices error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// REPORT 7: PO Summary
// ============================================
router.get('/po-summary', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
      poNumber: { $exists: true, $ne: '' },
    };

    if (startDate && endDate) {
      matchStage.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const report = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$poNumber',
          poDate: { $first: '$poDate' },
          client: { $first: '$client' },
          totalInvoices: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$balanceAmount' },
          invoices: {
            $push: {
              invoiceNumber: '$invoiceNumber',
              invoiceDate: '$invoiceDate',
              amount: '$totalAmount',
              status: '$status',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientInfo',
        },
      },
      { $unwind: '$clientInfo' },
      { $sort: { poDate: -1 } },
      {
        $project: {
          poNumber: '$_id',
          poDate: 1,
          client: '$clientInfo.companyName',
          totalInvoices: 1,
          totalValue: { $round: ['$totalValue', 2] },
          totalPaid: { $round: ['$totalPaid', 2] },
          totalOutstanding: { $round: ['$totalOutstanding', 2] },
          invoices: 1,
          fulfillmentRate: {
            $round: [
              {
                $cond: [
                  { $eq: ['$totalValue', 0] },
                  0,
                  { $multiply: [{ $divide: ['$totalPaid', '$totalValue'] }, 100] },
                ],
              },
              2,
            ],
          },
        },
      },
    ]);

    res.json(report);
  } catch (error) {
    console.error('PO Summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/vendor-outstanding-consolidated', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { vendorId, startDate, endDate } = req.query;

    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
      status: { $in: ['PENDING', 'APPROVED', 'PARTIALLY_PAID'] },
      balanceAmount: { $gt: 0 },
    };

    if (vendorId) {
      matchStage.vendor = new mongoose.Types.ObjectId(vendorId);
    }

    if (startDate && endDate) {
      matchStage.piDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Aggregate by vendor (consolidated across all branches)
    const consolidatedReport = await PurchaseInvoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$vendor',
          totalInvoices: { $sum: 1 },
          totalOutstanding: { $sum: '$balanceAmount' },
          totalAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          oldestDueDate: { $min: '$dueDate' },
          
          // Branch breakdown
          branches: {
            $push: {
              ourBranch: '$ourBranchName',
              ourBranchGSTIN: '$ourBranchGSTIN',
              vendorBranch: '$vendorBranchName',
              vendorBranchGSTIN: '$vendorBranchGSTIN',
              piNumber: '$piNumber',
              piDate: '$piDate',
              dueDate: '$dueDate',
              amount: '$totalAmount',
              balanceAmount: '$balanceAmount',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'vendorInfo',
        },
      },
      { $unwind: '$vendorInfo' },
      { $sort: { totalOutstanding: -1 } },
      {
        $project: {
          vendor: {
            _id: '$vendorInfo._id',
            companyName: '$vendorInfo.companyName',
            email: '$vendorInfo.email',
            gstin: '$vendorInfo.gstin',
            contactPerson: '$vendorInfo.contactPerson',
            phone: '$vendorInfo.phone',
          },
          totalInvoices: 1,
          totalOutstanding: { $round: ['$totalOutstanding', 2] },
          totalAmount: { $round: ['$totalAmount', 2] },
          totalPaid: { $round: ['$totalPaid', 2] },
          oldestDueDate: 1,
          daysOverdue: {
            $max: [
              0,
              {
                $divide: [
                  { $subtract: [new Date(), '$oldestDueDate'] },
                  86400000,
                ],
              },
            ],
          },
          branches: 1,
        },
      },
    ]);

    // Calculate summary
    const summary = {
      totalVendors: consolidatedReport.length,
      totalOutstanding: consolidatedReport.reduce(
        (sum, v) => sum + v.totalOutstanding,
        0
      ),
      totalInvoices: consolidatedReport.reduce(
        (sum, v) => sum + v.totalInvoices,
        0
      ),
      overdueVendors: consolidatedReport.filter(
        (v) => v.daysOverdue > 0
      ).length,
    };

    res.json({
      summary,
      vendors: consolidatedReport,
    });
  } catch (error) {
    console.error('Vendor Outstanding Consolidated error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FEATURE #36: Vendor Outstanding - Branch Breakdown
// ============================================
router.get('/vendor-outstanding-branches/:vendorId', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { vendorId } = req.params;

    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
      vendor: new mongoose.Types.ObjectId(vendorId),
      status: { $in: ['PENDING', 'APPROVED', 'PARTIALLY_PAID'] },
      balanceAmount: { $gt: 0 },
    };

    // Group by our branch (where purchase was made)
    const branchBreakdown = await PurchaseInvoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            ourBranch: '$ourBranchName',
            ourBranchGSTIN: '$ourBranchGSTIN',
          },
          totalInvoices: { $sum: 1 },
          totalOutstanding: { $sum: '$balanceAmount' },
          totalAmount: { $sum: '$totalAmount' },
          invoices: {
            $push: {
              piNumber: '$piNumber',
              piDate: '$piDate',
              dueDate: '$dueDate',
              totalAmount: '$totalAmount',
              balanceAmount: '$balanceAmount',
              status: '$status',
              vendorBranch: '$vendorBranchName',
              vendorBranchGSTIN: '$vendorBranchGSTIN',
            },
          },
        },
      },
      { $sort: { totalOutstanding: -1 } },
      {
        $project: {
          branch: {
            name: '$_id.ourBranch',
            gstin: '$_id.ourBranchGSTIN',
          },
          totalInvoices: 1,
          totalOutstanding: { $round: ['$totalOutstanding', 2] },
          totalAmount: { $round: ['$totalAmount', 2] },
          invoices: 1,
        },
      },
    ]);

    // Get vendor info
    const vendor = await Client.findById(vendorId).select(
      'companyName email gstin contactPerson phone'
    );

    res.json({
      vendor,
      branches: branchBreakdown,
      consolidatedTotal: branchBreakdown.reduce(
        (sum, b) => sum + b.totalOutstanding,
        0
      ),
    });
  } catch (error) {
    console.error('Vendor Outstanding Branches error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;