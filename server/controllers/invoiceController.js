import { generatePDFBuffer } from '../utils/puppeteerPDF.js';

export const downloadInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client')
      .populate('organization');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Generate PDF using Puppeteer
    const pdfBuffer = await generatePDFBuffer(invoice, invoice.organization);

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF Error:', error);
    res.status(500).json({ 
      message: 'Failed to generate PDF', 
      error: error.message 
    });
  }
};