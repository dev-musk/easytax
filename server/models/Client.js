// ============================================
// FILE: server/models/Client.js
// ✅ ADDED: MSME/Udyam Registration Number
// ============================================

import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    clientCode: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },

    // Display Name
    displayName: String,

    // Tax Information
    gstin: {
      type: String,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          const gstinRegex =
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
          return gstinRegex.test(v);
        },
        message: "Invalid GSTIN format",
      },
    },

    pan: {
      type: String,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
          return panRegex.test(v);
        },
        message: "Invalid PAN format",
      },
    },

    // CIN for corporate clients
    cin: {
      type: String,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          const cinRegex = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
          return cinRegex.test(v);
        },
        message: "Invalid CIN format",
      },
    },

    // ✅ NEW: MSME/Udyam Registration
    udyamNumber: {
      type: String,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          // Format: UDYAM-XX-00-0000000
          const udyamRegex = /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/;
          return udyamRegex.test(v);
        },
        message: "Invalid Udyam number format (Expected: UDYAM-XX-00-0000000)",
      },
    },

    // ✅ NEW: MSME Classification
    msmeCategory: {
      type: String,
      enum: ["MICRO", "SMALL", "MEDIUM", "NOT_MSME"],
      default: "NOT_MSME",
    },

    isTaxable: {
      type: Boolean,
      default: true,
    },

    // GST Treatment Classification
    gstTreatment: {
      type: String,
      enum: [
        "REGULAR",
        "COMPOSITION",
        "UNREGISTERED",
        "CASUAL_TAXABLE",
        "NRTP",
        "B2CS",
        "B2CL",
        "SEZ",
        "EXPORT",
        "IMPORT",
        "REVERSE_CHARGE",
      ],
      default: "REGULAR",
    },

    logo: String,

    // Contact
    contactPerson: String,
    email: String,
    phone: String,
    alternatePhone: String,
    landline: String,

    // Billing Address
    billingAddress: String,
    billingCity: String,
    billingState: String,
    billingPincode: String,
    billingCountry: {
      type: String,
      default: "India",
    },

    // Shipping Address
    shippingAddress: String,
    shippingCity: String,
    shippingState: String,
    shippingPincode: String,
    shippingCountry: {
      type: String,
      default: "India",
    },
    sameAsBilling: {
      type: Boolean,
      default: true,
    },

    // Settings
    paymentTerms: {
      type: Number,
      default: 30,
    },
    defaultTaxRate: Number,
    creditLimit: Number,

    isActive: {
      type: Boolean,
      default: true,
    },

    // Archive Fields
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    archivedAt: {
      type: Date,
      default: null,
    },
    
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    
    archiveReason: {
      type: String,
      default: null,
    },

    // Branches
    branches: [
      {
        branchName: {
          type: String,
          required: true,
        },
        address: String,
        city: String,
        state: String,
        pincode: String,
        gstin: String,
        contactPerson: String,
        email: String,
        phone: String,
        isDefault: {
          type: Boolean,
          default: false,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

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
clientSchema.index({ organization: 1, clientCode: 1 }, { unique: true });
clientSchema.index({ organization: 1, isArchived: 1 });
clientSchema.index({ gstin: 1 });
clientSchema.index({ udyamNumber: 1 }); // ✅ NEW
clientSchema.index({ companyName: "text", contactPerson: "text" });

// Pre-save hook
clientSchema.pre("save", function (next) {
  // Auto-set displayName if not provided
  if (!this.displayName) {
    this.displayName = this.companyName;
  }

  // If sameAsBilling is true, copy billing to shipping
  if (this.sameAsBilling) {
    this.shippingAddress = this.billingAddress;
    this.shippingCity = this.billingCity;
    this.shippingState = this.billingState;
    this.shippingPincode = this.billingPincode;
    this.shippingCountry = this.billingCountry;
  }

  next();
});

export default mongoose.model("Client", clientSchema);