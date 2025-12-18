// ============================================
// FILE: server/services/analyticsService.js
// NEW FILE - Advanced Analytics Service
// ============================================

import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import mongoose from 'mongoose';

class AnalyticsService {
  // Get client-wise profitability
  static async getClientProfitability(organizationId, startDate, endDate) {
    try {
      const matchStage = {
        organization: new mongoose.Types.ObjectId(organizationId),
        status: { $nin: ['CANCELLED'] },
      };

      if (startDate && endDate) {
        matchStage.invoiceDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const profitability = await Invoice.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$client',
            totalInvoices: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$paidAmount' },
            totalOutstanding: { $sum: '$balanceAmount' },
            avgInvoiceValue: { $avg: '$totalAmount' },
            totalTDS: { $sum: '$tdsAmount' },
            totalDiscount: { $sum: '$discountAmount' },
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
        {
          $project: {
            client: '$clientInfo',
            totalInvoices: 1,
            totalRevenue: 1,
            totalPaid: 1,
            totalOutstanding: 1,
            avgInvoiceValue: 1,
            totalTDS: 1,
            totalDiscount: 1,
            collectionRate: {
              $cond: [
                { $eq: ['$totalRevenue', 0] },
                0,
                { $multiply: [{ $divide: ['$totalPaid', '$totalRevenue'] }, 100] },
              ],
            },
            profitMargin: {
              $subtract: ['$totalRevenue', '$totalDiscount'],
            },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]);

      return profitability;
    } catch (error) {
      console.error('Error calculating client profitability:', error);
      throw error;
    }
  }

  // Get revenue analytics
  static async getRevenueAnalytics(organizationId, startDate, endDate) {
    try {
      const matchStage = {
        organization: new mongoose.Types.ObjectId(organizationId),
        status: { $nin: ['CANCELLED'] },
      };

      if (startDate && endDate) {
        matchStage.invoiceDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const analytics = await Invoice.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$paidAmount' },
            totalOutstanding: { $sum: '$balanceAmount' },
            totalTDS: { $sum: '$tdsAmount' },
            totalDiscount: { $sum: '$discountAmount' },
            totalGST: {
              $sum: {
                $add: ['$cgstAmount', '$sgstAmount', '$igstAmount'],
              },
            },
            avgInvoiceValue: { $avg: '$totalAmount' },
            avgDaysToPayment: {
              $avg: {
                $cond: [
                  { $eq: ['$status', 'PAID'] },
                  {
                    $divide: [
                      { $subtract: ['$updatedAt', '$invoiceDate'] },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                  null,
                ],
              },
            },
          },
        },
      ]);

      // Get monthly trend
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
            paid: { $sum: '$paidAmount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      // Get status breakdown
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

      return {
        summary: analytics[0] || {},
        monthlyTrend,
        statusBreakdown,
      };
    } catch (error) {
      console.error('Error calculating revenue analytics:', error);
      throw error;
    }
  }

  // Get top clients
  static async getTopClients(organizationId, limit = 10) {
    try {
      const topClients = await Invoice.aggregate([
        {
          $match: {
            organization: new mongoose.Types.ObjectId(organizationId),
            status: { $nin: ['CANCELLED'] },
          },
        },
        {
          $group: {
            _id: '$client',
            totalRevenue: { $sum: '$totalAmount' },
            totalInvoices: { $sum: 1 },
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
        { $limit: limit },
        {
          $project: {
            client: '$clientInfo',
            totalRevenue: 1,
            totalInvoices: 1,
          },
        },
      ]);

      return topClients;
    } catch (error) {
      console.error('Error getting top clients:', error);
      throw error;
    }
  }

  // Get product/service performance
  static async getProductPerformance(organizationId, startDate, endDate) {
    try {
      const matchStage = {
        organization: new mongoose.Types.ObjectId(organizationId),
        status: { $nin: ['CANCELLED'] },
      };

      if (startDate && endDate) {
        matchStage.invoiceDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const performance = await Invoice.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              description: '$items.description',
              itemType: '$items.itemType',
            },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.amount' },
            totalDiscount: { $sum: '$items.discountAmount' },
            avgRate: { $avg: '$items.rate' },
            timesOrdered: { $sum: 1 },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 20 },
      ]);

      return performance;
    } catch (error) {
      console.error('Error calculating product performance:', error);
      throw error;
    }
  }

