// ============================================
// FILE: server/services/analyticsService.js
// CORRECTED - Advanced Analytics Service
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
                $add: [
                  { $ifNull: ['$cgst', 0] },
                  { $ifNull: ['$sgst', 0] },
                  { $ifNull: ['$igst', 0] }
                ],
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
            totalPaid: { $sum: '$paidAmount' },
            totalOutstanding: { $sum: '$balanceAmount' },
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
            totalPaid: 1,
            totalOutstanding: 1,
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
            totalDiscount: { $sum: { $ifNull: ['$items.discountAmount', 0] } },
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
      'Invoice Date': new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
      'Due Date': new Date(inv.dueDate).toLocaleDateString('en-IN'),
      'Status': inv.status,
      'Subtotal': inv.subtotal || 0,
      'Discount': inv.discountAmount || 0,
      'CGST': inv.cgst || 0,
      'SGST': inv.sgst || 0,
      'IGST': inv.igst || 0,
      'Total GST': (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0),
      'TDS': inv.tdsAmount || 0,
      'Total': inv.totalAmount,
      'Paid': inv.paidAmount || 0,
      'Balance': inv.balanceAmount || inv.totalAmount,
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
      'GSTIN': client.gstin || 'N/A',
      'PAN': client.pan || 'N/A',
      'CIN': client.cin || 'N/A',
      'Address': client.address,
      'City': client.city,
      'State': client.state,
      'Pincode': client.pincode,
      'GST Treatment': client.gstTreatment || 'N/A',
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
      'Total Revenue': item.totalRevenue.toFixed(2),
      'Total Paid': item.totalPaid.toFixed(2),
      'Outstanding': item.totalOutstanding.toFixed(2),
      'Avg Invoice Value': item.avgInvoiceValue.toFixed(2),
      'Total Discount': item.totalDiscount.toFixed(2),
      'Total TDS': item.totalTDS.toFixed(2),
      'Collection Rate (%)': item.collectionRate.toFixed(2),
      'Profit Margin': item.profitMargin.toFixed(2),
    }));
  }

  static async getProductsExport(organizationId, startDate, endDate) {
    const products = await this.getProductPerformance(organizationId, startDate, endDate);

    return products.map((item) => ({
      'Product/Service': item._id.description,
      'Type': item._id.itemType,
      'Total Quantity': item.totalQuantity.toFixed(2),
      'Total Revenue': item.totalRevenue.toFixed(2),
      'Total Discount': item.totalDiscount.toFixed(2),
      'Avg Rate': item.avgRate.toFixed(2),
      'Times Ordered': item.timesOrdered,
    }));
  }
}

export default AnalyticsService;