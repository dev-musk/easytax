// ============================================
// FILE: server/routes/csrs.js
// DESCRIPTION: Routes for managing Completion Service Reports (CSRs)
// ============================================

import express from "express";
import { protect } from "../middleware/auth.js";
import CSR from "../models/CSR.js";
import Invoice from "../models/Invoice.js";
import Organization from "../models/Organization.js";
import Client from "../models/Client.js";

const router = express.Router();

// ✅ IMPROVED: Generate CSR Number with retry logic
const generateCSRNumber = async (organizationId, session = null) => {
  const maxRetries = 5;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const organization = await Organization.findById(organizationId).session(session);
      
      if (!organization) {
        throw new Error("Organization not found");
      }

      const currentNumber = organization.nextCSRNumber || 1;
      const csrNumber = `CSR-${new Date().getFullYear()}-${String(currentNumber).padStart(4, "0")}`;
      
      // ✅ Check if this number already exists
      const exists = await CSR.findOne({ 
        csrNumber, 
        organization: organizationId 
      }).session(session);
      
      if (exists) {
        console.log(`⚠️ CSR number ${csrNumber} already exists, incrementing...`);
        // Increment and try again
        await Organization.findByIdAndUpdate(
          organizationId,
          { $inc: { nextCSRNumber: 1 } },
          { session }
        );
        continue;
      }
      
      // ✅ Reserve this number by incrementing
      await Organization.findByIdAndUpdate(
        organizationId,
        { $inc: { nextCSRNumber: 1 } },
        { session }
      );
      
      return csrNumber;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  
  throw new Error("Failed to generate unique CSR number after multiple attempts");
};

