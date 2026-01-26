// ============================================
// FILE: server/routes/banks.js
// ✅ FEATURE #28: Bank Account Routes
// ============================================

import express from "express";
import { protect } from "../middleware/auth.js";
import BankAccount from "../models/BankAccount.js";
import {
  auditCreate,
  auditUpdate,
  auditDelete,
} from "../middleware/auditMiddleware.js";

const router = express.Router();

router.use(protect);

// ============================================
// GET - List all bank accounts
// ============================================
router.get("/", async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { search, isActive, includeArchived } = req.query;

    const filter = { organization: organizationId };

    // Filter by archived status
    if (includeArchived === "true") {
      // Show all accounts (both active and archived)
      // No filter applied to isArchived
    } else {
      // Show only active accounts (not archived)
      filter.isArchived = false;
    }

    // Search by account name or account number
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { accountName: searchRegex },
        { accountNumber: searchRegex },
        { bankName: searchRegex },
        { accountHolderName: searchRegex },
      ];
    }

    const accounts = await BankAccount.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    // Calculate totals
    const totalBalance = accounts.reduce(
      (sum, account) => sum + (account.currentBalance || 0),
      0
    );

    res.json({
      accounts,
      totalBalance: parseFloat(totalBalance.toFixed(2)),
      count: accounts.length,
    });
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET - Single bank account
// ============================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const account = await BankAccount.findOne({
      _id: id,
      organization: organizationId,
    }).populate("createdBy", "name email");

    if (!account) {
      return res.status(404).json({ error: "Bank account not found" });
    }

    res.json(account);
  } catch (error) {
    console.error("Error fetching bank account:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// POST - Create new bank account
// ============================================
router.post(
  "/",
  auditCreate("BANK_ACCOUNT", (account) => account.accountName),
  async (req, res) => {
    try {
      const organizationId = req.user.organizationId;
      const { accountName, accountNumber, accountType, bankName, ...rest } =
        req.body;

      // Validation
      if (!accountName || !bankName) {
        return res
          .status(400)
          .json({ error: "Account name and bank name are required" });
      }

      // Check for duplicate account number
      if (accountNumber) {
        const existing = await BankAccount.findOne({
          accountNumber,
          organization: organizationId,
        });

        if (existing) {
          return res.status(400).json({
            error: "Account number already exists for this organization",
          });
        }
      }

      const bankAccount = await BankAccount.create({
        accountName,
        accountNumber,
        accountType: accountType || "CURRENT",
        bankName,
        organization: organizationId,
        createdBy: req.user.id,
        ...rest,
      });

      const populatedAccount = await BankAccount.findById(bankAccount._id)
        .populate("createdBy", "name email");

      console.log(`✅ Bank account created: ${accountName}`);

      res.status(201).json(populatedAccount);
    } catch (error) {
      console.error("Error creating bank account:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// PUT - Update bank account
// ============================================
router.put(
  "/:id",
  auditUpdate(
    "BANK_ACCOUNT",
    BankAccount,
    (account) => account.accountName
  ),
  async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = req.user.organizationId;
      const updateData = req.body;

      const account = await BankAccount.findOne({
        _id: id,
        organization: organizationId,
      });

      if (!account) {
        return res.status(404).json({ error: "Bank account not found" });
      }

      // Check for duplicate account number if being changed
      if (
        updateData.accountNumber &&
        updateData.accountNumber !== account.accountNumber
      ) {
        const existing = await BankAccount.findOne({
          accountNumber: updateData.accountNumber,
          organization: organizationId,
          _id: { $ne: id },
        });

        if (existing) {
          return res.status(400).json({
            error: "Account number already exists for this organization",
          });
        }
      }

      const updatedAccount = await BankAccount.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).populate("createdBy", "name email");

      console.log(`✅ Bank account updated: ${updatedAccount.accountName}`);

      res.json(updatedAccount);
    } catch (error) {
      console.error("Error updating bank account:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// DELETE - Delete bank account
// ============================================
router.delete(
  "/:id",
  auditDelete("BANK_ACCOUNT", BankAccount, (account) => account.accountName),
  async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = req.user.organizationId;

      const account = await BankAccount.findOne({
        _id: id,
        organization: organizationId,
      });

      if (!account) {
        return res.status(404).json({ error: "Bank account not found" });
      }

      // Check if account has transactions (future implementation)
      // For now, just soft delete via archive
      account.isArchived = true;
      account.archivedAt = new Date();
      account.archivedBy = req.user.id;
      await account.save();

      console.log(
        `✅ Bank account archived: ${account.accountName}`
      );

      res.json({ message: "Bank account deleted successfully" });
    } catch (error) {
      console.error("Error deleting bank account:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// PATCH - Unarchive bank account
// ============================================
router.patch("/:id/unarchive", async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const account = await BankAccount.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!account) {
      return res.status(404).json({ error: "Bank account not found" });
    }

    if (!account.isArchived) {
      return res.status(400).json({ 
        error: "Account is not archived" 
      });
    }

    // Restore the account
    account.isArchived = false;
    account.archivedAt = null;
    account.archivedBy = null;
    await account.save();

    const restoredAccount = await BankAccount.findById(id)
      .populate("createdBy", "name email");

    console.log(`✅ Bank account unarchived: ${account.accountName}`);

    res.json({
      message: "Bank account unarchived successfully",
      account: restoredAccount,
    });
  } catch (error) {
    console.error("Error unarchiving bank account:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PATCH - Update account balance (Reconciliation)
// ============================================
router.patch("/:id/reconcile", async (req, res) => {
  try {
    const { id } = req.params;
    const { reconciledBalance, statementDate, reference } = req.body;
    const organizationId = req.user.organizationId;

    if (reconciledBalance === undefined) {
      return res.status(400).json({ error: "Reconciled balance is required" });
    }

    const account = await BankAccount.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!account) {
      return res.status(404).json({ error: "Bank account not found" });
    }

    // Update reconciliation details
    account.lastReconciliationDate = new Date();
    account.lastReconciliationBalance = reconciledBalance;
    account.currentBalance = reconciledBalance;
    account.lastStatementDate = statementDate || new Date();
    account.bankStatementReference = reference;

    await account.save();

    console.log(
      `✅ Bank account reconciled: ${account.accountName} - Balance: ₹${reconciledBalance}`
    );

    res.json({
      message: "Bank account reconciled successfully",
      account,
    });
  } catch (error) {
    console.error("Error reconciling bank account:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET - Dashboard summary
// ============================================
router.get("/summary/dashboard", async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const accounts = await BankAccount.find({
      organization: organizationId,
      isActive: true,
      isArchived: false,
    });

    const totalBalance = accounts.reduce(
      (sum, account) => sum + (account.currentBalance || 0),
      0
    );

    const accountsByType = {};
    accounts.forEach((account) => {
      if (!accountsByType[account.accountType]) {
        accountsByType[account.accountType] = {
          count: 0,
          balance: 0,
        };
      }
      accountsByType[account.accountType].count++;
      accountsByType[account.accountType].balance +=
        account.currentBalance || 0;
    });

    res.json({
      totalAccounts: accounts.length,
      totalBalance: parseFloat(totalBalance.toFixed(2)),
      accounts,
      accountsByType,
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;