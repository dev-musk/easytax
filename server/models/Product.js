// ============================================
// FILE: server/models/Product.js
// ✅ FEATURE #40 + #21: Complete Inventory Tracking
// ============================================

import mongoose from "mongoose";

// ✅ Location-based stock schema
const stockLocationSchema = new mongoose.Schema({
  locationName: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  minStockLevel: {
    type: Number,
    default: 0,
  },
  maxStockLevel: {
    type: Number,
    default: 0,
  },
  reorderLevel: {
    type: Number,
    default: 0,
  },
});

// ✅ Batch tracking schema
const batchSchema = new mongoose.Schema({
  batchNumber: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
  },
  manufacturingDate: {
    type: Date,
  },
  expiryDate: {
    type: Date,
  },
  location: {
    type: String,
    default: "Main Warehouse",
  },
  purchaseRate: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

// ✅ Serial number tracking schema
const serialNumberSchema = new mongoose.Schema({
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["IN_STOCK", "SOLD", "RETURNED", "DAMAGED"],
    default: "IN_STOCK",
  },
  soldDate: {
    type: Date,
  },
  soldTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice",
  },
  location: {
    type: String,
    default: "Main Warehouse",
  },
});

// ✅ Stock movement history
const stockMovementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "PURCHASE",
      "SALE",
      "RETURN",
      "ADJUSTMENT",
      "TRANSFER",
      "DAMAGED",
      "OPENING_STOCK",
    ],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  previousStock: {
    type: Number,
    required: true,
  },
  newStock: {
    type: Number,
    required: true,
  },
  reference: {
    type: String,
    trim: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  location: {
    type: String,
    default: "Main Warehouse",
  },
  batchNumber: String,
  serialNumber: String,
  notes: String,
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  performedAt: {
    type: Date,
    default: Date.now,
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product/Service name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["PRODUCT", "SERVICE"],
      required: [true, "Type is required"],
      default: "PRODUCT",
    },
    hsnSacCode: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    subDescription: { type: String, default: "" },
    unit: {
      type: String,
      enum: [
        "PCS",
        "KG",
        "LITER",
        "METER",
        "BOX",
        "HOUR",
        "DAY",
        "MONTH",
        "SET",
        "UNIT",
      ],
      required: [true, "Unit is required"],
      default: "PCS",
    },
    rate: {
      type: Number,
      required: [true, "Rate is required"],
      default: 0,
      min: 0,
    },
    gstRate: {
      type: Number,
      required: [true, "GST rate is required"],
      enum: [0, 5, 12, 18, 28],
      default: 18,
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },

    // ============================================
    // ✅ FEATURE #40 + #21: INVENTORY TRACKING
    // ============================================

    // Basic Stock Management
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStockLevel: {
      type: Number,
      default: 0,
    },
    maxStockLevel: {
      type: Number,
      default: 0,
    },
    reorderLevel: {
      type: Number,
      default: 0,
    },

    // Stock Tracking Preferences
    trackInventory: {
      type: Boolean,
      default: true,
    },
    trackBatches: {
      type: Boolean,
      default: false,
    },
    trackSerialNumbers: {
      type: Boolean,
      default: false,
    },

    // Multi-Location Stock
    stockByLocation: [stockLocationSchema],

    // Batch Tracking
    batches: [batchSchema],

    // Serial Number Tracking
    serialNumbers: [serialNumberSchema],

    // Stock Movement History
    stockMovements: [stockMovementSchema],

    // Alerts & Notifications
    lowStockAlert: {
      type: Boolean,
      default: true,
    },
    overstockAlert: {
      type: Boolean,
      default: true,
    },
    expiryAlert: {
      type: Boolean,
      default: true,
    },
    expiryAlertDays: {
      type: Number,
      default: 30, // Alert 30 days before expiry
    },

    // Last Restocked
    lastRestockedDate: {
      type: Date,
    },
    lastRestockedQuantity: {
      type: Number,
      default: 0,
    },

    // ============================================

    isActive: {
      type: Boolean,
      default: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
productSchema.index({ name: "text", hsnSacCode: "text", description: "text" });
productSchema.index({ organization: 1, isActive: 1 });
productSchema.index({ currentStock: 1 });
productSchema.index({ "batches.expiryDate": 1 });
productSchema.index({ "serialNumbers.serialNumber": 1 });

// ✅ Virtual: Is Low Stock
productSchema.virtual("isLowStock").get(function () {
  return this.currentStock <= this.reorderLevel;
});

// ✅ Virtual: Is Overstock
productSchema.virtual("isOverstock").get(function () {
  return this.maxStockLevel > 0 && this.currentStock > this.maxStockLevel;
});

// ✅ Virtual: Total Stock Across All Locations
productSchema.virtual("totalLocationStock").get(function () {
  return this.stockByLocation.reduce((sum, loc) => sum + loc.quantity, 0);
});

// ✅ Method: Reduce Stock
productSchema.methods.reduceStock = async function (
  quantity,
  reference,
  referenceId,
  userId,
  location = "Main Warehouse",
  batchNumber = null,
  serialNumber = null
) {
  if (this.type === "SERVICE") {
    return; // Services don't have stock
  }

  if (!this.trackInventory) {
    return; // Not tracking inventory
  }

  const previousStock = this.currentStock;

  // Reduce main stock
  this.currentStock -= quantity;

  // Reduce location stock
  if (this.stockByLocation.length > 0) {
    const locationStock = this.stockByLocation.find(
      (loc) => loc.locationName === location
    );
    if (locationStock) {
      locationStock.quantity -= quantity;
    }
  }

  // Update batch if batch tracking
  if (this.trackBatches && batchNumber) {
    const batch = this.batches.find((b) => b.batchNumber === batchNumber);
    if (batch) {
      batch.quantity -= quantity;
      if (batch.quantity <= 0) {
        batch.isActive = false;
      }
    }
  }

  // Update serial number if tracking
  if (this.trackSerialNumbers && serialNumber) {
    const serial = this.serialNumbers.find(
      (s) => s.serialNumber === serialNumber
    );
    if (serial) {
      serial.status = "SOLD";
      serial.soldDate = new Date();
      serial.invoiceId = referenceId;
    }
  }

  // Record movement
  this.stockMovements.push({
    type: "SALE",
    quantity: -quantity,
    previousStock,
    newStock: this.currentStock,
    reference,
    referenceId,
    location,
    batchNumber,
    serialNumber,
    performedBy: userId,
    performedAt: new Date(),
  });

  await this.save();
};

// ✅ Method: Increase Stock (for returns, credit notes)
productSchema.methods.increaseStock = async function (
  quantity,
  reference,
  referenceId,
  userId,
  location = "Main Warehouse",
  batchNumber = null,
  serialNumber = null
) {
  if (this.type === "SERVICE") {
    return;
  }

  if (!this.trackInventory) {
    return;
  }

  const previousStock = this.currentStock;

  // Increase main stock
  this.currentStock += quantity;

  // Increase location stock
  if (this.stockByLocation.length > 0) {
    const locationStock = this.stockByLocation.find(
      (loc) => loc.locationName === location
    );
    if (locationStock) {
      locationStock.quantity += quantity;
    }
  }

  // Update batch if batch tracking
  if (this.trackBatches && batchNumber) {
    const batch = this.batches.find((b) => b.batchNumber === batchNumber);
    if (batch) {
      batch.quantity += quantity;
      batch.isActive = true;
    }
  }

  // Update serial number if tracking
  if (this.trackSerialNumbers && serialNumber) {
    const serial = this.serialNumbers.find(
      (s) => s.serialNumber === serialNumber
    );
    if (serial) {
      serial.status = "RETURNED";
      serial.invoiceId = null;
    }
  }

  // Record movement
  this.stockMovements.push({
    type: "RETURN",
    quantity: quantity,
    previousStock,
    newStock: this.currentStock,
    reference,
    referenceId,
    location,
    batchNumber,
    serialNumber,
    performedBy: userId,
    performedAt: new Date(),
  });

  await this.save();
};

// ✅ Method: Check if stock available
productSchema.methods.isStockAvailable = function (requiredQuantity) {
  if (this.type === "SERVICE") {
    return true; // Services always available
  }

  if (!this.trackInventory) {
    return true; // Not tracking
  }

  return this.currentStock >= requiredQuantity;
};

// ✅ Method: Get expiring batches
productSchema.methods.getExpiringBatches = function (days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + days);

  return this.batches.filter(
    (batch) =>
      batch.isActive &&
      batch.expiryDate &&
      batch.expiryDate <= cutoffDate &&
      batch.expiryDate > new Date()
  );
};

const Product = mongoose.model("Product", productSchema);

export default Product;
