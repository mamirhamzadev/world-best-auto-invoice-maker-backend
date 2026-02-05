import express from "express";
const router = express.Router();
import asyncHandler from "express-async-handler";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import { isObjectIdOrHexString } from "mongoose";

// Get all invoices
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  })
);

// Create new invoice
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = req.body;
    const invoice = await Invoice.create(payload);
    if (invoice)
      return res.json({
        message: "Invoice created successfully",
        invoiceId: invoice._id,
      });
    return res.status(400).json({ message: "Invoice creation failed" });
  })
);

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const query = req.query.q || "";
    const type = req.query.type || "All";

    if (!query.trim()) {
      return res.json([]);
    }

    let filter = {};

    if (type === "All") {
      const matchingCustomers = await Customer.find({
        name: { $regex: query, $options: "i" }
      }).select("_id");
      const customerIds = matchingCustomers.map(c => c._id);

      filter = {
        $or: [
          { invoiceNumber: { $regex: query, $options: "i" } },
          { "vehicle.vin": { $regex: query, $options: "i" } },
          { "vehicle.model": { $regex: query, $options: "i" } },
          ...(customerIds.length > 0 ? [{ customer: { $in: customerIds } }] : [])
        ],
      };
    } else if (type === "Invoice Number") {
      filter = { invoiceNumber: { $regex: query, $options: "i" } };
    } else if (type === "Customer Name") {
      const matchingCustomers = await Customer.find({
        name: { $regex: query, $options: "i" }
      }).select("_id");
      const customerIds = matchingCustomers.map(c => c._id);

      if (customerIds.length === 0) {
        return res.json([]);
      }

      filter = { customer: { $in: customerIds } };
    } else if (type === "VIN") {
      filter = { "vehicle.vin": { $regex: query, $options: "i" } };
    }

    const invoices = await Invoice.find(filter)
      .populate("customer", "name phone address")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(invoices);
  })
);

// Get single invoice
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (!isObjectIdOrHexString(id || ""))
      return res.status(404).json({ message: "Invoice not found" });

    const invoice = await Invoice.findById(id)
      .populate("customer")
      .populate("items.item");
    res.json(invoice);
  })
);

export default router;
