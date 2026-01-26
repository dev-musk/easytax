// ============================================
// FILE: server/models/User.js
// ✅ CORRECTED: Proper password hashing with duplicate check
// ============================================

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: String,
    organizationName: String,
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
    // Legacy role field for backward compatibility
    legacyRole: {
      type: String,
      enum: ["SUPER_ADMIN", "OWNER", "ADMIN", "USER", "ACCOUNTANT"],
      default: "USER",
    },
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

// ✅ Hash password before saving
// IMPORTANT: Only hash if password is modified AND not already hashed
userSchema.pre("save", async function (next) {
  // Only hash if password is modified
  if (!this.isModified("password")) {
    return next();
  }

  try {
    // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
    if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
      return next(); // Already hashed, skip
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ✅ Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// ✅ Method to get user without password
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

// ✅ Virtual for role name (backward compatibility)
userSchema.virtual('roleName').get(function() {
  return this.role?.name || this.legacyRole || 'USER';
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export default mongoose.model("User", userSchema);