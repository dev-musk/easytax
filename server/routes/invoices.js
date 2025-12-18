// ============================================
// FILE: server/routes/invoices.js
// UPDATE - Replace the createInvoice route
// ============================================

import express from "express";
import { protect } from "../middleware/auth.js";
import Invoice from "../models/Invoice.js";
import Client from "../models/Client.js";
import Organization from "../models/Organization.js";
import { calculateGSTBreakdown } from "../utils/gstCalculator.js";

const router = express.Router();

router.use(protect);

// Get all invoices
router.get("/", async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { status, clientId } = req.query;

    const filter = { organization: organizationId };

    if (status && status !== "ALL") {
      filter.status = status;
    }

    if (clientId) {
      filter.client = clientId;
    }

    const invoices = await Invoice.find(filter)
      .populate(
        "client",
        "companyName email gstin billingAddress billingCity billingState"
      )
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single invoice
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    }).populate("client");

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create invoice with proper GST calculation
router.post("/", async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const data = req.body;

    // Get organization and client
    const [organization, client] = await Promise.all([
      Organization.findById(organizationId),
      Client.findById(data.clientId),
    ]);

    if (!client) {
      return res.status(400).json({ error: "Client not found" });
    }

    // Generate invoice number
    const invoiceNumber = `${organization.invoicePrefix}-${String(
      organization.nextInvoiceNumber
    ).padStart(4, "0")}`;

    // Calculate GST breakdown
    const gstBreakdown = calculateGSTBreakdown(
      data.items,
      client.gstin,
      organization.gstin
    );

    // Calculate totals
    const subtotal = gstBreakdown.items.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    let discountAmount = 0;
    if (data.discountType === "PERCENTAGE") {
      discountAmount = (subtotal * data.discountValue) / 100;
    } else {
      discountAmount = data.discountValue || 0;
    }

    const taxableAmount = subtotal - discountAmount;
    const totalAmount = taxableAmount + gstBreakdown.totalTax;
    const roundOff = Math.round(totalAmount) - totalAmount;
    const finalTotal = Math.round(totalAmount);

    // Create invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      invoiceType: data.invoiceType,
      client: data.clientId,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      items: gstBreakdown.items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountType: data.discountType,
      discountValue: data.discountValue,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      cgst: gstBreakdown.totalCGST,
      sgst: gstBreakdown.totalSGST,
      igst: gstBreakdown.totalIGST,
      totalTax: gstBreakdown.totalTax,
      roundOff: parseFloat(roundOff.toFixed(2)),
      totalAmount: finalTotal,
      paidAmount: 0,
      balanceAmount: finalTotal,
      status: "PENDING",
      notes: data.notes,
      organization: organizationId,
    });

    // Increment invoice number
    await Organization.findByIdAndUpdate(organizationId, {
      $inc: { nextInvoiceNumber: 1 },
    });

    // Populate and return
    const populatedInvoice = await Invoice.findById(invoice._id).populate(
      "client"
    );

    res.status(201).json(populatedInvoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update invoice
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const data = req.body;

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, organization: organizationId },
      data,
      { new: true }
    ).populate("client");

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete invoice
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const invoice = await Invoice.findOneAndDelete({
      _id: id,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate and download PDF
router.get("/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    }).populate("client");

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const organization = await Organization.findById(organizationId);

    // Import dynamically to avoid issues
    const { generateInvoicePDF } = await import("../utils/pdfGenerator.js");
    const html = generateInvoicePDF(invoice, organization);

    // For simple HTML to PDF conversion, we'll send the HTML
    // Client will use browser's print functionality
    // Or you can use Puppeteer on server (requires installation)

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send invoice via email
router.post("/:id/send-email", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const { to, cc, subject, message } = req.body;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    }).populate("client");

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const organization = await Organization.findById(organizationId);

    // Generate PDF HTML
    const { generateInvoicePDF } = await import("../utils/pdfGenerator.js");
    const html = generateInvoicePDF(invoice, organization);

    // Email configuration (using nodemailer)
    // You'll need to configure your email service
    const emailConfig = {
      from: organization.email,
      to: to || invoice.client.email,
      cc: cc,
      subject:
        subject || `Invoice ${invoice.invoiceNumber} from ${organization.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Invoice ${invoice.invoiceNumber}</h2>
          <p>Dear ${invoice.client.companyName},</p>
          <p>${
            message || "Please find attached invoice for your reference."
          }</p>
          <div style="background: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${
              invoice.invoiceNumber
            }</p>
            <p style="margin: 5px 0;"><strong>Invoice Date:</strong> ${new Date(
              invoice.invoiceDate
            ).toLocaleDateString("en-IN")}</p>
            <p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(
              invoice.dueDate
            ).toLocaleDateString("en-IN")}</p>
            <p style="margin: 5px 0;"><strong>Amount:</strong> ₹${invoice.totalAmount.toLocaleString(
              "en-IN"
            )}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${
              invoice.status
            }</p>
          </div>
          <p>You can view and download the invoice PDF from the link below:</p>
          <a href="${process.env.CLIENT_URL}/invoices/${invoice._id}/view" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View Invoice
          </a>
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            If you have any questions, please contact us at ${
              organization.email
            }
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #999; font-size: 11px; text-align: center;">
            This is an automated email from ${
              organization.name
            }. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    // Update invoice status
    invoice.emailSent = true;
    invoice.lastSentAt = new Date();
    await invoice.save();

    // Return success (actual email sending would happen here)
    // You can integrate with SendGrid, AWS SES, or any email service
    res.json({
      message: "Email sent successfully",
      emailConfig: emailConfig, // For testing purposes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record payment
router.post("/:id/payments", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const { amount, paymentDate, paymentMode, referenceNumber, notes } =
      req.body;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Update invoice
    invoice.paidAmount += amount;
    invoice.balanceAmount -= amount;

    // Update status
    if (invoice.balanceAmount <= 0) {
      invoice.status = "PAID";
    } else if (invoice.paidAmount > 0) {
      invoice.status = "PARTIALLY_PAID";
    }

    await invoice.save();

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
