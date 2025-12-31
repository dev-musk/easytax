// ============================================
// FILE: server/routes/gstReports.js
// GST Reports Generation Routes
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import Organization from '../models/Organization.js';

const router = express.Router();

router.use(protect);

// GSTR-1 Report (Outward Supplies)
router.get('/gstr1', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const invoices = await Invoice.find({
      organization: organizationId,
      invoiceDate: { $gte: startDate, $lte: endDate },
      invoiceType: { $in: ['TAX_INVOICE', 'DEBIT_NOTE'] },
    }).populate('client');

    const organization = await Organization.findById(organizationId);

    // B2B Invoices (clients with GSTIN)
    const b2bInvoices = invoices.filter((inv) => inv.client && inv.client.gstin);
    
    // B2C Large (invoice > 2.5 lakhs, interstate)
    const b2cLarge = invoices.filter(
      (inv) =>
        (!inv.client || !inv.client.gstin) &&
        inv.totalAmount > 250000 &&
        inv.igst > 0
    );

    // B2C Small (all other B2C)
    const b2cSmall = invoices.filter(
      (inv) =>
        (!inv.client || !inv.client.gstin) &&
        (inv.totalAmount <= 250000 || inv.igst === 0)
    );

    // Calculate totals
    const totalInvoices = invoices.length;
    const totalTaxableValue = invoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
    const totalCGST = invoices.reduce((sum, inv) => sum + (inv.cgst || 0), 0);
    const totalSGST = invoices.reduce((sum, inv) => sum + (inv.sgst || 0), 0);
    const totalIGST = invoices.reduce((sum, inv) => sum + (inv.igst || 0), 0);
    const totalTax = totalCGST + totalSGST + totalIGST;
    const totalInvoiceValue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // HSN Summary for GSTR-1
    const hsnSummary = {};
    invoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        const hsn = item.hsnSacCode || 'UNCLASSIFIED';
        if (!hsnSummary[hsn]) {
          hsnSummary[hsn] = {
            hsnCode: hsn,
            description: item.description,
            uqc: item.unit,
            totalQuantity: 0,
            totalValue: 0,
            taxableValue: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            rate: item.gstRate,
          };
        }
        hsnSummary[hsn].totalQuantity += item.quantity;
        hsnSummary[hsn].totalValue += item.amount;
        hsnSummary[hsn].taxableValue += item.amount;
        
        // Calculate tax for this item
        const itemTax = (item.amount * item.gstRate) / 100;
        if (invoice.igst > 0) {
          hsnSummary[hsn].igst += itemTax;
        } else {
          hsnSummary[hsn].cgst += itemTax / 2;
          hsnSummary[hsn].sgst += itemTax / 2;
        }
      });
    });

    res.json({
      period: { month: parseInt(month), year: parseInt(year) },
      gstin: organization.gstin,
      legalName: organization.companyName,
      tradeName: organization.companyName,
      summary: {
        totalInvoices,
        totalTaxableValue: parseFloat(totalTaxableValue.toFixed(2)),
        totalCGST: parseFloat(totalCGST.toFixed(2)),
        totalSGST: parseFloat(totalSGST.toFixed(2)),
        totalIGST: parseFloat(totalIGST.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        totalInvoiceValue: parseFloat(totalInvoiceValue.toFixed(2)),
      },
      b2b: b2bInvoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        recipientGSTIN: inv.client.gstin,
        recipientName: inv.client.companyName,
        invoiceValue: inv.totalAmount,
        taxableValue: inv.subtotal - (inv.discountAmount || 0),
        cgst: inv.cgst || 0,
        sgst: inv.sgst || 0,
        igst: inv.igst || 0,
      })),
      b2cl: b2cLarge.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        invoiceValue: inv.totalAmount,
        placeOfSupply: inv.client?.stateCode || 'N/A',
        igst: inv.igst || 0,
      })),
      b2cs: {
        type: 'OE', // Other than exports
        placeOfSupply: organization.gstinStateCode || '33',
        taxableValue: b2cSmall.reduce((sum, inv) => sum + (inv.subtotal || 0), 0),
        cgst: b2cSmall.reduce((sum, inv) => sum + (inv.cgst || 0), 0),
        sgst: b2cSmall.reduce((sum, inv) => sum + (inv.sgst || 0), 0),
      },
      hsn: Object.values(hsnSummary).map((item) => ({
        ...item,
        totalValue: parseFloat(item.totalValue.toFixed(2)),
        taxableValue: parseFloat(item.taxableValue.toFixed(2)),
        cgst: parseFloat(item.cgst.toFixed(2)),
        sgst: parseFloat(item.sgst.toFixed(2)),
        igst: parseFloat(item.igst.toFixed(2)),
      })),
    });
  } catch (error) {
    console.error('Error generating GSTR-1:', error);
    res.status(500).json({ error: error.message });
  }
});

