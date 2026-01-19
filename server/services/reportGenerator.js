// ============================================
// FILE: server/services/reportGenerator.js
// ✅ FEATURE #31: Daily Report Generator
// ============================================

import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import mongoose from 'mongoose';

export const generateDailyReport = async (organizationId, date = new Date()) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get today's invoices
    const newInvoices = await Invoice.find({
      organization: organizationId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).populate('client', 'companyName');

    // Calculate total sales today
    const totalSales = newInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    // Get today's payments (if Payment model exists)
    let totalPayments = 0;
    try {
      const payments = await Payment.find({
        organization: organizationId,
        paymentDate: { $gte: startOfDay, $lte: endOfDay },
        status: 'COMPLETED',
      });
      totalPayments = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    } catch (err) {
      console.log('Payment model not found, skipping payment stats');
    }

    // Get overdue invoices
    const overdueInvoices = await Invoice.find({
      organization: organizationId,
      status: 'OVERDUE',
      balanceAmount: { $gt: 0 },
    }).populate('client', 'companyName');

    // Get pending amount
    const pendingInvoices = await Invoice.find({
      organization: organizationId,
      status: { $in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
      balanceAmount: { $gt: 0 },
    });
    
    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

    // Get top clients this month
    const startOfMonth = new Date(date);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const topClients = await Invoice.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(organizationId),
          invoiceDate: { $gte: startOfMonth, $lte: endOfDay },
        },
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientData',
        },
      },
      {
        $unwind: '$clientData',
      },
      {
        $group: {
          _id: '$client',
          name: { $first: '$clientData.companyName' },
          invoiceCount: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    const reportData = {
      date: date.toISOString(),
      totalSales,
      totalPayments,
      newInvoices,
      overdueInvoices,
      pendingAmount,
      topClients,
      summary: {
        newInvoicesCount: newInvoices.length,
        overdueCount: overdueInvoices.length,
        pendingInvoicesCount: pendingInvoices.length,
      },
    };

    return reportData;

  } catch (error) {
    console.error('Error generating daily report:', error);
    throw error;
  }
};

// Generate weekly report
export const generateWeeklyReport = async (organizationId) => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  try {
    const invoices = await Invoice.find({
      organization: organizationId,
      createdAt: { $gte: sevenDaysAgo, $lte: today },
    }).populate('client', 'companyName');

    const totalSales = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const avgInvoiceValue = invoices.length > 0 ? totalSales / invoices.length : 0;

    return {
      period: 'Last 7 Days',
      startDate: sevenDaysAgo,
      endDate: today,
      totalInvoices: invoices.length,
      totalSales,
      avgInvoiceValue,
      invoices,
    };

  } catch (error) {
    console.error('Error generating weekly report:', error);
    throw error;
  }
};