  // Get payment trends
  static async getPaymentTrends(organizationId, months = 6) {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const trends = await Invoice.aggregate([
        {
          $match: {
            organization: new mongoose.Types.ObjectId(organizationId),
            invoiceDate: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$invoiceDate' },
              month: { $month: '$invoiceDate' },
              status: '$status',
            },
            count: { $sum: 1 },
            amount: { $sum: '$totalAmount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      return trends;
    } catch (error) {
      console.error('Error calculating payment trends:', error);
      throw error;
    }
  }

  // Export data to Excel format (JSON structure)
  static async exportToExcel(organizationId, reportType, startDate, endDate) {
    try {
      let data = [];

      switch (reportType) {
        case 'invoices':
          data = await this.getInvoicesExport(organizationId, startDate, endDate);
          break;
        case 'clients':
          data = await this.getClientsExport(organizationId);
          break;
        case 'profitability':
          data = await this.getProfitabilityExport(organizationId, startDate, endDate);
          break;
        case 'products':
          data = await this.getProductsExport(organizationId, startDate, endDate);
          break;
        default:
          throw new Error('Invalid report type');
      }

      return data;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  static async getInvoicesExport(organizationId, startDate, endDate) {
    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
    };

    if (startDate && endDate) {
      matchStage.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const invoices = await Invoice.find(matchStage)
      .populate('client', 'companyName contactPerson email phoneNumber')
      .sort({ invoiceDate: -1 })
      .lean();

    return invoices.map((inv) => ({
      'Invoice Number': inv.invoiceNumber,
      'Client': inv.client?.companyName || 'N/A',
      'Invoice Date': new Date(inv.invoiceDate).toLocaleDateString(),
      'Due Date': new Date(inv.dueDate).toLocaleDateString(),
      'Status': inv.status,
      'Subtotal': inv.subtotalAmount,
      'Discount': inv.discountAmount,
      'GST': (inv.cgstAmount + inv.sgstAmount + inv.igstAmount),
      'TDS': inv.tdsAmount,
      'Total': inv.totalAmount,
      'Paid': inv.paidAmount,
      'Balance': inv.balanceAmount,
    }));
  }

  static async getClientsExport(organizationId) {
    const clients = await Client.find({
      organization: organizationId,
    })
      .sort({ companyName: 1 })
      .lean();

    return clients.map((client) => ({
      'Company Name': client.companyName,
      'Contact Person': client.contactPerson,
      'Email': client.email,
      'Phone': client.phoneNumber,
      'GSTIN': client.gstin,
      'Address': client.address,
      'City': client.city,
      'State': client.state,
      'Pincode': client.pincode,
    }));
  }

  static async getProfitabilityExport(organizationId, startDate, endDate) {
    const profitability = await this.getClientProfitability(
      organizationId,
      startDate,
      endDate
    );

    return profitability.map((item) => ({
      'Client': item.client?.companyName || 'N/A',
      'Total Invoices': item.totalInvoices,
      'Total Revenue': item.totalRevenue,
      'Total Paid': item.totalPaid,
      'Outstanding': item.totalOutstanding,
      'Avg Invoice Value': item.avgInvoiceValue,
      'Total Discount': item.totalDiscount,
      'Total TDS': item.totalTDS,
      'Collection Rate (%)': item.collectionRate.toFixed(2),
      'Profit Margin': item.profitMargin,
    }));
  }

  static async getProductsExport(organizationId, startDate, endDate) {
    const products = await this.getProductPerformance(organizationId, startDate, endDate);

    return products.map((item) => ({
      'Product/Service': item._id.description,
      'Type': item._id.itemType,
      'Total Quantity': item.totalQuantity,
      'Total Revenue': item.totalRevenue,
      'Total Discount': item.totalDiscount,
      'Avg Rate': item.avgRate,
      'Times Ordered': item.timesOrdered,
    }));
  }
}

export default AnalyticsService;