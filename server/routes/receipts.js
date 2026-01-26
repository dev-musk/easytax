// ============================================
// FILE: server/routes/receipts.js
// ✅ FEATURE #51: Added bank handling
// ============================================

import express from "express";
import { protect } from "../middleware/auth.js";
import Receipt from "../models/Receipt.js";
import Invoice from "../models/Invoice.js";
import Client from "../models/Client.js";
import BankAccount from "../models/BankAccount.js";

const router = express.Router();
router.use(protect);

const calculateProRataAllocation = (receipt, invoice) => {
  if (!invoice || !receipt.items) return null;

  const totalCash = receipt.totalCashReceived;
  const invoiceTotal = invoice.totalAmount;

  const allocationPercentage = (totalCash / invoiceTotal) * 100;

  const itemAllocations =
    invoice.items?.map((invoiceItem) => ({
      itemId: invoiceItem._id,
      itemDescription: invoiceItem.description,
      itemAmount: invoiceItem.amount,
      allocationAmount: (invoiceItem.amount * totalCash) / invoiceTotal,
      allocationPercentage: allocationPercentage,
    })) || [];

  return {
    invoiceAmount: invoiceTotal,
    amountAllocated: totalCash,
    balanceRemaining: invoiceTotal - totalCash,
    allocationPercentage: allocationPercentage,
    itemAllocations: itemAllocations,
  };
};

// Get all receipts
router.get("/", async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { clientId, invoiceId, bankId, startDate, endDate, status } = req.query;

    const filter = { organization: organizationId };
    if (clientId) filter.client = clientId;
    if (invoiceId) filter.invoice = invoiceId;
    if (bankId) filter.bank = bankId; // ✅ FEATURE #51: Filter by bank
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.receiptDate = {};
      if (startDate) filter.receiptDate.$gte = new Date(startDate);
      if (endDate) filter.receiptDate.$lte = new Date(endDate);
    }

    const receipts = await Receipt.find(filter)
      .populate("client", "companyName")
      .populate("invoice", "invoiceNumber totalAmount")
      .populate("bank", "accountName bankName accountNumber") // ✅ FEATURE #51: Populate bank
      .sort({ receiptDate: -1 });

    res.json(receipts);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single receipt
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const receipt = await Receipt.findOne({
      _id: id,
      organization: organizationId,
    })
      .populate("client")
      .populate("invoice")
      .populate("bank") // ✅ FEATURE #51: Populate bank
      .populate("createdBy", "name email");

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    res.json(receipt);
  } catch (error) {
    console.error("Error fetching receipt:", error);
    res.status(500).json({ error: error.message });
  }
});

const sanitizeReceiptItems = (items) => {
  if (!items || !Array.isArray(items)) return [];

  return items.map((item) => ({
    type: item.type,
    amount: parseFloat(item.amount) || 0,
    tdsSection:
      item.tdsSection && item.tdsSection.trim() !== "" ? item.tdsSection : null,
    tdsRate: item.tdsRate ? parseFloat(item.tdsRate) : 0,
    tdsCertificateNumber: item.tdsCertificateNumber || undefined,
    tdsDeductedBy: item.tdsDeductedBy || undefined,
    advanceReceiptNumber: item.advanceReceiptNumber || undefined,
    advanceDate: item.advanceDate || undefined,
    returnReason: item.returnReason || undefined,
    originalInvoiceNumber: item.originalInvoiceNumber || undefined,
    notes: item.notes || undefined,
  }));
};

