// ============================================
// FILE: server/routes/dashboard.js
// ✅ ENHANCED: With detailed debugging
// ============================================

import express from "express";
import { protect } from "../middleware/auth.js";
import Invoice from "../models/Invoice.js";
import Client from "../models/Client.js";
import Payment from "../models/Payment.js";
import PurchaseOrder from "../models/PurchaseOrder.js";

const router = express.Router();

router.use(protect);

// Get dashboard statistics
router.get("/stats", async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('\n🔍 === DASHBOARD STATS REQUEST ===');
    console.log('📍 Organization ID:', organizationId);
    console.log('📅 Today:', today);

    // Total invoices
    const totalInvoices = await Invoice.countDocuments({
      organization: organizationId,
    });
    console.log('📄 Total Invoices:', totalInvoices);

    // Total clients
    const totalClients = await Client.countDocuments({
      organization: organizationId,
    });
    console.log('👥 Total Clients:', totalClients);

    // Outstanding amount
    const outstandingInvoices = await Invoice.find({
      organization: organizationId,
      status: { $in: ["PENDING", "PARTIALLY_PAID"] },
    });
    const outstandingAmount = outstandingInvoices.reduce(
      (sum, inv) => sum + (inv.balanceAmount || inv.totalAmount),
      0
    );
    console.log('💰 Outstanding Amount:', outstandingAmount);

    // Overdue invoices
    const overdueInvoices = await Invoice.countDocuments({
      organization: organizationId,
      dueDate: { $lt: today },
      status: { $ne: "PAID" },
    });
    console.log('⏰ Overdue Invoices:', overdueInvoices);

    // This month's revenue
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );
    const monthlyInvoices = await Invoice.find({
      organization: organizationId,
      invoiceDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    });
    const monthlyRevenue = monthlyInvoices.reduce(
      (sum, inv) => sum + inv.totalAmount,
      0
    );
    console.log('📊 Monthly Revenue:', monthlyRevenue);

    // Total Expenses
    const allPOs = await PurchaseOrder.find({ organization: organizationId });
    const totalExpenses = allPOs.reduce(
      (sum, po) => sum + (po.totalValue || po.totalAmount || 0),
      0
    );
    console.log('💸 Total Expenses:', totalExpenses);

    // ✅ MONTHLY TREND WITH DEBUGGING
    console.log('\n📈 === GENERATING MONTHLY TREND ===');
    
    const monthlyTrend = await Invoice.aggregate([
      {
        $match: {
          organization: organizationId,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$invoiceDate" },
            month: { $month: "$invoiceDate" },
          },
          revenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          revenue: 1,
          count: 1,
        },
      },
    ]);

    console.log('📊 Aggregation Result:', JSON.stringify(monthlyTrend, null, 2));

    // ✅ Fill missing months with 0
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const fullMonthlyTrend = [];
    
    console.log('\n📅 === FILLING 12 MONTHS ===');
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const existing = monthlyTrend.find(
        m => m.year === year && m.month === month
      );
      
      const monthData = {
        month: date.toLocaleDateString("en-IN", {
          month: "short",
          year: "numeric",
        }),
        revenue: existing ? existing.revenue : 0,
        invoices: existing ? existing.count : 0,
      };
      
      console.log(`  ${i === 11 ? '⬅️' : '  '} ${monthData.month}: ₹${monthData.revenue} (${monthData.invoices} invoices)`);
      
      fullMonthlyTrend.push(monthData);
    }

    console.log('\n✅ Full Monthly Trend:', fullMonthlyTrend.length, 'months');

    // Calculate trends
    const lastMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const lastMonthClients = await Client.countDocuments({
      organization: organizationId,
      createdAt: { $lt: lastMonthStart },
    });

    const clientGrowth =
      lastMonthClients > 0
        ? ((totalClients - lastMonthClients) / lastMonthClients) * 100
        : 11.01;

    const lastMonthPOs = await PurchaseOrder.find({
      organization: organizationId,
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
    });
    const lastMonthExpenses = lastMonthPOs.reduce(
      (sum, po) => sum + (po.totalValue || po.totalAmount || 0),
      0
    );

    const thisMonthPOs = await PurchaseOrder.find({
      organization: organizationId,
      createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    });
    const thisMonthExpenses = thisMonthPOs.reduce(
      (sum, po) => sum + (po.totalValue || po.totalAmount || 0),
      0
    );

    const expensesChange =
      lastMonthExpenses > 0
        ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
        : 9.05;

    const responseData = {
      totalInvoices,
      totalClients,
      outstandingAmount: parseFloat(outstandingAmount.toFixed(2)),
      overdueInvoices,
      monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      monthlyTrend: fullMonthlyTrend,
      clientGrowth: parseFloat(clientGrowth.toFixed(2)),
      expensesChange: parseFloat(expensesChange.toFixed(2)),
    };

    console.log('\n✅ === RESPONSE DATA ===');
    console.log('Monthly Trend Items:', responseData.monthlyTrend.length);
    console.log('Non-zero months:', responseData.monthlyTrend.filter(m => m.revenue > 0).length);
    console.log('\n================================\n');

    res.json(responseData);
  } catch (error) {
    console.error("❌ Error fetching dashboard stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get bills summary with trends
router.get("/bills-summary", async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const today = new Date();

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );

    const firstDayOfLastMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );
    const lastDayOfLastMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      0
    );

    // Bills Raised
    const allInvoices = await Invoice.find({ organization: organizationId });
    const billsRaised = allInvoices.reduce(
      (sum, inv) => sum + inv.totalAmount,
      0
    );

    // Bills Received
    const paidInvoices = await Invoice.find({
      organization: organizationId,
      status: "PAID",
    });
    const billsReceived = paidInvoices.reduce(
      (sum, inv) => sum + inv.totalAmount,
      0
    );

    // Bills Pending
    const pendingInvoices = await Invoice.find({
      organization: organizationId,
      status: { $in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
    });
    const billsPending = pendingInvoices.reduce(
      (sum, inv) => sum + (inv.balanceAmount || inv.totalAmount),
      0
    );

    // This month trends
    const thisMonthInvoices = await Invoice.find({
      organization: organizationId,
      invoiceDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    });
    const thisMonthRaised = thisMonthInvoices.reduce(
      (sum, inv) => sum + inv.totalAmount,
      0
    );

    const thisMonthPaid = await Payment.find({
      organization: organizationId,
      paymentDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    });
    const thisMonthReceived = thisMonthPaid.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    // Last month trends
    const lastMonthInvoices = await Invoice.find({
      organization: organizationId,
      invoiceDate: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth },
    });
    const lastMonthRaised = lastMonthInvoices.reduce(
      (sum, inv) => sum + inv.totalAmount,
      0
    );

    const lastMonthPaid = await Payment.find({
      organization: organizationId,
      paymentDate: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth },
    });
    const lastMonthReceived = lastMonthPaid.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    const raisedTrend =
      lastMonthRaised > 0
        ? ((thisMonthRaised - lastMonthRaised) / lastMonthRaised) * 100
        : 5.2;

    const receivedTrend =
      lastMonthReceived > 0
        ? ((thisMonthReceived - lastMonthReceived) / lastMonthReceived) * 100
        : 3.8;

    res.json({
      billsRaised: parseFloat(billsRaised.toFixed(2)),
      billsReceived: parseFloat(billsReceived.toFixed(2)),
      billsPending: parseFloat(billsPending.toFixed(2)),
      raisedTrend: parseFloat(raisedTrend.toFixed(1)),
      receivedTrend: parseFloat(receivedTrend.toFixed(1)),
      pendingTrend: 2.5,
    });
  } catch (error) {
    console.error("Error fetching bills summary:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;