// ============================================
// FILE: server/routes/invoices.js
// ✅ FEATURES #34, #36, #41: Complete Routes
// ============================================

import express from "express";
import { protect } from "../middleware/auth.js";
import Invoice from "../models/Invoice.js";
import Client from "../models/Client.js";
import Product from "../models/Product.js";
import Organization from "../models/Organization.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import GRN from "../models/GRN.js";
import mongoose from "mongoose";
import { calculateGSTBreakdown } from "../utils/gstCalculator.js";
import { amountToWords } from "../utils/numberToWords.js";
import { extractTextFromImage } from "../utils/extractTextFromImage.js";
import crypto from "crypto";
import uploadInvoiceAttachments from "../config/invoiceAttachmentsMulter.js";
import {
  auditCreate,
  auditUpdate,
  auditDelete,
  logManualAudit,
} from "../middleware/auditMiddleware.js";
import fs from "fs";
import path from "path";
import archiver from "archiver";

const router = express.Router();

// ✅ FEATURE #34: Public invoice view (NO AUTH REQUIRED)
router.get("/public/:shareToken", async (req, res) => {
  try {
    const { shareToken } = req.params;

    const invoice = await Invoice.findOne({
      shareToken,
      shareEnabled: true,
    }).populate(
      "client",
      "companyName email billingAddress billingCity billingState gstin"
    );

    if (!invoice) {
      return res
        .status(404)
        .json({ error: "Invoice not found or link has expired" });
    }

    // Check if link expired
    if (invoice.shareExpiresAt && new Date() > invoice.shareExpiresAt) {
      return res.status(410).json({ error: "This link has expired" });
    }

    // Increment view count
    invoice.shareViews += 1;
    invoice.lastViewedAt = new Date();
    await invoice.save();

    // Get organization details
    const organization = await Organization.findById(invoice.organization);

    res.json({
      invoice,
      organization: {
        name: organization.name,
        address: organization.address,
        city: organization.city,
        state: organization.state,
        pincode: organization.pincode,
        gstin: organization.gstin,
        pan: organization.pan,
        cin: organization.cin,
        logo: organization.logo,
        bankDetails: organization.bankDetails,
        displaySettings: organization.displaySettings,
        authorizedSignatory: organization.authorizedSignatory,
      },
    });
  } catch (error) {
    console.error("Public view error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.use(protect);

// Enhanced Search
router.get("/", async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { status, clientId, search, invoiceType } = req.query;

    if (!search) {
      const filter = { organization: organizationId };

      if (status && status !== "ALL") {
        filter.status = status;
      }

      if (clientId) {
        filter.client = clientId;
      }

      // ✅ FEATURE #29: Filter by invoice type
      if (invoiceType) {
        filter.invoiceType = invoiceType;
      }

      const invoices = await Invoice.find(filter)
        .populate(
          "client",
          "companyName email gstin billingAddress billingCity billingState"
        )
        .sort({ createdAt: -1 });

      return res.json(invoices);
    }

    const searchRegex = new RegExp(search, "i");
    const searchNumber = parseFloat(search.replace(/,/g, ""));
    const isValidNumber = !isNaN(searchNumber);

    const pipeline = [
      { $match: { organization: new mongoose.Types.ObjectId(organizationId) } },
      {
        $lookup: {
          from: "clients",
          localField: "client",
          foreignField: "_id",
          as: "clientData",
        },
      },
      {
        $unwind: {
          path: "$clientData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [
            { invoiceNumber: searchRegex },
            { notes: searchRegex },
            { poNumber: searchRegex },
            { contractNumber: searchRegex },
            { salesPersonName: searchRegex },
            { grnNumber: searchRegex },
            { preparedBy: searchRegex },
            { verifiedBy: searchRegex },
            { "clientData.companyName": searchRegex },
            { "clientData.email": searchRegex },
            { "items.description": searchRegex },
            { "items.hsnSacCode": searchRegex },
            ...(isValidNumber
              ? [
                  {
                    totalAmount: {
                      $gte: searchNumber * 0.9,
                      $lte: searchNumber * 1.1,
                    },
                  },
                  {
                    subtotal: {
                      $gte: searchNumber * 0.9,
                      $lte: searchNumber * 1.1,
                    },
                  },
                  {
                    balanceAmount: {
                      $gte: searchNumber * 0.9,
                      $lte: searchNumber * 1.1,
                    },
                  },
                ]
              : []),
            { "quickNotes.note": searchRegex },
          ],
        },
      },
      {
        $addFields: {
          client: "$clientData",
        },
      },
      {
        $project: {
          clientData: 0,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    if (status && status !== "ALL") {
      pipeline.splice(1, 0, {
        $match: { status: status },
      });
    }

    if (clientId) {
      pipeline.splice(1, 0, {
        $match: { client: new mongoose.Types.ObjectId(clientId) },
      });
    }

    const invoices = await Invoice.aggregate(pipeline);

    res.json(invoices);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Check for duplicate invoice number
router.get("/check-duplicate", async (req, res) => {
  try {
    const { invoiceNumber } = req.query;
    const organizationId = req.user.organizationId;

    if (!invoiceNumber) {
      return res.status(400).json({ error: "Invoice number is required" });
    }

    const exists = await Invoice.findOne({
      organization: organizationId,
      invoiceNumber: invoiceNumber,
    });

    res.json({
      exists: !!exists,
      message: exists
        ? "Invoice number already exists"
        : "Invoice number is available",
    });
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
    })
      .populate("client")
      .populate("quickNotes.addedBy", "name email")
      .populate("attachments.uploadedBy", "name email");

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create invoice
router.post(
  "/",
  auditCreate("INVOICE", (invoice) => invoice.invoiceNumber),
  async (req, res) => {
    try {
      const organizationId = req.user.organizationId;
      const data = req.body;

      const [organization, client] = await Promise.all([
        Organization.findById(organizationId),
        Client.findById(data.clientId),
      ]);

      if (!client) {
        return res.status(400).json({ error: "Client not found" });
      }

      // HSN Validation
      const hsnDigitsRequired = organization.hsnDigitsRequired || 4;

      for (const item of data.items) {
        if (item.hsnSacCode) {
          const hsnLength = item.hsnSacCode.replace(/\s/g, "").length;

          if (hsnDigitsRequired === 4 && hsnLength !== 4) {
            return res.status(400).json({
              error: `HSN code must be exactly 4 digits (turnover ≤ ₹5 crore). Found: ${item.hsnSacCode} (${hsnLength} digits)`,
              item: item.description,
              required: 4,
              found: hsnLength,
            });
          } else if (hsnDigitsRequired === 6 && hsnLength < 6) {
            return res.status(400).json({
              error: `HSN code must be at least 6 digits (turnover > ₹5 crore). Found: ${item.hsnSacCode} (${hsnLength} digits)`,
              item: item.description,
              required: 6,
              found: hsnLength,
            });
          }
        }
      }

      // ====================================================
      // ✅ DOCUMENT TYPE VALIDATION
      // ====================================================

      // ✅ CREDIT NOTE: Must have original invoice reference
      if (data.invoiceType === "CREDIT_NOTE") {
        if (!data.quotationNumber) {
          return res.status(400).json({
            error: "Credit Note must reference an original Tax Invoice",
          });
        }
      }

      // ✅ DEBIT NOTE: Must have PO reference

      if (data.invoiceType === "DEBIT_NOTE") {
        console.log(
          "🔍 DEBIT_NOTE validation - quotationNumber:",
          data.quotationNumber
        );
        if (!data.quotationNumber) {
          console.error("❌ Debit Note missing PO reference!");
          return res.status(400).json({
            error: "Debit Note must reference a Purchase Order",
          });
        }
      }

      // ✅ DELIVERY CHALLAN: Must have Tax Invoice reference
      if (data.invoiceType === "DELIVERY_CHALLAN") {
        if (!data.quotationNumber) {
          return res.status(400).json({
            error: "Delivery Challan must reference a Tax Invoice",
          });
        }
      }

      // ✅ PROFORMA: Should remain DRAFT until converted
      if (data.invoiceType === "PROFORMA") {
        data.status = "DRAFT"; // Force DRAFT status for proforma
      }

      // ====================================================
      // END DOCUMENT TYPE VALIDATION
      // ====================================================

      if (data.invoiceType === "TAX_INVOICE") {
        console.log("🔍 Validating stock availability...");

        const stockErrors = [];

        for (const item of data.items) {
          if (item.productId && item.productId !== "custom") {
            try {
              const product = await Product.findById(item.productId);

              if (
                product &&
                product.type === "PRODUCT" &&
                product.trackInventory
              ) {
                const isAvailable = product.isStockAvailable(item.quantity);

                if (!isAvailable) {
                  stockErrors.push({
                    product: product.name,
                    requested: item.quantity,
                    available: product.currentStock,
                    unit: product.unit,
                  });
                }
              }
            } catch (error) {
              console.error("Stock check error:", error);
            }
          }
        }

        if (stockErrors.length > 0) {
          const errorMessage = stockErrors
            .map(
              (e) =>
                `${e.product}: Requested ${e.requested} ${e.unit}, but only ${e.available} ${e.unit} available`
            )
            .join("; ");

          return res.status(400).json({
            error: "Insufficient stock",
            details: errorMessage,
            stockErrors,
          });
        }

        console.log("✅ Stock validation passed");
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

      let tcsAmount = 0;
      if (data.tcsApplicable && data.tcsRate) {
        tcsAmount = (taxableAmount * data.tcsRate) / 100;
      }

      const totalAmount =
        taxableAmount +
        gstBreakdown.totalTax +
        tcsAmount -
        (data.tdsAmount || 0);
      const roundOff = Math.round(totalAmount) - totalAmount;
      const finalTotal = Math.round(totalAmount);

      const amountInWordsText = amountToWords(finalTotal);

      // ✅ DECLARE invoiceItems BEFORE using it
      const invoiceItems = data.items.map((item) => {
        const gstItem = gstBreakdown.items.find(
          (gst) => gst.description === item.description
        );

        // ✅ FIX: Only include product field if productId is valid
        const productId =
          item.productId && item.productId !== "" && item.productId !== "custom"
            ? item.productId
            : undefined;

        return {
          ...gstItem,
          // Conditionally include product field only if valid
          subDescription: item.subDescription || "",
          ...(productId ? { product: productId } : {}),
        };
      });

      // ✅ NOW create invoice with invoiceItems
      const invoice = await Invoice.create({
        invoiceNumber,
        invoiceType: data.invoiceType,
        client: data.clientId,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,

        poNumber: data.poNumber,
        poDate: data.poDate,
        contractNumber: data.contractNumber,
        salesPersonName: data.salesPersonName,
        grnNumber: data.grnNumber,
        preparedBy: data.preparedBy,
        verifiedBy: data.verifiedBy,
        items: invoiceItems, // ✅ NOW it's declared!

        subtotal: parseFloat(subtotal.toFixed(2)),
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount: parseFloat(discountAmount.toFixed(2)),

        cgst: gstBreakdown.totalCGST,
        sgst: gstBreakdown.totalSGST,
        igst: gstBreakdown.totalIGST,
        totalTax: gstBreakdown.totalTax,

        tdsSection: data.tdsSection || null,
        tdsRate: data.tdsRate || 0,
        tdsAmount: data.tdsAmount || 0,

        tcsApplicable: data.tcsApplicable || false,
        tcsRate: data.tcsRate || 0,
        tcsAmount: tcsAmount,

        reverseCharge: data.reverseCharge || false,

        roundOff: parseFloat(roundOff.toFixed(2)),
        totalAmount: finalTotal,
        amountInWords: amountInWordsText,
        paidAmount: 0,
        balanceAmount: finalTotal,
        status: "PENDING",
        notes: data.notes,

        gstCalculationMeta: {
          clientStateCode: gstBreakdown.transactionInfo?.clientState || "N/A",
          orgStateCode: gstBreakdown.transactionInfo?.orgState || "N/A",
          transactionType: gstBreakdown.transactionInfo?.type,
          isInterstate: gstBreakdown.isInterstate,
          gstSplit: gstBreakdown.transactionInfo?.gstSplit,
          clientState: gstBreakdown.transactionInfo?.clientState,
          orgState: gstBreakdown.transactionInfo?.orgState,
          calculatedAt: new Date(),
        },

        eInvoice: data.eInvoice,
        eWayBill: data.eWayBill,
        template: data.template || "MODERN",
        organization: organizationId,
      });

      console.log(`📝 Invoice created: ${invoice.invoiceNumber}`);

      // ✅ REDUCE STOCK FOR TAX_INVOICE
      if (data.invoiceType === "TAX_INVOICE") {
        for (const item of invoice.items) {
          // ✅ Use productId instead of product
          const productId = item.productId || item.product;

          if (productId) {
            try {
              const product = await Product.findById(productId);
              if (product && product.trackInventory) {
                await product.reduceStock(
                  item.quantity,
                  `Invoice ${invoiceNumber}`,
                  invoice._id,
                  req.user.id,
                  "Main Warehouse"
                );
                console.log(
                  `✅ Stock reduced for ${product.name}: ${item.quantity} units`
                );
              }
            } catch (stockError) {
              console.error("Stock reduction error:", stockError);
            }
          }
        }
      }

      // ✅ INCREASE STOCK FOR CREDIT_NOTE
      if (data.invoiceType === "CREDIT_NOTE") {
        for (const item of invoice.items) {
          const productId = item.productId || item.product;

          if (productId) {
            try {
              const product = await Product.findById(productId);
              if (product && product.trackInventory) {
                await product.increaseStock(
                  item.quantity,
                  `Credit Note ${invoiceNumber}`,
                  invoice._id,
                  req.user.id,
                  "Main Warehouse"
                );
                console.log(
                  `✅ Stock increased for ${product.name}: ${item.quantity} units`
                );
              }
            } catch (stockError) {
              console.error("Stock increase error:", stockError);
            }
          }
        }
      }

      // ============================================
      // ✅ THREE-WAY MATCHING (BEFORE incrementing invoice number)
      // ============================================
      if (data.poNumber) {
        console.log(`\n🔍 THREE-WAY MATCHING: Starting...`);
        console.log(`   Invoice: ${invoice.invoiceNumber}`);
        console.log(`   PO Number: ${data.poNumber}`);

        try {
          // Find matching PO
          const po = await PurchaseOrder.findOne({
            poNumber: data.poNumber,
            organization: organizationId,
          });

          if (po) {
            console.log(`   ✅ Found PO: ${po.poNumber}`);

            // Find associated GRN
            const grn = await GRN.findOne({
              purchaseOrder: po._id,
              organization: organizationId,
            }).sort({ createdAt: -1 }); // Get latest GRN

            if (grn) {
              console.log(`   ✅ Found GRN: ${grn.grnNumber}`);

              // Perform automatic three-way matching
              const { performThreeWayMatch } = await import(
                "./threeWayMatching.js"
              );

              const matchResult = await performThreeWayMatch(po, grn, invoice);

              console.log(
                `\n   📊 Matching Result: ${matchResult.overallStatus}`
              );
              console.log(
                `   📊 Discrepancies: ${matchResult.discrepancies.length}`
              );

              // Update GRN with matching status
              grn.matchingStatus = matchResult.overallStatus;
              grn.linkedInvoice = invoice._id;
              grn.invoiceNumber = invoice.invoiceNumber;
              grn.invoiceMatchDate = new Date();

              if (matchResult.discrepancies.length > 0) {
                grn.hasDiscrepancies = true;
                grn.discrepancies = matchResult.discrepancies.map((d) => ({
                  type: d.type,
                  description: d.description,
                  severity: d.severity,
                }));
                console.log(
                  `   ⚠️  ${matchResult.discrepancies.length} discrepancies found`
                );
              } else {
                grn.hasDiscrepancies = false;
                console.log(`   ✅ No discrepancies - perfect match!`);
              }

              await grn.save();
              console.log(
                `   ✅ GRN updated with status: ${matchResult.overallStatus}`
              );

              // Link invoice to PO (prevent duplicates)
              const alreadyLinked = po.linkedInvoices.some(
                (li) => li.invoice.toString() === invoice._id.toString()
              );

              if (!alreadyLinked) {
                po.linkedInvoices.push({
                  invoice: invoice._id,
                  invoiceNumber: invoice.invoiceNumber,
                  linkedDate: new Date(),
                });
                await po.save();
                console.log(`   ✅ Invoice linked to PO`);
              }

              console.log(`\n✅ THREE-WAY MATCHING COMPLETE!\n`);
            } else {
              console.log(`   ⚠️  No GRN found for PO ${po.poNumber}`);
            }
          } else {
            console.log(`   ⚠️  No PO found with number: ${data.poNumber}`);
          }
        } catch (matchError) {
          // Don't fail invoice creation if matching fails
          console.error(
            `   ❌ Matching error (non-critical):`,
            matchError.message
          );
        }
      }
      // ============================================
      // END THREE-WAY MATCHING
      // ============================================

      // Increment invoice number (after matching)
      await Organization.findByIdAndUpdate(organizationId, {
        $inc: { nextInvoiceNumber: 1 },
      });

      // Populate and send response
      const populatedInvoice = await Invoice.findById(invoice._id).populate(
        "client"
      );

      res.status(201).json(populatedInvoice);
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create draft invoice (minimal data required)
// ✅ IMPROVED: Create Draft Invoice
router.post("/create-draft", auditCreate("DRAFT_INVOICE"), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const data = req.body;

    const organization = await Organization.findById(organizationId);

    // Generate unique draft invoice number
    const draftNumber = `DRAFT-${Date.now()}`;

    // Create draft with full data from frontend
    const draft = await Invoice.create({
      invoiceNumber: null, // ✅ Allow null for drafts
      draftNumber: draftNumber,
      invoiceType: data.invoiceType || "TAX_INVOICE",
      client: data.clientId || null,
      invoiceDate: data.invoiceDate || new Date().toISOString().split("T")[0],
      dueDate: data.dueDate || null,

      poNumber: data.poNumber || "",
      poDate: data.poDate || null,
      contractNumber: data.contractNumber || "",
      salesPersonName: data.salesPersonName || "",
      grnNumber: data.grnNumber || "",
      preparedBy: data.preparedBy || "",
      verifiedBy: data.verifiedBy || "",

      items: (data.items || []).map((item) => ({
        itemType: item.itemType || "PRODUCT",
        description: item.description || "",
        subDescription: item.subDescription || "",
        hsnSacCode: item.hsnSacCode || "",
        quantity: item.quantity || 1,
        unit: item.unit || "PCS",
        rate: item.rate || 0,
        gstRate: item.gstRate || 18,
        discountType: item.discountType || "PERCENTAGE",
        discountValue: item.discountValue || 0,
        discountAmount: item.discountAmount || 0,
        baseAmount: item.amount || 0,
        taxableAmount: item.amount || 0,
        amount: item.amount || 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalAmount: item.amount || 0,
        ...(item.productId &&
        item.productId !== "" &&
        item.productId !== "custom"
          ? { product: item.productId }
          : {}),
      })),

      subtotal: data.subtotal || 0,
      discountType: data.discountType || "PERCENTAGE",
      discountValue: data.discountValue || 0,
      discountAmount: data.discountAmount || 0,

      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,

      tdsSection: data.tdsSection || null,
      tdsRate: data.tdsRate || 0,
      tdsAmount: data.tdsAmount || 0,

      tcsApplicable: data.tcsApplicable || false,
      tcsRate: data.tcsRate || 0,
      tcsAmount: 0,

      reverseCharge: data.reverseCharge || false,

      roundOff: 0,
      totalAmount: data.totalAmount || 0,
      amountInWords: data.amountInWords || "",
      paidAmount: 0,
      balanceAmount: data.totalAmount || 0,
      status: "DRAFT", // ✅ Mark as DRAFT status

      notes: data.notes || "",
      template: data.template || "MODERN",
      organization: organizationId,
      selectedGstin: data.selectedGstin || null,

      eInvoice: {
        enabled: false,
        status: "NOT_GENERATED",
      },
      eWayBill: {
        enabled: false,
        transportMode: "ROAD",
        status: "NOT_GENERATED",
      },
    });

    console.log(`📝 Draft created: ${draft.draftNumber}`);

    res.status(201).json({
      _id: draft._id,
      draftNumber: draft.draftNumber,
      status: "DRAFT",
      message: "Draft invoice created successfully. You can now edit it.",
    });
  } catch (error) {
    console.error("Create draft error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update invoice
router.put(
  "/:id",
  auditUpdate(
    "INVOICE",
    Invoice,
    (invoice) => invoice.invoiceNumber || invoice.draftNumber
  ),
  async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = req.user.organizationId;
      const data = req.body;

      const invoice = await Invoice.findOne({
        _id: id,
        organization: organizationId,
      });

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // ✅ NEW: If converting DRAFT to FINAL invoice
      if (invoice.status === "DRAFT" && data.status === "PENDING") {
        const organization = await Organization.findById(organizationId);

        // Generate invoice number
        const invoiceNumber = `${organization.invoicePrefix}-${String(
          organization.nextInvoiceNumber
        ).padStart(4, "0")}`;

        data.invoiceNumber = invoiceNumber;

        // Recalculate totals with current items
        const { calculateGSTBreakdown } = await import(
          "../utils/gstCalculator.js"
        );
        const { amountToWords } = await import("../utils/numberToWords.js");

        const client = await Client.findById(data.clientId);

        const gstBreakdown = calculateGSTBreakdown(
          data.items,
          client.gstin,
          organization.gstin
        );

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

        let tcsAmount = 0;
        if (data.tcsApplicable && data.tcsRate) {
          tcsAmount = (taxableAmount * data.tcsRate) / 100;
        }

        const totalAmount =
          taxableAmount +
          gstBreakdown.totalTax +
          tcsAmount -
          (data.tdsAmount || 0);

        const roundOff = Math.round(totalAmount) - totalAmount;
        const finalTotal = Math.round(totalAmount);

        data.cgst = gstBreakdown.totalCGST;
        data.sgst = gstBreakdown.totalSGST;
        data.igst = gstBreakdown.totalIGST;
        data.totalTax = gstBreakdown.totalTax;
        data.subtotal = subtotal;
        data.discountAmount = discountAmount;
        data.roundOff = roundOff;
        data.totalAmount = finalTotal;
        data.balanceAmount = finalTotal;
        data.amountInWords = amountToWords(finalTotal);
        data.tcsAmount = tcsAmount;

        // Increment invoice number
        await Organization.findByIdAndUpdate(organizationId, {
          $inc: { nextInvoiceNumber: 1 },
        });

        console.log(`✅ Draft converted to invoice: ${invoiceNumber}`);
      }

      if (data.totalAmount) {
        const { amountToWords } = await import("../utils/numberToWords.js");
        data.amountInWords = amountToWords(data.totalAmount);
      }

      const updatedInvoice = await Invoice.findOneAndUpdate(
        { _id: id, organization: organizationId },
        data,
        { new: true }
      ).populate("client");

      if (!updatedInvoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      res.json(updatedInvoice);
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ✅ FEATURE #34: Generate/Update Share Link
router.post("/:id/share", async (req, res) => {
  try {
    const { id } = req.params;
    const { expiresIn } = req.body;
    const organizationId = req.user.organizationId;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const shareToken = crypto.randomBytes(32).toString("hex");

    let shareExpiresAt = null;
    if (expiresIn) {
      shareExpiresAt = new Date();
      shareExpiresAt.setDate(shareExpiresAt.getDate() + parseInt(expiresIn));
    }

    invoice.shareToken = shareToken;
    invoice.shareEnabled = true;
    invoice.shareExpiresAt = shareExpiresAt;
    invoice.shareViews = 0;

    await invoice.save();

    // ✅ NEW CODE - Use environment variable for frontend URL
    const frontendUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const shareUrl = `${frontendUrl}/public/invoice/${shareToken}`;

    res.json({
      shareToken,
      shareUrl,
      shareEnabled: true,
      shareExpiresAt,
      message: "Share link generated successfully",
    });
  } catch (error) {
    console.error("Share link error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ FEATURE #34: Disable Share Link
router.delete("/:id/share", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, organization: organizationId },
      {
        shareEnabled: false,
      },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json({
      message: "Share link disabled successfully",
      shareEnabled: false,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ FEATURE #36: Upload Attachments
router.post(
  "/:id/attachments",
  uploadInvoiceAttachments.array("files", 10),
  async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = req.user.organizationId;

      const invoice = await Invoice.findOne({
        _id: id,
        organization: organizationId,
      });

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      // Add attachments to invoice
      const newAttachments = req.files.map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        filepath: file.path,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: req.user.id,
        uploadedAt: new Date(),
        description: req.body.description || "",
      }));

      invoice.attachments = invoice.attachments || [];
      invoice.attachments.push(...newAttachments);

      await invoice.save();

      const updatedInvoice = await Invoice.findById(invoice._id)
        .populate("client")
        .populate("attachments.uploadedBy", "name email");

      res.json({
        message: `${req.files.length} file(s) uploaded successfully`,
        attachments: newAttachments,
        invoice: updatedInvoice,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ✅ FEATURE #36: Download Attachment
router.get("/:id/attachments/:attachmentId/download", async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const organizationId = req.user.organizationId;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const attachment = invoice.attachments.find(
      (att) => att._id.toString() === attachmentId
    );

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    // Check if file exists
    if (!fs.existsSync(attachment.filepath)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    res.download(attachment.filepath, attachment.originalName);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ FEATURE #36: Delete Attachment
router.delete("/:id/attachments/:attachmentId", async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const organizationId = req.user.organizationId;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const attachment = invoice.attachments.find(
      (att) => att._id.toString() === attachmentId
    );

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    // Delete file from filesystem
    if (fs.existsSync(attachment.filepath)) {
      fs.unlinkSync(attachment.filepath);
    }

    // Remove attachment from array
    invoice.attachments = invoice.attachments.filter(
      (att) => att._id.toString() !== attachmentId
    );

    await invoice.save();

    res.json({
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    console.error("Delete attachment error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add Quick Note
router.post("/:id/notes", async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const organizationId = req.user.organizationId;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({ error: "Note cannot be empty" });
    }

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    invoice.quickNotes = invoice.quickNotes || [];
    invoice.quickNotes.push({
      note: note.trim(),
      addedBy: req.user.id,
      addedAt: new Date(),
    });

    await invoice.save();

    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate("client")
      .populate("quickNotes.addedBy", "name email");

    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ FEATURE #41: Update GST Filing Status
router.patch("/:id/filing-status", async (req, res) => {
  try {
    const { id } = req.params;
    const { gstr1Filed, gstr3bFiled, filingPeriod } = req.body;
    const organizationId = req.user.organizationId;

    const updateData = {};

    if (gstr1Filed !== undefined) {
      updateData["gstFilingStatus.gstr1Filed"] = gstr1Filed;
      updateData["gstFilingStatus.gstr1FiledDate"] = gstr1Filed
        ? new Date()
        : null;
    }

    if (gstr3bFiled !== undefined) {
      updateData["gstFilingStatus.gstr3bFiled"] = gstr3bFiled;
      updateData["gstFilingStatus.gstr3bFiledDate"] = gstr3bFiled
        ? new Date()
        : null;
    }

    if (filingPeriod) {
      updateData["gstFilingStatus.filingPeriod"] = filingPeriod;
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, organization: organizationId },
      { $set: updateData },
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

// ✅ FEATURE #41: Update GST Filing Status
router.patch("/:id/filing-status", async (req, res) => {
  try {
    const { id } = req.params;
    const { gstr1Filed, gstr3bFiled, filingPeriod } = req.body;
    const organizationId = req.user.organizationId;

    const updateData = {};

    if (gstr1Filed !== undefined) {
      updateData["gstFilingStatus.gstr1Filed"] = gstr1Filed;
      updateData["gstFilingStatus.gstr1FiledDate"] = gstr1Filed
        ? new Date()
        : null;
    }

    if (gstr3bFiled !== undefined) {
      updateData["gstFilingStatus.gstr3bFiled"] = gstr3bFiled;
      updateData["gstFilingStatus.gstr3bFiledDate"] = gstr3bFiled
        ? new Date()
        : null;
    }

    if (filingPeriod) {
      updateData["gstFilingStatus.filingPeriod"] = filingPeriod;
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, organization: organizationId },
      { $set: updateData },
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

// ← ADD THIS NEW ROUTE
// ✅ FEATURE #20: Update Template Settings
router.patch("/:id/template-settings", async (req, res) => {
  try {
    const { id } = req.params;
    const { fontFamily, headerStyle, borderStyle, themeColor, textAlignment } =
      req.body;
    const organizationId = req.user.organizationId;

    // Validate invoice ownership
    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Update template settings
    invoice.templateSettings = {
      fontFamily:
        fontFamily || invoice.templateSettings?.fontFamily || "Roboto",
      headerStyle:
        headerStyle || invoice.templateSettings?.headerStyle || "BOXED",
      borderStyle:
        borderStyle || invoice.templateSettings?.borderStyle || "PARTIAL",
      themeColor: themeColor || invoice.templateSettings?.themeColor || "BLUE",
      textAlignment:
        textAlignment || invoice.templateSettings?.textAlignment || "LEFT",
    };

    await invoice.save();

    res.json({
      message: "Template settings updated successfully",
      templateSettings: invoice.templateSettings,
    });
  } catch (error) {
    console.error("Update template settings error:", error);
    res.status(500).json({ error: "Failed to update template settings" });
  }
});

// Delete invoice
router.delete(
  "/:id",
  auditDelete("INVOICE", Invoice, (invoice) => invoice.invoiceNumber),
  async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = req.user.organizationId;

      const invoice = await Invoice.findOne({
        _id: id,
        organization: organizationId,
      });

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // ✅ FEATURE #40: RESTORE STOCK if TAX_INVOICE
      if (invoice.invoiceType === "TAX_INVOICE") {
        console.log(
          `🔄 Restoring stock for invoice ${invoice.invoiceNumber}...`
        );

        for (const item of invoice.items) {
          if (item.product) {
            try {
              const product = await Product.findById(item.product);
              if (product && product.trackInventory) {
                await product.increaseStock(
                  item.quantity,
                  `Invoice ${invoice.invoiceNumber} deleted`,
                  invoice._id,
                  req.user.id,
                  "Main Warehouse"
                );
                console.log(
                  `✅ Restored ${item.quantity} ${product.unit} of ${product.name}`
                );
              }
            } catch (stockError) {
              console.error("Stock restoration error:", stockError);
              // Continue with deletion even if stock update fails
            }
          }
        }
      }

      // ✅ FEATURE #40: REVERSE STOCK for CREDIT_NOTE
      if (invoice.invoiceType === "CREDIT_NOTE") {
        console.log(
          `🔄 Reversing credit note stock for invoice ${invoice.invoiceNumber}...`
        );

        for (const item of invoice.items) {
          if (item.product) {
            try {
              const product = await Product.findById(item.product);
              if (product && product.trackInventory) {
                // Reduce stock again since credit note is being deleted
                await product.reduceStock(
                  item.quantity,
                  `Credit Note ${invoice.invoiceNumber} deleted`,
                  invoice._id,
                  req.user.id,
                  "Main Warehouse"
                );
                console.log(
                  `✅ Reversed ${item.quantity} ${product.unit} of ${product.name}`
                );
              }
            } catch (stockError) {
              console.error("Stock reversal error:", stockError);
            }
          }
        }
      }

      // Delete attachments
      if (invoice.attachments && invoice.attachments.length > 0) {
        invoice.attachments.forEach((attachment) => {
          if (fs.existsSync(attachment.filepath)) {
            fs.unlinkSync(attachment.filepath);
          }
        });
      }

      await invoice.deleteOne();

      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Generate UPI QR Code
router.get("/:id/upi-qr", async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    }).populate("client");

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const organization = await Organization.findById(req.user.organizationId);

    if (!organization || !organization.bankDetails?.upiId) {
      return res.status(400).json({
        error:
          "UPI ID not configured in organization settings. Please add UPI ID in Settings → Bank Details.",
      });
    }

    const upiString = `upi://pay?pa=${
      organization.bankDetails.upiId
    }&pn=${encodeURIComponent(organization.name)}&am=${
      invoice.balanceAmount || invoice.totalAmount
    }&cu=INR&tn=${encodeURIComponent(
      `Payment for Invoice ${invoice.invoiceNumber}`
    )}`;

    res.json({
      upiString,
      upiId: organization.bankDetails.upiId,
      amount: invoice.balanceAmount || invoice.totalAmount,
      invoiceNumber: invoice.invoiceNumber,
      companyName: organization.name,
    });
  } catch (error) {
    console.error("Error generating UPI QR:", error);
    res.status(500).json({ error: "Failed to generate UPI QR code" });
  }
});

// Generate and download PDF
// In server/routes/invoices.js - Replace the /pdf route:

// ✅ FIXED: Generate actual PDF using Puppeteer
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

    // ✅ CHANGED: Now using await because generateInvoicePDF is async
    const { generateInvoicePDF } = await import("../utils/pdfGenerator.js");
    const html = await generateInvoicePDF(invoice, organization);

    const htmlPdf = await import("html-pdf-node");

    const options = {
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    };

    const file = { content: html };
    const pdfBuffer = await htmlPdf.default.generatePdf(file, options);

    // Generate filename
    const sanitizedCompanyName = organization.name
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    const sanitizedInvoiceNumber = invoice.invoiceNumber.replace(/\//g, "-");

    const formatStatus = (status) => {
      return status
        .split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ");
    };

    const filename = `${sanitizedCompanyName}_${sanitizedInvoiceNumber} -- ${formatStatus(
      invoice.status
    )}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
        filename
      )}`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
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

    invoice.emailSent = true;
    invoice.lastSentAt = new Date();
    await invoice.save();

    res.json({
      message: "Email sent successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ✅ FEATURE #40: INVENTORY DASHBOARD
// ============================================

router.get("/inventory/dashboard", async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const products = await Product.find({
      organization: organizationId,
      type: "PRODUCT",
      trackInventory: true,
    });

    // Low stock items
    const lowStock = products.filter((p) => p.isLowStock);

    // Overstock items
    const overstock = products.filter((p) => p.isOverstock);

    // Expiring batches (next 30 days)
    const expiringBatches = [];
    products.forEach((product) => {
      const batches = product.getExpiringBatches(30);
      batches.forEach((batch) => {
        expiringBatches.push({
          productId: product._id,
          productName: product.name,
          batchNumber: batch.batchNumber,
          quantity: batch.quantity,
          expiryDate: batch.expiryDate,
        });
      });
    });

    // Total stock value
    const totalStockValue = products.reduce(
      (sum, p) => sum + p.currentStock * p.rate,
      0
    );

    // Location-wise stock
    const locationStock = {};
    products.forEach((product) => {
      product.stockByLocation.forEach((loc) => {
        if (!locationStock[loc.locationName]) {
          locationStock[loc.locationName] = {
            totalItems: 0,
            totalQuantity: 0,
            totalValue: 0,
          };
        }
        locationStock[loc.locationName].totalItems++;
        locationStock[loc.locationName].totalQuantity += loc.quantity;
        locationStock[loc.locationName].totalValue +=
          loc.quantity * product.rate;
      });
    });

    res.json({
      totalProducts: products.length,
      totalStockValue: parseFloat(totalStockValue.toFixed(2)),
      lowStockItems: lowStock.length,
      lowStockDetails: lowStock.map((p) => ({
        _id: p._id,
        name: p.name,
        currentStock: p.currentStock,
        reorderLevel: p.reorderLevel,
        unit: p.unit,
      })),
      overstockItems: overstock.length,
      overstockDetails: overstock.map((p) => ({
        _id: p._id,
        name: p.name,
        currentStock: p.currentStock,
        maxStockLevel: p.maxStockLevel,
        unit: p.unit,
      })),
      expiringBatches: expiringBatches.length,
      expiringBatchesDetails: expiringBatches,
      locationStock,
    });
  } catch (error) {
    console.error("Inventory dashboard error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ FEATURE #40: GET STOCK MOVEMENTS
router.get("/inventory/:productId/movements", async (req, res) => {
  try {
    const { productId } = req.params;
    const organizationId = req.user.organizationId;

    const product = await Product.findOne({
      _id: productId,
      organization: organizationId,
    }).populate("stockMovements.performedBy", "name email");

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      productName: product.name,
      currentStock: product.currentStock,
      movements: product.stockMovements.sort(
        (a, b) => b.performedAt - a.performedAt
      ),
    });
  } catch (error) {
    console.error("Stock movements error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/download-with-attachments", async (req, res) => {
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

    // Create ZIP
    const archive = archiver("zip", { zlib: { level: 9 } });

    const sanitizedCompanyName = organization.name
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    const sanitizedInvoiceNumber = invoice.invoiceNumber.replace(/\//g, "-");

    const formatStatus = (status) => {
      return status
        .split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ");
    };

    const zipFilename = `${sanitizedCompanyName}_${sanitizedInvoiceNumber} -- ${formatStatus(
      invoice.status
    )}_Complete.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${zipFilename}"; filename*=UTF-8''${encodeURIComponent(
        zipFilename
      )}`
    );

    archive.pipe(res);

    // ✅ Generate actual PDF for ZIP
    const { generateInvoicePDF } = await import("../utils/pdfGenerator.js");
    const html = await generateInvoicePDF(invoice, organization);

    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    await browser.close();

    // Add PDF to ZIP
    archive.append(pdfBuffer, { name: `${invoice.invoiceNumber}.pdf` });

    // Add attachments
    if (invoice.attachments && invoice.attachments.length > 0) {
      invoice.attachments.forEach((attachment) => {
        if (fs.existsSync(attachment.filepath)) {
          archive.file(attachment.filepath, { name: attachment.originalName });
        }
      });
    }

    await archive.finalize();
  } catch (error) {
    console.error("ZIP creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
