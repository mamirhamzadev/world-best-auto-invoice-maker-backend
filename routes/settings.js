import express from "express";
const router = express.Router();
import asyncHandler from "express-async-handler";
import Settings from "../models/Settings.js";

// Get all invoices
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const settings = await Settings.findOne({});
    res.json(settings);
  })
);

// Create new invoice
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = req.body;
    let settings = await Settings.findOneAndUpdate({}, payload, { new: true });
    if (settings)
      return res.json({
        message: "Settings saved successfully",
        settings,
      });
    return res.status(400).json({ message: "Settings creation failed" });
  })
);

export const initializeSettings = async () => {
  const defaultSettings = {
    tax: 0,
    discount: 0,
    payment_method: "Cash",
    payment_status: "Paid",
  };

  try {
    const settings = await Settings.findOneAndUpdate(
      {}, // Search criteria
      { $setOnInsert: defaultSettings }, // Only insert these if doc doesn't exist
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    if (settings) console.log("✅ Settings Initialized");
  } catch (err) {
    console.error("❌ Failed to initialize settings:", err);
    process.exit(1);
  }
};
initializeSettings();

export default router;
