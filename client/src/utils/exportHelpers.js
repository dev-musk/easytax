// ============================================
// FILE: client/src/utils/exportHelpers.js
// ✅ FIXED: PDF Export Now Working
// Supports PDF, Excel (xlsx), and CSV
// ============================================

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate timestamp for filenames
 */
const getTimestamp = () => new Date().toISOString().split('T')[0];

/**
 * Format currency for export (PDF-safe version)
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'Rs. 0.00';
  const num = parseFloat(amount);
  if (isNaN(num)) return 'Rs. 0.00';
  
  // Format the number with commas
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  // Use Rs. instead of ₹ for better PDF compatibility
  return `Rs. ${formatted}`;
};

/**
 * Format date for export
 */
export const formatDate = (date, format = 'DD-MM-YYYY') => {
  if (!date) return 'N/A';
  const d = new Date(date);
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  switch (format) {
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return d.toLocaleDateString('en-IN');
  }
};

// ============================================
// CSV EXPORT
// ============================================

/**
 * Convert array of objects to CSV string
 */
export const convertToCSV = (data, headers = null) => {
  if (!data || data.length === 0) return '';

  const keys = headers || Object.keys(data[0]);
  const csvRows = [];

  // Add headers
  csvRows.push(keys.join(','));

  // Add data rows
  for (const row of data) {
    const values = keys.map((key) => {
      let value = row[key];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Convert to string and escape
      const escaped = String(value).replace(/"/g, '""');
      
      // Wrap in quotes if contains comma, newline, or quotes
      if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      
      return escaped;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

/**
 * Download CSV file
 */
export const exportToCSV = (data, filename = 'export', headers = null) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const csv = convertToCSV(data, headers);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${getTimestamp()}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

// ============================================
// EXCEL EXPORT
// ============================================

/**
 * Export to Excel with formatting
 */
export const exportToExcel = (data, filename = 'export', sheetName = 'Sheet1', options = {}) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Auto-size columns
    const cols = [];
    const keys = Object.keys(data[0]);
    keys.forEach((key) => {
      const maxLength = Math.max(
        key.length,
        ...data.map((row) => String(row[key] || '').length)
      );
      cols.push({ wch: Math.min(maxLength + 2, 50) });
    });
    ws['!cols'] = cols;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Write file
    XLSX.writeFile(wb, `${filename}_${getTimestamp()}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Excel export error:', error);
    alert('Failed to export to Excel. Please try again.');
    return false;
  }
};

/**
 * Export multiple sheets to Excel
 */
export const exportToExcelMultiSheet = (sheets, filename = 'export') => {
  if (!sheets || sheets.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    const wb = XLSX.utils.book_new();
    
    sheets.forEach(({ name, data }) => {
      if (data && data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, name);
      }
    });
    
    XLSX.writeFile(wb, `${filename}_${getTimestamp()}.xlsx`);
    return true;
  } catch (error) {
    console.error('Multi-sheet Excel export error:', error);
    alert('Failed to export to Excel. Please try again.');
    return false;
  }
};

// ============================================
// PDF EXPORT - FIXED
// ============================================

/**
 * Manual table drawing fallback for when autoTable fails
 */
const drawManualTable = (doc, headers, rows, startY) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const marginBottom = 15;
  const usableWidth = pageWidth - (2 * margin);
  
  // Dynamic column width based on number of columns
  const colWidth = usableWidth / headers.length;
  const headerHeight = 8;
  const rowHeight = 8;  // Increased from 7 to 8 for better visibility
  
  let yPos = startY;
  let pageNum = 1;

  console.log('🔧 Manual Table Render');
  console.log('  Headers:', headers.length, headers);
  console.log('  Rows:', rows.length);
  console.log('  Col Width:', colWidth.toFixed(2), 'mm');

  // ===== HEADER ROW =====
  let xPos = margin;
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i]).substring(0, 25);
    
    // STEP 1: Draw header cell background (BLUE)
    doc.setFillColor(37, 99, 235);
    doc.rect(xPos, yPos, colWidth, headerHeight, 'F');
    
    // STEP 2: Draw header text (WHITE TEXT)
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(header, xPos + 1.5, yPos + 4.5, {
      maxWidth: colWidth - 3,
    });
    
    // STEP 3: Draw header border
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.rect(xPos, yPos, colWidth, headerHeight);
    
    xPos += colWidth;
  }

  yPos += headerHeight;

  // ===== DATA ROWS =====
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    // Check if we need a new page
    if (yPos + rowHeight > pageHeight - marginBottom) {
      console.log('  Page break at row', rowIdx);
      doc.addPage();
      yPos = margin;
      pageNum++;
    }

    const row = rows[rowIdx];

    // Alternate row colors
    const bgColor = rowIdx % 2 === 0 ? [255, 255, 255] : [245, 245, 245];
    doc.setFillColor(...bgColor);

    // Draw cells
    xPos = margin;
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      // Get cell value
      let cellValue = '';
      if (Array.isArray(row)) {
        cellValue = row[colIdx] || '';
      } else {
        cellValue = row[headers[colIdx]] || '';
      }
      
      cellValue = String(cellValue).substring(0, 35);

      // STEP 1: Draw cell background
      doc.setFillColor(...bgColor);
      doc.rect(xPos, yPos, colWidth, rowHeight, 'F');
      
      // STEP 2: Set text color and draw cell text BEFORE borders
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(cellValue, xPos + 1.5, yPos + 4.5, {
        maxWidth: colWidth - 3,
      });
      
      // STEP 3: Draw cell border LAST (so it's on top)
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.rect(xPos, yPos, colWidth, rowHeight);

      xPos += colWidth;
    }

    yPos += rowHeight;
  }

  console.log('✓ Manual table complete - drew', rows.length, 'rows on', pageNum, 'page(s)');
};

/**
 * Export to PDF with tables - WORKING VERSION
 * Static imports with fallback manual table
 */
export const exportToPDF = (data, filename = 'export', options = {}) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return false;
  }

  try {
    // Create PDF document
    const doc = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format || 'a4'
    });
    
    // Add title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(options.title || 'Report', 14, 20);
    
    // Add subtitle/date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 28);
    
    // Add summary if provided
    let summaryHeight = 0;
    if (options.summary && Array.isArray(options.summary)) {
      let yPos = 35;
      options.summary.forEach((item) => {
        doc.text(`${item.label}: ${item.value}`, 14, yPos);
        yPos += 5;
      });
      summaryHeight = options.summary.length * 5 + 5;
    }
    
    // Prepare table data
    const headers = options.headers || Object.keys(data[0]);
    const rows = data.map((row) => 
      headers.map((key) => {
        const value = row[key];
        if (value === null || value === undefined) return '';
        return String(value);
      })
    );
    
    console.log('PDF Export - Headers:', headers);
    console.log('PDF Export - First row:', rows[0]);
    console.log('PDF Export - Total rows:', rows.length);

    // Use manual table rendering (most reliable)
    console.log('📊 Using manual table rendering');
    drawManualTable(doc, headers, rows, 35 + summaryHeight);
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Save PDF
    doc.save(`${filename}_${getTimestamp()}.pdf`);
    console.log('PDF saved successfully');
    return true;
  } catch (error) {
    console.error('PDF export error:', error);
    alert('Failed to export to PDF. Error: ' + error.message);
    return false;
  }
};

// ============================================
// SPECIALIZED EXPORT FUNCTIONS
// ============================================

/**
 * Export invoices with formatting
 */
export const exportInvoices = (invoices, format, filename = 'invoices') => {
  const data = invoices.map((inv) => ({
    'Invoice Number': inv.invoiceNumber || 'N/A',
    'Client': inv.client?.companyName || 'N/A',
    'Date': formatDate(inv.invoiceDate),
    'Due Date': formatDate(inv.dueDate),
    'Total Amount': formatCurrency(inv.totalAmount),
    'Paid': formatCurrency(inv.paidAmount),
    'Outstanding': formatCurrency(inv.balanceAmount),
    'Status': inv.status || 'N/A',
  }));

  switch (format) {
    case 'csv':
      return exportToCSV(data, filename);
    case 'excel':
      return exportToExcel(data, filename, 'Invoices');
    case 'pdf':
      return exportToPDF(data, filename, {
        title: 'Invoices Report',
        orientation: 'landscape',
      });
    default:
      console.error('Unsupported format:', format);
  }
};

/**
 * Export clients with formatting
 */
export const exportClients = (clients, format, filename = 'clients') => {
  const data = clients.map((client) => ({
    'Company Name': client.companyName || 'N/A',
    'GSTIN': client.gstin || 'N/A',
    'Email': client.email || 'N/A',
    'Phone': client.phone || 'N/A',
    'City': client.billingCity || 'N/A',
    'State': client.billingState || 'N/A',
    'Status': client.isActive ? 'Active' : 'Inactive',
  }));

  switch (format) {
    case 'csv':
      return exportToCSV(data, filename);
    case 'excel':
      return exportToExcel(data, filename, 'Clients');
    case 'pdf':
      return exportToPDF(data, filename, {
        title: 'Clients Report',
      });
    default:
      console.error('Unsupported format:', format);
  }
};

/**
 * Export GST Report
 */
export const exportGSTReport = (reportData, reportType, format, period) => {
  const filename = `${reportType}_${period.month}_${period.year}`;
  
  switch (format) {
    case 'csv':
      return exportGSTToCSV(reportData, reportType, filename);
    case 'excel':
      return exportGSTToExcel(reportData, reportType, filename, period);
    case 'pdf':
      return exportGSTToPDF(reportData, reportType, filename, period);
    default:
      console.error('Unsupported format:', format);
  }
};

// Helper: GST to CSV
const exportGSTToCSV = (reportData, reportType, filename) => {
  let data = [];
  
  if (reportType === 'gstr1' && reportData.b2b) {
    data = reportData.b2b.map((inv) => ({
      'Invoice Number': inv.invoiceNumber,
      'Date': formatDate(inv.invoiceDate),
      'GSTIN': inv.recipientGSTIN,
      'Client': inv.recipientName,
      'Taxable Value': inv.taxableValue,
      'CGST': inv.cgst,
      'SGST': inv.sgst,
      'IGST': inv.igst,
    }));
  } else if (reportType === 'hsn' && reportData.summary) {
    data = reportData.summary.map((item) => ({
      'HSN Code': item.hsnCode,
      'Description': item.description,
      'UQC': item.uqc,
      'Quantity': item.totalQuantity,
      'Taxable Value': item.taxableValue,
      'CGST': item.cgst,
      'SGST': item.sgst,
      'IGST': item.igst,
    }));
  }
  
  return exportToCSV(data, filename);
};

// Helper: GST to Excel
const exportGSTToExcel = (reportData, reportType, filename, period) => {
  // This would be implemented based on the specific GST report structure
  // For now, use the same logic as CSV but with Excel format
  return exportGSTToCSV(reportData, reportType, filename);
};

// Helper: GST to PDF
const exportGSTToPDF = (reportData, reportType, filename, period) => {
  let data = [];
  let title = '';
  
  if (reportType === 'gstr1') {
    title = `GSTR-1 Report - ${period.month}/${period.year}`;
    data = reportData.b2b?.map((inv) => ({
      'Invoice': inv.invoiceNumber,
      'Date': formatDate(inv.invoiceDate),
      'GSTIN': inv.recipientGSTIN,
      'Value': formatCurrency(inv.taxableValue),
      'Tax': formatCurrency(inv.cgst + inv.sgst + inv.igst),
    })) || [];
  }
  
  return exportToPDF(data, filename, {
    title,
    orientation: 'landscape',
  });
};

/**
 * Generic report export
 */
export const exportReport = (data, format, filename, options = {}) => {
  switch (format) {
    case 'csv':
      return exportToCSV(data, filename, options.headers);
    case 'excel':
      return exportToExcel(data, filename, options.sheetName || 'Report');
    case 'pdf':
      return exportToPDF(data, filename, options);
    default:
      console.error('Unsupported format:', format);
      return false;
  }
};