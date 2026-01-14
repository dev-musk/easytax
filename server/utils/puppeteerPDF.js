// ============================================
// FILE: server/utils/puppeteerPDF.js
// Production-ready PDF generator for Linux/Render deployment
// ============================================

import puppeteer from 'puppeteer';
import { generateInvoicePDF } from './pdfGenerator.js';

/**
 * Generate PDF buffer from invoice data
 * Works on both local development and Linux production (Render)
 */
export const generatePDFBuffer = async (invoice, organization) => {
  let browser = null;
  
  try {
    console.log('🚀 Launching Puppeteer browser...');
    
    // Configuration that works on both Windows/Mac (dev) and Linux (production)
    const launchOptions = {
      headless: 'new', // Use new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
      timeout: 30000,
    };

    // On Render/Linux, use system Chrome if available
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (process.platform === 'linux') {
      // Try common Linux Chrome locations
      const chromePaths = [
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
      ];
      
      for (const path of chromePaths) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(path)) {
            launchOptions.executablePath = path;
            console.log(`✅ Using Chrome at: ${path}`);
            break;
          }
        } catch (err) {
          // Continue to next path
        }
      }
    }

    browser = await puppeteer.launch(launchOptions);
    console.log('✅ Browser launched successfully');

    const page = await browser.newPage();
    console.log('✅ New page created');

    // Generate HTML content using existing generator
    const htmlContent = generateInvoicePDF(invoice, organization);

    // Set content with proper base URL for images
    const baseURL = process.env.BASE_URL || 'http://localhost:5000';
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    console.log('✅ HTML content loaded');

    // Wait a bit for any fonts/styles to load
    await page.waitForTimeout(1000);

    // Generate PDF with proper settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm',
      },
      displayHeaderFooter: false,
    });
    console.log('✅ PDF generated successfully');

    return pdfBuffer;
  } catch (error) {
    console.error('❌ PDF Generation Error:', error);
    console.error('Error Stack:', error.stack);
    
    // Provide detailed error for debugging
    if (error.message.includes('Failed to launch')) {
      throw new Error(
        'Failed to launch browser. Please ensure Chromium is installed on the server. ' +
        'Error: ' + error.message
      );
    }
    
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('✅ Browser closed');
      } catch (closeError) {
        console.error('⚠️  Error closing browser:', closeError);
      }
    }
  }
};

/**
 * Health check function to verify Puppeteer is working
 */
export const checkPuppeteerHealth = async () => {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: 10000,
    });
    await browser.close();
    return { status: 'ok', message: 'Puppeteer is working' };
  } catch (error) {
    return { 
      status: 'error', 
      message: 'Puppeteer health check failed', 
      error: error.message 
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors during health check
      }
    }
  }
};

/**
 * Helper function to generate PDF and save to file (for testing)
 */
export const generateAndSavePDF = async (invoice, organization, outputPath) => {
  const pdfBuffer = await generatePDFBuffer(invoice, organization);
  const fs = await import('fs');
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`📄 PDF saved to: ${outputPath}`);
  return outputPath;
};

export default {
  generatePDFBuffer,
  checkPuppeteerHealth,
  generateAndSavePDF,
};