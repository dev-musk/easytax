/**
 * ============================================
 * FILE: server/utils/numberToWords.js
 * Convert numbers to Indian rupees in words
 * Supports crore, lakh, thousand system
 * ============================================
 */

/**
 * Convert a two-digit number to words
 * @param {number} n - Number to convert (0-99)
 * @returns {string} Words
 */
const convertTwoDigit = (n) => {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'
  ];
  const teens = [
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 
    'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  if (n < 10) {
    return ones[n];
  } else if (n < 20) {
    return teens[n - 10];
  } else {
    const tenDigit = Math.floor(n / 10);
    const oneDigit = n % 10;
    return tens[tenDigit] + (oneDigit > 0 ? ' ' + ones[oneDigit] : '');
  }
};

/**
 * Convert integer number to Indian rupees in words
 * @param {number} num - Number to convert
 * @returns {string} Number in words
 */
export const numberToWords = (num) => {
  if (num === 0) return 'Zero Rupees Only';
  
  // Handle negative numbers
  if (num < 0) {
    return 'Minus ' + numberToWords(Math.abs(num));
  }

  // Round to nearest integer
  num = Math.floor(num);

  // Indian numbering system breakdown
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const remainder = Math.floor(num % 100);

  let words = '';

  // Crores
  if (crore > 0) {
    if (crore > 99) {
      // For very large numbers, handle recursively
      words += numberToWords(crore).replace(' Rupees Only', '') + ' Crore ';
    } else {
      words += convertTwoDigit(crore) + ' Crore ';
    }
  }

  // Lakhs
  if (lakh > 0) {
    words += convertTwoDigit(lakh) + ' Lakh ';
  }

  // Thousands
  if (thousand > 0) {
    words += convertTwoDigit(thousand) + ' Thousand ';
  }

  // Hundreds
  if (hundred > 0) {
    words += convertTwoDigit(hundred) + ' Hundred ';
  }

  // Remainder (0-99)
  if (remainder > 0) {
    if (words.length > 0) {
      words += 'and ';
    }
    words += convertTwoDigit(remainder) + ' ';
  }

  return words.trim() + ' Rupees Only';
};

/**
 * Convert amount with decimal to words (including paise)
 * @param {number} amount - Amount to convert
 * @returns {string} Amount in words
 */
export const amountToWords = (amount) => {
  // Round to 2 decimal places
  amount = Math.round(amount * 100) / 100;

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let words = numberToWords(rupees);

  if (paise > 0) {
    words = words.replace(' Only', '') + 
            ' and ' + 
            convertTwoDigit(paise) + 
            ' Paise Only';
  }

  return words;
};

/**
 * Convert amount to words without "Rupees Only"
 * @param {number} amount - Amount to convert
 * @returns {string} Amount in words without suffix
 */
export const amountToWordsShort = (amount) => {
  const fullWords = amountToWords(amount);
  return fullWords.replace(' Rupees Only', '').replace(' Only', '');
};

/**
 * Format amount in Indian numbering system (1,00,000)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount
 */
export const formatIndianCurrency = (amount) => {
  const num = Math.abs(amount);
  const numStr = num.toString();
  const lastThree = numStr.substring(numStr.length - 3);
  const otherNumbers = numStr.substring(0, numStr.length - 3);
  
  let formatted = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;

  return (amount < 0 ? '-' : '') + '₹' + formatted;
};

/**
 * Test function to validate conversions
 */
export const testNumberToWords = () => {
  const testCases = [
    0,
    1,
    10,
    99,
    100,
    1000,
    10000,
    100000,
    1000000,
    10000000,
    100000000,
    1234567,
    123456789,
    12.50,
    1234.75,
    50000.25
  ];

  console.log('=== Number to Words Test Cases ===\n');
  
  testCases.forEach(num => {
    console.log(`${num} => ${amountToWords(num)}`);
  });

  console.log('\n=== Indian Currency Format Test ===\n');
  
  testCases.forEach(num => {
    console.log(`${num} => ${formatIndianCurrency(num)}`);
  });
};

export default {
  numberToWords,
  amountToWords,
  amountToWordsShort,
  formatIndianCurrency,
  testNumberToWords,
};