// GSTR-3B Report (Monthly Summary)
router.get('/gstr3b', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const invoices = await Invoice.find({
      organization: organizationId,
      invoiceDate: { $gte: startDate, $lte: endDate },
    }).populate('client');

    const organization = await Organization.findById(organizationId);

    // 3.1 - Outward taxable supplies
    const outwardTaxable = invoices.filter((inv) => inv.totalTax > 0);
    const outwardTaxableValue = outwardTaxable.reduce(
      (sum, inv) => sum + (inv.subtotal - (inv.discountAmount || 0)),
      0
    );
    const outwardCGST = outwardTaxable.reduce((sum, inv) => sum + (inv.cgst || 0), 0);
    const outwardSGST = outwardTaxable.reduce((sum, inv) => sum + (inv.sgst || 0), 0);
    const outwardIGST = outwardTaxable.reduce((sum, inv) => sum + (inv.igst || 0), 0);

    // 3.2 - Inter-state supplies
    const interStateSupplies = invoices.filter((inv) => inv.igst > 0);
    const interStateValue = interStateSupplies.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const interStateIGST = interStateSupplies.reduce((sum, inv) => sum + inv.igst, 0);

    // 4 - Eligible ITC (Input Tax Credit)
    // Note: This would require purchase/expense data which we don't have yet
    // For now, returning zero values
    const itcAvailable = {
      imports: { cgst: 0, sgst: 0, igst: 0, cess: 0 },
      capitalGoods: { cgst: 0, sgst: 0, igst: 0, cess: 0 },
      inputServiceDistributor: { cgst: 0, sgst: 0, igst: 0, cess: 0 },
      all: { cgst: 0, sgst: 0, igst: 0, cess: 0 },
    };

    // 5 - Interest and late fee
    const interestAndLateFee = {
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
    };

    res.json({
      period: { month: parseInt(month), year: parseInt(year) },
      gstin: organization.gstin,
      legalName: organization.companyName,
      
      // 3.1 - Outward taxable supplies
      outwardSupplies: {
        taxableValue: parseFloat(outwardTaxableValue.toFixed(2)),
        cgst: parseFloat(outwardCGST.toFixed(2)),
        sgst: parseFloat(outwardSGST.toFixed(2)),
        igst: parseFloat(outwardIGST.toFixed(2)),
        cess: 0,
      },
      
      // 3.2 - Inter-state supplies
      interStateSupplies: {
        taxableValue: parseFloat(interStateValue.toFixed(2)),
        igst: parseFloat(interStateIGST.toFixed(2)),
      },
      
      // 4 - Eligible ITC
      itc: itcAvailable,
      
      // 5 - Interest and late fee
      interestAndLateFee,
      
      // Net tax liability
      taxPayable: {
        cgst: parseFloat((outwardCGST - itcAvailable.all.cgst).toFixed(2)),
        sgst: parseFloat((outwardSGST - itcAvailable.all.sgst).toFixed(2)),
        igst: parseFloat((outwardIGST - itcAvailable.all.igst).toFixed(2)),
        cess: 0,
        totalTax: parseFloat(
          (outwardCGST + outwardSGST + outwardIGST - itcAvailable.all.cgst - itcAvailable.all.sgst - itcAvailable.all.igst).toFixed(2)
        ),
      },
    });
  } catch (error) {
    console.error('Error generating GSTR-3B:', error);
    res.status(500).json({ error: error.message });
  }
});

