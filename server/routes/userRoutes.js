import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// Profile update route
router.put("/profile", protect, async (req, res) => {
  const { name, email, phone, organizationName } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, email, phone, organizationName },
    { new: true }
  ).select("-password");

  res.json({ user });
});

// Change password route
router.put("/change-password", protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);

  if (!(await user.matchPassword(currentPassword))) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: "Password updated successfully" });
});

export default router;
