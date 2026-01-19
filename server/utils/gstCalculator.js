/**
 * ============================================
 * FILE: server/utils/gstCalculator.js (ENHANCED)
 * GST Calculation Utility with State Detection
 * Handles CGST/SGST/IGST split, state validation
 * ============================================
 */

/**
 * Complete Indian state codes mapping (as per GST system)
 */
export const STATE_CODES = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

/**
 * Get state code from GSTIN (first 2 digits)
 * @param {string} gstin - GSTIN number
 * @returns {string|null} State code or null
 */
export const getStateCodeFromGSTIN = (gstin) => {
  if (!gstin || gstin.length < 2) return null;
  return gstin.substring(0, 2);
};

/**
 * Get state name from state code
 * @param {string} stateCode - Two-digit state code
 * @returns {string|null} State name or null
 */
export const getStateName = (stateCode) => {
  return STATE_CODES[stateCode] || null;
};

/**
 * Validate GSTIN format and extract components
 * @param {string} gstin - GSTIN to validate
 * @returns {Object|null} GSTIN components or null
 */
export const validateAndExtractGSTIN = (gstin) => {
  if (!gstin) return null;
  
  // GSTIN format: 27AABCU9603R1Z5
  // Pattern: [State Code (2)][PAN (10)][Entity Number (1)][Z][Checksum (1)]
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstinRegex.test(gstin)) {
    return null;
  }
  
  const stateCode = gstin.substring(0, 2);
  const stateName = STATE_CODES[stateCode];
  
  if (!stateName) {
    return null;
  }
  
  return {
    gstin,
    stateCode,
    stateName,
    panNumber: gstin.substring(2, 12),
    entityNumber: gstin.substring(12, 13),
    zChar: gstin.substring(13, 14),
    checksum: gstin.substring(14, 15),
    isValid: true,
  };
};

/**
 * Determine transaction type based on GSTINs
 * @param {string} clientGSTIN - Client GSTIN
 * @param {string} organizationGSTIN - Organization GSTIN
 * @returns {Object} Transaction type information
 */
export const determineTransactionType = (clientGSTIN, organizationGSTIN) => {
  const orgInfo = validateAndExtractGSTIN(organizationGSTIN);
  
  if (!orgInfo) {
    throw new Error('Invalid organization GSTIN format');
  }

  // B2C (Unregistered customer)
  if (!clientGSTIN) {
    return {
      type: 'B2C',
      description: 'Business to Consumer (Unregistered)',
      isInterstate: false,
      gstSplit: 'CGST+SGST',
      orgState: orgInfo.stateName,
      clientState: 'Unregistered',
    };
  }

  const clientInfo = validateAndExtractGSTIN(clientGSTIN);
  
  if (!clientInfo) {
    throw new Error('Invalid client GSTIN format');
  }

  // Same state (Intra-state)
  if (clientInfo.stateCode === orgInfo.stateCode) {
    return {
      type: 'B2B_INTRASTATE',
      description: 'Business to Business (Same State)',
      isInterstate: false,
      gstSplit: 'CGST+SGST',
      orgState: orgInfo.stateName,
      clientState: clientInfo.stateName,
    };
  }

  // Different state (Inter-state)
  return {
    type: 'B2B_INTERSTATE',
    description: 'Business to Business (Different State)',
    isInterstate: true,
    gstSplit: 'IGST',
    orgState: orgInfo.stateName,
    clientState: clientInfo.stateName,
  };
};

/**
 * Calculate item-level GST breakdown
 * @param {Object} item - Invoice item
 * @param {boolean} isInterstate - Is interstate transaction
 * @returns {Object} Item with GST breakdown
 */
const calculateItemGST = (item, isInterstate) => {
  // Base calculation
  const baseAmount = item.quantity * item.rate;
  
  // Item-level discount
  let itemDiscountAmount = 0;
  if (item.discountType === 'PERCENTAGE') {
    itemDiscountAmount = (baseAmount * (item.discountValue || 0)) / 100;
  } else if (item.discountType === 'FIXED') {
    itemDiscountAmount = item.discountValue || 0;
  }

  const taxableAmount = baseAmount - itemDiscountAmount;
  const gstAmount = (taxableAmount * (item.gstRate || 0)) / 100;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterstate) {
    // Interstate: 100% IGST
    igst = gstAmount;
  } else {
    // Intrastate: 50% CGST + 50% SGST
    cgst = gstAmount / 2;
    sgst = gstAmount / 2;
  }

  return {
    ...item,
    baseAmount: parseFloat(baseAmount.toFixed(2)),
    discountAmount: parseFloat(itemDiscountAmount.toFixed(2)),
    taxableAmount: parseFloat(taxableAmount.toFixed(2)),
    gstAmount: parseFloat(gstAmount.toFixed(2)),
    cgst: parseFloat(cgst.toFixed(2)),
    sgst: parseFloat(sgst.toFixed(2)),
    igst: parseFloat(igst.toFixed(2)),
    totalAmount: parseFloat((taxableAmount + gstAmount).toFixed(2)),
  };
};

/**
 * Calculate complete GST breakdown for invoice
 * @param {Array} items - Invoice items
 * @param {string} clientGSTIN - Client GSTIN (optional for B2C)
 * @param {string} organizationGSTIN - Organization GSTIN (required)
 * @returns {Object} Complete GST breakdown
 */