// HSN Summary Report
router.get('/hsn-summary', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { month, year, startDate, endDate } = req.query;

    let dateFilter = {};
    
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      dateFilter = { invoiceDate: { $gte: start, $lte: end } };
    } else if (startDate && endDate) {
      dateFilter = {
        invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      };
    }

    const invoices = await Invoice.find({
      organization: organizationId,
      ...dateFilter,
    });

    // Build HSN summary
    const hsnSummary = {};
    
    invoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        const hsn = item.hsnSacCode || 'UNCLASSIFIED';
        const gstRate = item.gstRate || 0;
        const key = `${hsn}_${gstRate}`;

        if (!hsnSummary[key]) {
          hsnSummary[key] = {
            hsnCode: hsn,
            description: item.description,
            uqc: item.unit,
            gstRate: gstRate,
            totalQuantity: 0,
            totalValue: 0,
            taxableValue: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
          };
        }

        hsnSummary[key].totalQuantity += item.quantity;
        hsnSummary[key].totalValue += item.amount;
        hsnSummary[key].taxableValue += item.amount;

        // Calculate tax
        const itemTax = (item.amount * gstRate) / 100;
        if (invoice.igst > 0) {
          // Interstate
          hsnSummary[key].igst += itemTax;
        } else {
          // Intrastate
          hsnSummary[key].cgst += itemTax / 2;
          hsnSummary[key].sgst += itemTax / 2;
        }
      });
    });

    // Convert to array and sort by HSN code
    const summary = Object.values(hsnSummary)
      .map((item) => ({
        ...item,
        totalValue: parseFloat(item.totalValue.toFixed(2)),
        taxableValue: parseFloat(item.taxableValue.toFixed(2)),
        cgst: parseFloat(item.cgst.toFixed(2)),
        sgst: parseFloat(item.sgst.toFixed(2)),
        igst: parseFloat(item.igst.toFixed(2)),
        totalTax: parseFloat((item.cgst + item.sgst + item.igst).toFixed(2)),
      }))
      .sort((a, b) => {
        if (a.hsnCode === 'UNCLASSIFIED') return 1;
        if (b.hsnCode === 'UNCLASSIFIED') return -1;
        return a.hsnCode.localeCompare(b.hsnCode);
      });

    // Calculate totals
    const totals = {
      totalQuantity: summary.reduce((sum, item) => sum + item.totalQuantity, 0),
      totalValue: summary.reduce((sum, item) => sum + item.totalValue, 0),
      taxableValue: summary.reduce((sum, item) => sum + item.taxableValue, 0),
      cgst: summary.reduce((sum, item) => sum + item.cgst, 0),
      sgst: summary.reduce((sum, item) => sum + item.sgst, 0),
      igst: summary.reduce((sum, item) => sum + item.igst, 0),
      totalTax: summary.reduce((sum, item) => sum + item.totalTax, 0),
    };

    res.json({
      period: month && year ? { month: parseInt(month), year: parseInt(year) } : null,
      dateRange: startDate && endDate ? { startDate, endDate } : null,
      summary,
      totals: {
        ...totals,
        totalValue: parseFloat(totals.totalValue.toFixed(2)),
        taxableValue: parseFloat(totals.taxableValue.toFixed(2)),
        cgst: parseFloat(totals.cgst.toFixed(2)),
        sgst: parseFloat(totals.sgst.toFixed(2)),
        igst: parseFloat(totals.igst.toFixed(2)),
        totalTax: parseFloat(totals.totalTax.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Error generating HSN summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tax liability summary
router.get('/tax-liability', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const filter = { organization: organizationId };
    
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filter);

    const totalCGST = invoices.reduce((sum, inv) => sum + (inv.cgst || 0), 0);
    const totalSGST = invoices.reduce((sum, inv) => sum + (inv.sgst || 0), 0);
    const totalIGST = invoices.reduce((sum, inv) => sum + (inv.igst || 0), 0);
    const totalTDS = invoices.reduce((sum, inv) => sum + (inv.tdsAmount || 0), 0);

    res.json({
      dateRange: { startDate, endDate },
      taxLiability: {
        cgst: parseFloat(totalCGST.toFixed(2)),
        sgst: parseFloat(totalSGST.toFixed(2)),
        igst: parseFloat(totalIGST.toFixed(2)),
        totalGST: parseFloat((totalCGST + totalSGST + totalIGST).toFixed(2)),
        tds: parseFloat(totalTDS.toFixed(2)),
        netPayable: parseFloat((totalCGST + totalSGST + totalIGST - totalTDS).toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Error calculating tax liability:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;