// Create receipt
router.post("/", async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const {
      clientId,
      invoiceId,
      bankId, // ✅ FEATURE #51: Bank ID
      receiptType,
      receiptDate,
      items,
      paymentMode,
      referenceNumber,
      bankName,
      chequeNumber,
      chequeDate,
      upiTransactionId,
      notes,
    } = req.body;

    // Validate client
    const client = await Client.findOne({
      _id: clientId,
      organization: organizationId,
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // ✅ FEATURE #51: Validate bank
    if (!bankId) {
      return res.status(400).json({ error: "Bank account is required" });
    }

    const bank = await BankAccount.findOne({
      _id: bankId,
      organization: organizationId,
      isActive: true,
      isArchived: false,
    });

    if (!bank) {
      return res.status(404).json({ error: "Bank account not found or inactive" });
    }

    // Validate invoice if provided
    let invoice = null;
    if (invoiceId) {
      invoice = await Invoice.findOne({
        _id: invoiceId,
        organization: organizationId,
      });

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
    }

    // Generate receipt number
    const receiptCount = await Receipt.countDocuments({
      organization: organizationId,
    });
    const receiptNumber = `REC-${String(receiptCount + 1).padStart(5, "0")}`;

    const sanitizedItems = sanitizeReceiptItems(items);

    // Create receipt
    const receipt = await Receipt.create({
      receiptNumber,
      receiptType: receiptType || "INVOICE_PAYMENT",
      client: clientId,
      invoice: invoiceId || null,
      bank: bankId, // ✅ FEATURE #51: Set bank
      receiptDate: receiptDate || new Date(),
      items: sanitizedItems,
      paymentMode,
      referenceNumber,
      bankName,
      chequeNumber,
      chequeDate,
      upiTransactionId,
      notes,
      organization: organizationId,
      createdBy: req.user.id,
    });

    // Update invoice if applicable
    if (invoice && receipt.totalReceipt > 0) {
      const allocation = calculateProRataAllocation(receipt, invoice);
      receipt.invoiceAllocation = {
        invoiceAmount: allocation.invoiceAmount,
        amountAllocated: allocation.amountAllocated,
        balanceRemaining: allocation.balanceRemaining,
        allocationPercentage: allocation.allocationPercentage,
      };
      invoice.paidAmount = (invoice.paidAmount || 0) + receipt.totalReceipt;
      invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

      receipt.itemAllocations = allocation.itemAllocations;

      await receipt.save();

      // Update status
      if (invoice.balanceAmount <= 0) {
        invoice.status = "PAID";
      } else if (invoice.paidAmount > 0) {
        invoice.status = "PARTIALLY_PAID";
      }

      await invoice.save();
    }

    // ✅ FEATURE #51: Update bank balance
    bank.currentBalance = (bank.currentBalance || 0) + receipt.totalReceipt;
    await bank.save();

    const populatedReceipt = await Receipt.findById(receipt._id)
      .populate("client", "companyName")
      .populate("invoice", "invoiceNumber totalAmount")
      .populate("bank", "accountName bankName"); // ✅ FEATURE #51

    res.status(201).json({
      success: true,
      receipt: populatedReceipt,
      invoice: invoice
        ? {
            _id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            paidAmount: invoice.paidAmount,
            balanceAmount: invoice.balanceAmount,
            status: invoice.status,
          }
        : null,
    });
  } catch (error) {
    console.error("Error creating receipt:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update receipt
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const receipt = await Receipt.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    if (receipt.status === "CANCELLED") {
      return res.status(400).json({ error: "Cannot update cancelled receipt" });
    }

    // ✅ FEATURE #51: Validate bank if changed
    if (req.body.bankId && req.body.bankId !== receipt.bank.toString()) {
      const newBank = await BankAccount.findOne({
        _id: req.body.bankId,
        organization: organizationId,
        isActive: true,
        isArchived: false,
      });

      if (!newBank) {
        return res.status(404).json({ error: "Bank account not found or inactive" });
      }

      // Reverse old bank, add to new bank
      const oldBank = await BankAccount.findById(receipt.bank);
      if (oldBank) {
        oldBank.currentBalance = (oldBank.currentBalance || 0) - receipt.totalReceipt;
        await oldBank.save();
      }

      newBank.currentBalance = (newBank.currentBalance || 0) + receipt.totalReceipt;
      await newBank.save();

      receipt.bank = req.body.bankId;
    }

    // Store old total for invoice adjustment
    const oldTotal = receipt.totalReceipt;

    // Sanitize items if provided
    if (req.body.items) {
      req.body.items = sanitizeReceiptItems(req.body.items);
    }

    // Update receipt
    Object.assign(receipt, req.body);
    await receipt.save();

    // ✅ FEATURE #51: Update bank balance if total changed
    if (receipt.totalReceipt !== oldTotal) {
      const bank = await BankAccount.findById(receipt.bank);
      if (bank) {
        const difference = receipt.totalReceipt - oldTotal;
        bank.currentBalance = (bank.currentBalance || 0) + difference;
        await bank.save();
      }
    }

    // Adjust invoice if total changed
    if (receipt.invoice && receipt.totalReceipt !== oldTotal) {
      const invoice = await Invoice.findById(receipt.invoice);
      if (invoice) {
        const difference = receipt.totalReceipt - oldTotal;
        invoice.paidAmount = (invoice.paidAmount || 0) + difference;
        invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

        if (invoice.balanceAmount <= 0) {
          invoice.status = "PAID";
        } else if (invoice.paidAmount > 0) {
          invoice.status = "PARTIALLY_PAID";
        } else {
          invoice.status = "PENDING";
        }

        await invoice.save();
      }
    }

    const updatedReceipt = await Receipt.findById(receipt._id)
      .populate("client", "companyName")
      .populate("invoice", "invoiceNumber totalAmount")
      .populate("bank", "accountName bankName"); // ✅ FEATURE #51

    res.json(updatedReceipt);
  } catch (error) {
    console.error("Error updating receipt:", error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel receipt
router.post("/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const organizationId = req.user.organizationId;

    const receipt = await Receipt.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    if (receipt.status === "CANCELLED") {
      return res.status(400).json({ error: "Receipt already cancelled" });
    }

    // Mark as cancelled
    receipt.status = "CANCELLED";
    receipt.cancelledAt = new Date();
    receipt.cancelledBy = req.user.id;
    receipt.cancelReason = reason || "No reason provided";
    await receipt.save();

    // ✅ FEATURE #51: Reverse bank balance
    const bank = await BankAccount.findById(receipt.bank);
    if (bank) {
      bank.currentBalance = (bank.currentBalance || 0) - receipt.totalReceipt;
      await bank.save();
    }

    // Reverse invoice payment
    if (receipt.invoice) {
      const invoice = await Invoice.findById(receipt.invoice);
      if (invoice) {
        invoice.paidAmount = Math.max(
          0,
          (invoice.paidAmount || 0) - receipt.totalReceipt
        );
        invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

        if (invoice.balanceAmount <= 0) {
          invoice.status = "PAID";
        } else if (invoice.paidAmount > 0) {
          invoice.status = "PARTIALLY_PAID";
        } else {
          invoice.status = "PENDING";
        }

        await invoice.save();
      }
    }

    res.json({
      success: true,
      message: "Receipt cancelled successfully",
      receipt,
    });
  } catch (error) {
    console.error("Error cancelling receipt:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete receipt
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const receipt = await Receipt.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    // ✅ FEATURE #51: Reverse bank balance
    if (receipt.status !== "CANCELLED") {
      const bank = await BankAccount.findById(receipt.bank);
      if (bank) {
        bank.currentBalance = (bank.currentBalance || 0) - receipt.totalReceipt;
        await bank.save();
      }
    }

    // Reverse invoice payment before deletion
    if (receipt.invoice && receipt.status !== "CANCELLED") {
      const invoice = await Invoice.findById(receipt.invoice);
      if (invoice) {
        invoice.paidAmount = Math.max(
          0,
          (invoice.paidAmount || 0) - receipt.totalReceipt
        );
        invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

        if (invoice.paidAmount > 0) {
          invoice.status = "PARTIALLY_PAID";
        } else {
          invoice.status = "PENDING";
        }

        await invoice.save();
      }
    }

    await Receipt.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Receipt deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting receipt:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;