export const calculateGSTBreakdown = (items, clientGSTIN, organizationGSTIN) => {
  // Validate inputs
  if (!organizationGSTIN) {
    throw new Error('Organization GSTIN is required for GST calculation');
  }

  if (!items || items.length === 0) {
    throw new Error('At least one item is required for GST calculation');
  }

  // Determine transaction type
  const transactionInfo = determineTransactionType(clientGSTIN, organizationGSTIN);
  
  console.log('=== GST Calculation ===');
  console.log('Transaction Type:', transactionInfo.type);
  console.log('Organization State:', transactionInfo.orgState);
  console.log('Client State:', transactionInfo.clientState);
  console.log('GST Split:', transactionInfo.gstSplit);
  console.log('=======================');

  // Calculate GST for each item
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  let totalTaxableAmount = 0;

  const itemsWithGST = items.map((item, index) => {
    const calculatedItem = calculateItemGST(item, transactionInfo.isInterstate);
    
    totalCGST += calculatedItem.cgst;
    totalSGST += calculatedItem.sgst;
    totalIGST += calculatedItem.igst;
    totalTaxableAmount += calculatedItem.taxableAmount;

    return calculatedItem;
  });

  return {
    items: itemsWithGST,
    totals: {
      taxableAmount: parseFloat(totalTaxableAmount.toFixed(2)),
      cgst: parseFloat(totalCGST.toFixed(2)),
      sgst: parseFloat(totalSGST.toFixed(2)),
      igst: parseFloat(totalIGST.toFixed(2)),
      totalTax: parseFloat((totalCGST + totalSGST + totalIGST).toFixed(2)),
    },
    transactionInfo,
    // Legacy fields for backward compatibility
    totalCGST: parseFloat(totalCGST.toFixed(2)),
    totalSGST: parseFloat(totalSGST.toFixed(2)),
    totalIGST: parseFloat(totalIGST.toFixed(2)),
    totalTax: parseFloat((totalCGST + totalSGST + totalIGST).toFixed(2)),
    isInterstate: transactionInfo.isInterstate,
    clientStateCode: getStateCodeFromGSTIN(clientGSTIN),
    orgStateCode: getStateCodeFromGSTIN(organizationGSTIN),
  };
};

/**
 * Validate GST calculation for an invoice
 * @param {Object} invoice - Invoice object
 * @returns {Object} Validation result
 */
export const validateGSTCalculation = (invoice) => {
  const errors = [];
  const warnings = [];

  // Check if GST totals match item-wise GST
  const itemsGSTSum = invoice.items.reduce((sum, item) => {
    return sum + (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
  }, 0);

  const invoiceGSTSum = (invoice.cgst || 0) + (invoice.sgst || 0) + (invoice.igst || 0);

  if (Math.abs(itemsGSTSum - invoiceGSTSum) > 0.01) {
    errors.push(`GST mismatch: Items sum (₹${itemsGSTSum.toFixed(2)}) != Invoice total (₹${invoiceGSTSum.toFixed(2)})`);
  }

  // Check CGST/SGST vs IGST consistency
  if (invoice.isInterstate) {
    if (invoice.cgst > 0 || invoice.sgst > 0) {
      errors.push('Interstate transaction should not have CGST/SGST');
    }
  } else {
    if (invoice.igst > 0) {
      errors.push('Intra-state transaction should not have IGST');
    }
    if (Math.abs(invoice.cgst - invoice.sgst) > 0.01) {
      warnings.push('CGST and SGST should be equal in intra-state transactions');
    }
  }

  // Check HSN/SAC codes
  invoice.items.forEach((item, index) => {
    if (!item.hsnSacCode) {
      warnings.push(`Item ${index + 1} (${item.description}) is missing HSN/SAC code`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    itemsGSTSum: parseFloat(itemsGSTSum.toFixed(2)),
    invoiceGSTSum: parseFloat(invoiceGSTSum.toFixed(2)),
  };
};

/**
 * Calculate reverse charge mechanism GST
 * (For specific scenarios where buyer pays GST)
 * @param {Object} params - RCM parameters
 * @returns {Object} RCM GST breakdown
 */
export const calculateReverseChargeGST = (params) => {
  const { amount, gstRate, isInterstate } = params;

  const gstAmount = (amount * gstRate) / 100;

  if (isInterstate) {
    return {
      igst: parseFloat(gstAmount.toFixed(2)),
      cgst: 0,
      sgst: 0,
      totalGST: parseFloat(gstAmount.toFixed(2)),
      reverseCharge: true,
    };
  } else {
    const halfGST = gstAmount / 2;
    return {
      cgst: parseFloat(halfGST.toFixed(2)),
      sgst: parseFloat(halfGST.toFixed(2)),
      igst: 0,
      totalGST: parseFloat(gstAmount.toFixed(2)),
      reverseCharge: true,
    };
  }
};

export default {
  STATE_CODES,
  getStateCodeFromGSTIN,
  getStateName,
  validateAndExtractGSTIN,
  determineTransactionType,
  calculateGSTBreakdown,
  validateGSTCalculation,
  calculateReverseChargeGST,
};