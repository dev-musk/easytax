// ============================================
// FILE: server/utils/gstCalculator.js
// NEW FILE - Create this
// ============================================

/**
 * Get state code from GSTIN (first 2 digits)
 */
export const getStateCodeFromGSTIN = (gstin) => {
  if (!gstin || gstin.length < 2) return null;
  return gstin.substring(0, 2);
};

/**
 * State code to state name mapping
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
};

/**
 * Calculate GST breakdown for invoice
 */
export const calculateGSTBreakdown = (items, clientGSTIN, organizationGSTIN) => {
  // Get state codes
  const clientStateCode = getStateCodeFromGSTIN(clientGSTIN);
  const orgStateCode = getStateCodeFromGSTIN(organizationGSTIN);

  // Determine if interstate or intrastate
  const isInterstate = clientStateCode !== orgStateCode;

  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  // Calculate GST for each item
  const itemsWithGST = items.map((item) => {
    const itemAmount = item.quantity * item.rate;
    const gstAmount = (itemAmount * item.gstRate) / 100;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterstate) {
      // Interstate: 100% IGST
      igst = gstAmount;
      totalIGST += igst;
    } else {
      // Intrastate: 50% CGST + 50% SGST
      cgst = gstAmount / 2;
      sgst = gstAmount / 2;
      totalCGST += cgst;
      totalSGST += sgst;
    }

    return {
      ...item,
      amount: itemAmount,
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      igst: parseFloat(igst.toFixed(2)),
      total: parseFloat((itemAmount + gstAmount).toFixed(2)),
    };
  });

  return {
    items: itemsWithGST,
    totalCGST: parseFloat(totalCGST.toFixed(2)),
    totalSGST: parseFloat(totalSGST.toFixed(2)),
    totalIGST: parseFloat(totalIGST.toFixed(2)),
    totalTax: parseFloat((totalCGST + totalSGST + totalIGST).toFixed(2)),
    isInterstate,
  };
};