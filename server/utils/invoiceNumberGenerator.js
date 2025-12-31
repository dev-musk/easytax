/**
 * ============================================
 * FILE: server/utils/invoiceNumberGenerator.js
 * Invoice Number Generator Utility
 * Handles auto-generation, validation, and financial year tracking
 * ============================================
 */

/**
 * Get current financial year (April to March)
 * @returns {string} Financial year in format FY2024-25
 */
export const getCurrentFinancialYear = () => {
  const today = new Date();
  const month = today.getMonth() + 1; // 1-12
  const year = today.getFullYear();
  
  if (month >= 4) {
    // April onwards: FY2024-25
    return `FY${year}-${String(year + 1).slice(-2)}`;
  } else {
    // Jan-Mar: FY2023-24
    return `FY${year - 1}-${String(year).slice(-2)}`;
  }
};

/**
 * Get financial year for a specific date
 * @param {Date} date - Date to check
 * @returns {string} Financial year
 */
export const getFinancialYearForDate = (date) => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  if (month >= 4) {
    return `FY${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `FY${year - 1}-${String(year).slice(-2)}`;
  }
};

/**
 * Generate invoice number in auto mode
 * @param {string} organizationId - Organization ID
 * @param {Model} Organization - Organization model
 * @returns {Promise<Object>} Invoice number data
 */
export const generateInvoiceNumber = async (organizationId, Organization) => {
  const org = await Organization.findById(organizationId);
  
  if (!org) {
    throw new Error('Organization not found');
  }

  const currentFY = getCurrentFinancialYear();
  
  // Get sequence number for current FY
  const invoiceNumbersByFY = org.invoiceNumbersByFY || new Map();
  let sequenceNum = invoiceNumbersByFY.get(currentFY) || 0;
  sequenceNum += 1;

  // Generate invoice number based on format
  let invoiceNumber = org.invoiceNumberFormat || '{PREFIX}-{FY}-{SEQ}';
  
  // Get GSTIN state code if needed
  const gstinStateCode = org.gstin ? org.gstin.substring(0, 2) : '00';
  
  // Get date parts
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  // Replace placeholders
  invoiceNumber = invoiceNumber
    .replace('{PREFIX}', org.invoicePrefix || 'INV')
    .replace('{FY}', currentFY.replace('FY', ''))
    .replace('{YEAR}', year)
    .replace('{YY}', year.slice(-2))
    .replace('{MONTH}', month)
    .replace('{MM}', month)
    .replace('{DAY}', day)
    .replace('{DD}', day)
    .replace('{SEQ}', String(sequenceNum).padStart(5, '0'))
    .replace('{GSTIN_STATE}', gstinStateCode);

  // Validate length
  if (invoiceNumber.length > 16) {
    throw new Error(
      `Generated invoice number exceeds 16 characters: ${invoiceNumber} (${invoiceNumber.length} chars). ` +
      `Please simplify your invoice number format in organization settings.`
    );
  }

  return {
    invoiceNumber,
    currentFY,
    sequenceNum,
  };
};

/**
 * Validate manual invoice number
 * @param {string} invoiceNumber - Invoice number to validate
 * @param {string} organizationId - Organization ID
 * @param {Model} Invoice - Invoice model
 * @param {string} excludeInvoiceId - Invoice ID to exclude from duplicate check (for updates)
 * @returns {Promise<Object>} Validation result
 */
export const validateManualInvoiceNumber = async (
  invoiceNumber,
  organizationId,
  Invoice,
  excludeInvoiceId = null
) => {
  // Check if provided
  if (!invoiceNumber || invoiceNumber.trim().length === 0) {
    throw new Error('Invoice number is required');
  }

  const trimmedNumber = invoiceNumber.trim();

  // Check length
  if (trimmedNumber.length > 16) {
    throw new Error(
      `Invoice number must be 16 characters or less (current: ${trimmedNumber.length}). ` +
      `GST portal rejects invoice numbers exceeding 16 characters.`
    );
  }

  // Check for invalid characters
  if (!/^[A-Za-z0-9\-\/]+$/.test(trimmedNumber)) {
    throw new Error(
      'Invoice number can only contain letters, numbers, hyphens, and forward slashes'
    );
  }

  // Check for duplicate
  const query = {
    organization: organizationId,
    invoiceNumber: trimmedNumber,
  };

  if (excludeInvoiceId) {
    query._id = { $ne: excludeInvoiceId };
  }

  const existingInvoice = await Invoice.findOne(query);

  if (existingInvoice) {
    throw new Error(
      `Invoice number "${trimmedNumber}" already exists. ` +
      `GST portal and IRN generation will fail with duplicate invoice numbers.`
    );
  }

  return {
    valid: true,
    invoiceNumber: trimmedNumber,
  };
};

/**
 * Update sequence number after successful invoice creation
 * @param {string} organizationId - Organization ID
 * @param {string} currentFY - Current financial year
 * @param {number} sequenceNum - Sequence number
 * @param {Model} Organization - Organization model
 */
export const updateInvoiceSequence = async (
  organizationId,
  currentFY,
  sequenceNum,
  Organization
) => {
  await Organization.findByIdAndUpdate(
    organizationId,
    {
      $set: {
        [`invoiceNumbersByFY.${currentFY}`]: sequenceNum,
        currentFinancialYear: currentFY,
      },
    }
  );
};

/**
 * Preview invoice number without saving
 * @param {string} organizationId - Organization ID
 * @param {Model} Organization - Organization model
 * @returns {Promise<Object>} Preview data
 */
export const previewInvoiceNumber = async (organizationId, Organization) => {
  const org = await Organization.findById(organizationId);
  
  if (!org) {
    throw new Error('Organization not found');
  }

  const currentFY = getCurrentFinancialYear();
  const invoiceNumbersByFY = org.invoiceNumbersByFY || new Map();
  const nextSequenceNum = (invoiceNumbersByFY.get(currentFY) || 0) + 1;

  // Generate preview
  let invoiceNumber = org.invoiceNumberFormat || '{PREFIX}-{FY}-{SEQ}';
  const gstinStateCode = org.gstin ? org.gstin.substring(0, 2) : '00';
  
  invoiceNumber = invoiceNumber
    .replace('{PREFIX}', org.invoicePrefix || 'INV')
    .replace('{FY}', currentFY.replace('FY', ''))
    .replace('{YEAR}', new Date().getFullYear().toString())
    .replace('{YY}', new Date().getFullYear().toString().slice(-2))
    .replace('{MONTH}', String(new Date().getMonth() + 1).padStart(2, '0'))
    .replace('{SEQ}', String(nextSequenceNum).padStart(5, '0'))
    .replace('{GSTIN_STATE}', gstinStateCode);

  return {
    preview: invoiceNumber,
    currentFY,
    nextSequenceNum,
    format: org.invoiceNumberFormat,
    length: invoiceNumber.length,
    valid: invoiceNumber.length <= 16,
  };
};

/**
 * Reset sequence for a financial year (admin only)
 * @param {string} organizationId - Organization ID
 * @param {string} financialYear - Financial year to reset
 * @param {number} startFrom - Starting sequence number
 * @param {Model} Organization - Organization model
 */
export const resetFinancialYearSequence = async (
  organizationId,
  financialYear,
  startFrom = 0,
  Organization
) => {
  await Organization.findByIdAndUpdate(
    organizationId,
    {
      $set: {
        [`invoiceNumbersByFY.${financialYear}`]: startFrom,
      },
    }
  );

  return {
    message: `Sequence reset for ${financialYear}`,
    financialYear,
    startFrom,
  };
};

export default {
  getCurrentFinancialYear,
  getFinancialYearForDate,
  generateInvoiceNumber,
  validateManualInvoiceNumber,
  updateInvoiceSequence,
  previewInvoiceNumber,
  resetFinancialYearSequence,
};