// ✅ IMPROVED: Create CSR with transaction
router.post("/", protect, async (req, res) => {
  const session = await CSR.startSession();
  session.startTransaction();

  try {
    const organizationId = req.user.organizationId;
    const data = req.body;

    // ✅ Generate CSR number within transaction
    const csrNumber = await generateCSRNumber(organizationId, session);

    // Build CSR data object
    const csrData = {
      csrNumber,
      serviceOrder: data.serviceOrderId,
      client: data.clientId,
      serviceType: data.serviceType,
      serviceDescription: data.serviceDescription,
      scopeOfWork: data.scopeOfWork,
      technicianName: data.technicianName,
      technicianPhone: data.technicianPhone,
      serviceLocation: data.serviceLocation,
      serviceStartDate: data.serviceStartDate,
      serviceEndDate: data.serviceEndDate,
      serviceHours: data.serviceHours,
      partsUsed: data.partsUsed || [],
      taskChecklist: (data.taskChecklist || []).map((task) => ({
        title: task.title,
        description: task.description,
        status: task.status || "PENDING",
        notes: task.notes,
      })),
      labourCost: data.labourCost || 0,
      materialsCost: data.materialsCost || 0,
      travelCost: data.travelCost || 0,
      notes: data.notes,
      organization: organizationId,
      status: "IN_PROGRESS",
    };

    // Only add technicianId if it's valid
    if (data.technicianId && data.technicianId.trim() !== "") {
      csrData.assignedTechnician = data.technicianId;
    }

    // ✅ Create CSR within transaction
    const [csr] = await CSR.create([csrData], { session });

    // ✅ Commit transaction
    await session.commitTransaction();

    // Manual audit logging
    if (req.auditLog) {
      req.auditLog({
        action: "CREATE",
        resource: "CSR",
        resourceId: csr._id,
        identifier: csr.csrNumber,
        changes: { created: csr.toObject() },
      });
    }

    const populatedCSR = await CSR.findById(csr._id)
      .populate("client", "companyName email phone")
      .populate("assignedTechnician", "name email phone");

    res.status(201).json(populatedCSR);
  } catch (error) {
    // ✅ Rollback on error
    await session.abortTransaction();
    console.error("CSR creation error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

// Get all CSRs
router.get("/", protect, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { status, clientId, search } = req.query;

    const filter = { organization: organizationId };
    if (status) filter.status = status;
    if (clientId) filter.client = clientId;

    let csrs = await CSR.find(filter)
      .populate("client", "companyName email")
      .populate("assignedTechnician", "name email")
      .sort({ createdAt: -1 });

    if (search) {
      const searchRegex = new RegExp(search, "i");
      csrs = csrs.filter(
        (csr) =>
          searchRegex.test(csr.csrNumber) ||
          searchRegex.test(csr.serviceType) ||
          searchRegex.test(csr.client?.companyName || "")
      );
    }

    res.json(csrs);
  } catch (error) {
    console.error("Fetch CSRs error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single CSR
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const csr = await CSR.findOne({
      _id: id,
      organization: organizationId,
    })
      .populate("client")
      .populate("assignedTechnician", "name email phone")
      .populate("linkedInvoice");

    if (!csr) {
      return res.status(404).json({ error: "CSR not found" });
    }

    res.json(csr);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update CSR
router.put("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const data = req.body;

    const oldCSR = await CSR.findOne({ _id: id, organization: organizationId });
    if (!oldCSR) {
      return res.status(404).json({ error: "CSR not found" });
    }

    // Filter out empty technicianId
    const updateData = { ...data };
    if (updateData.technicianId === "" || !updateData.technicianId) {
      delete updateData.assignedTechnician;
    }

    const csr = await CSR.findOneAndUpdate(
      { _id: id, organization: organizationId },
      updateData,
      { new: true }
    )
      .populate("client")
      .populate("assignedTechnician");

    // Manual audit logging
    if (req.auditLog) {
      req.auditLog({
        action: "UPDATE",
        resource: "CSR",
        resourceId: csr._id,
        identifier: csr.csrNumber,
        changes: {
          before: oldCSR.toObject(),
          after: csr.toObject(),
        },
      });
    }

    res.json(csr);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Task
router.post("/:id/tasks", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const { title, description } = req.body;

    const csr = await CSR.findOneAndUpdate(
      { _id: id, organization: organizationId },
      {
        $push: {
          taskChecklist: {
            title,
            description,
            status: "PENDING",
          },
        },
      },
      { new: true }
    );

    res.json(csr);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Task Status
router.put("/:id/tasks/:taskIndex", protect, async (req, res) => {
  try {
    const { id, taskIndex } = req.params;
    const organizationId = req.user.organizationId;
    const { status, notes } = req.body;

    const csr = await CSR.findOne({ _id: id, organization: organizationId });

    if (!csr) {
      return res.status(404).json({ error: "CSR not found" });
    }

    if (csr.taskChecklist[taskIndex]) {
      csr.taskChecklist[taskIndex].status = status;
      csr.taskChecklist[taskIndex].notes = notes;
      if (status === "COMPLETED") {
        csr.taskChecklist[taskIndex].completedAt = new Date();
        csr.taskChecklist[taskIndex].completedBy = req.user.id;
      }
    }

    await csr.save();
    res.json(csr);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Client Feedback
router.post("/:id/client-feedback", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const { comment, rating } = req.body;

    const csr = await CSR.findOneAndUpdate(
      { _id: id, organization: organizationId },
      {
        $push: {
          clientFeedback: {
            comment,
            rating,
            createdBy: req.user.id,
          },
        },
        clientOverallRating: rating,
      },
      { new: true }
    ).populate("clientFeedback.createdBy", "name email");

    res.json(csr);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve CSR
router.post("/:id/approve", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const { comments, nextApprover } = req.body;

    const csr = await CSR.findOne({ _id: id, organization: organizationId });

    if (!csr) {
      return res.status(404).json({ error: "CSR not found" });
    }

    // ✅ Validate checklist completion
    if (csr.checklistCompletionPercentage < 100) {
      return res.status(400).json({ 
        error: "All tasks must be completed (100%) before approval" 
      });
    }

    // Add approval record
    csr.approvalChain.push({
      approvedBy: req.user.id,
      approverRole: req.user.role,
      approvalDate: new Date(),
      comments,
      status: "APPROVED",
    });

    // Update approval status
    if (nextApprover === "MANAGER") {
      csr.approvalStatus = "WAITING_CLIENT_APPROVAL";
    } else if (nextApprover === "CLIENT") {
      csr.approvalStatus = "APPROVED_BY_CLIENT";
    } else {
      csr.approvalStatus = "APPROVED_BY_MANAGER";
    }

    csr.status = "APPROVED";

    await csr.save();

    res.json({
      message: "CSR approved successfully",
      csr,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Invoice from CSR
router.post("/:id/generate-invoice", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const csr = await CSR.findOne({
      _id: id,
      organization: organizationId,
    }).populate("client");

    if (!csr) {
      return res.status(404).json({ error: "CSR not found" });
    }

    if (csr.invoiceGenerated) {
      return res.status(400).json({ error: "Invoice already generated" });
    }

    if (csr.approvalStatus !== "APPROVED_BY_MANAGER") {
      return res.status(400).json({
        error: "CSR must be approved by manager before invoice generation",
      });
    }

    const organization = await Organization.findById(organizationId);

    // Create invoice items from CSR
    const invoiceItems = [];

    // Labour
    if (csr.labourCost > 0) {
      invoiceItems.push({
        itemType: "SERVICE",
        description: `Labour - ${csr.serviceType}`,
        hsnSacCode: "9983",
        quantity: csr.serviceHours || 1,
        unit: csr.serviceHours ? "HOUR" : "UNIT",
        rate: csr.labourCost / (csr.serviceHours || 1),
        gstRate: 18,
        amount: csr.labourCost,
        taxableAmount: csr.labourCost,
      });
    }

    // Materials
    if (csr.partsUsed.length > 0) {
      csr.partsUsed.forEach((part) => {
        invoiceItems.push({
          itemType: "PRODUCT",
          description: part.partName,
          hsnSacCode: "8471",
          quantity: part.quantity,
          unit: "PCS",
          rate: part.rate,
          gstRate: 18,
          amount: part.amount,
          taxableAmount: part.amount,
        });
      });
    }

    // Create invoice
    const invoice = await Invoice.create({
      invoiceNumber: `INV-${organization.invoicePrefix}-${String(
        organization.nextInvoiceNumber
      ).padStart(4, "0")}`,
      invoiceType: "TAX_INVOICE",
      client: csr.client._id,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      items: invoiceItems,
      subtotal: csr.totalCost,
      totalAmount: csr.totalCost,
      balanceAmount: csr.totalCost,
      status: "PENDING",
      notes: `CSR: ${csr.csrNumber} - ${csr.serviceDescription}`,
      organization: organizationId,
    });

    // Update CSR
    csr.invoiceGenerated = true;
    csr.linkedInvoice = invoice._id;
    csr.invoiceNumber = invoice.invoiceNumber;
    csr.invoiceGeneratedDate = new Date();
    csr.status = "INVOICED";

    await csr.save();

    // Increment invoice number
    await Organization.findByIdAndUpdate(organizationId, {
      $inc: { nextInvoiceNumber: 1 },
    });

    res.json({
      message: "Invoice generated successfully",
      invoice,
      csr,
    });
  } catch (error) {
    console.error("Invoice generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete CSR
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const csr = await CSR.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!csr) {
      return res.status(404).json({ error: "CSR not found" });
    }

    // Manual audit logging
    if (req.auditLog) {
      req.auditLog({
        action: "DELETE",
        resource: "CSR",
        resourceId: csr._id,
        identifier: csr.csrNumber,
        changes: { deleted: csr.toObject() },
      });
    }

    await CSR.findByIdAndDelete(id);

    res.json({ message: "CSR deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;