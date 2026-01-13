// ============================================
// FILE: client/src/utils/exportHelpers.js
// Export utilities for CSV, Excel, PDF
// ============================================

/**
 * Convert array of objects to CSV string
 */
export const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      const escaped = ('' + value).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

/**
 * Download file helper
 */
const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Export data to CSV
 */
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const csv = convertToCSV(data);
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
};

/**
 * Export data to Excel (using xlsx library)
 * Install: npm install xlsx
 */
export const exportToExcel = async (data, filename = 'export.xlsx') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    // Dynamically import xlsx to avoid bundle bloat
    const XLSX = await import('xlsx');
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    // Write file
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Excel export error:', error);
    alert('Failed to export to Excel. Please install xlsx library: npm install xlsx');
  }
};

/**
 * Export data to PDF (using jspdf)
 * Install: npm install jspdf jspdf-autotable
 */
export const exportToPDF = async (data, filename = 'export.pdf', title = 'Report') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    // Dynamically import jspdf
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);
    
    // Prepare table data
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((key) => row[key]));
    
    // Add table
    doc.autoTable({
      startY: 35,
      head: [headers],
      body: rows,
      theme: 'striped',
      headStyles: {
        fillColor: [37, 99, 235], // Blue
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
      },
    });
    
    // Save PDF
    doc.save(filename);
  } catch (error) {
    console.error('PDF export error:', error);
    alert('Failed to export to PDF. Please install: npm install jspdf jspdf-autotable');
  }
};

/**
 * Export invoices data
 */
export const exportInvoices = (invoices, format = 'csv') => {
  const data = invoices.map((inv) => ({
    'Invoice Number': inv.invoiceNumber,
    'Client': inv.client?.companyName || 'N/A',
    'Date': new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
    'Amount': inv.totalAmount,
    'Status': inv.status,
    'Paid': inv.paidAmount,
    'Balance': inv.balanceAmount,
  }));

  const timestamp = new Date().toISOString().split('T')[0];
  
  switch (format) {
    case 'csv':
      exportToCSV(data, `invoices_${timestamp}.csv`);
      break;
    case 'excel':
      exportToExcel(data, `invoices_${timestamp}.xlsx`);
      break;
    case 'pdf':
      exportToPDF(data, `invoices_${timestamp}.pdf`, 'Invoices Report');
      break;
    default:
      console.error('Unsupported format:', format);
  }
};

/**
 * Export clients data
 */
export const exportClients = (clients, format = 'csv') => {
  const data = clients.map((client) => ({
    'Company Name': client.companyName,
    'GSTIN': client.gstin || 'N/A',
    'Email': client.email || 'N/A',
    'Phone': client.phone || 'N/A',
    'City': client.billingCity || 'N/A',
    'State': client.billingState || 'N/A',
    'Status': client.isActive ? 'Active' : 'Inactive',
  }));

  const timestamp = new Date().toISOString().split('T')[0];
  
  switch (format) {
    case 'csv':
      exportToCSV(data, `clients_${timestamp}.csv`);
      break;
    case 'excel':
      exportToExcel(data, `clients_${timestamp}.xlsx`);
      break;
    case 'pdf':
      exportToPDF(data, `clients_${timestamp}.pdf`, 'Clients Report');
      break;
    default:
      console.error('Unsupported format:', format);
  }
};

/**
 * Export products data
 */
export const exportProducts = (products, format = 'csv') => {
  const data = products.map((product) => ({
    'Name': product.name,
    'Type': product.type,
    'Rate': product.rate,
    'GST Rate': product.gstRate + '%',
    'HSN/SAC': product.hsnSacCode || 'N/A',
    'Unit': product.unit,
    'Stock': product.currentStock || 'N/A',
    'Status': product.isActive ? 'Active' : 'Inactive',
  }));

  const timestamp = new Date().toISOString().split('T')[0];
  
  switch (format) {
    case 'csv':
      exportToCSV(data, `products_${timestamp}.csv`);
      break;
    case 'excel':
      exportToExcel(data, `products_${timestamp}.xlsx`);
      break;
    case 'pdf':
      exportToPDF(data, `products_${timestamp}.pdf`, 'Products Report');
      break;
    default:
      console.error('Unsupported format:', format);
  }
};

/**
 * Export analytics/profitability data
 */
export const exportAnalytics = (analyticsData, reportType, format = 'csv') => {
  let data = [];
  let filename = '';

  switch (reportType) {
    case 'revenue':
      data = analyticsData.map((item) => ({
        'Month': item.month,
        'Revenue': item.revenue,
        'Paid': item.paid,
        'Outstanding': item.outstanding,
        'Invoices': item.invoices,
      }));
      filename = 'revenue_report';
      break;
    
    case 'profitability':
      data = analyticsData.map((item) => ({
        'Client': item.client?.companyName || 'N/A',
        'Revenue': item.totalRevenue,
        'Cost': item.totalCost || 0,
        'Profit': (item.totalRevenue - (item.totalCost || 0)),
        'Margin': ((item.totalRevenue - (item.totalCost || 0)) / item.totalRevenue * 100).toFixed(2) + '%',
        'Invoices': item.totalInvoices,
      }));
      filename = 'profitability_report';
      break;
    
    default:
      console.error('Unknown report type:', reportType);
      return;
  }

  const timestamp = new Date().toISOString().split('T')[0];
  
  switch (format) {
    case 'csv':
      exportToCSV(data, `${filename}_${timestamp}.csv`);
      break;
    case 'excel':
      exportToExcel(data, `${filename}_${timestamp}.xlsx`);
      break;
    case 'pdf':
      exportToPDF(data, `${filename}_${timestamp}.pdf`, `${reportType} Report`);
      break;
    default:
      console.error('Unsupported format:', format);
  }
};

/**
 * Format currency for export
 */
export const formatCurrency = (amount) => {
  return `₹${amount?.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format date for export
 */
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};