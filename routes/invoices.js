const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Invoice = require('../models/Invoice');
const Item = require('../models/Item');

// Get all invoices
router.get('/', asyncHandler(async (req, res) => {
  const invoices = await Invoice.find().sort({ createdAt: -1 });
  res.json(invoices);
}));

// Create new invoice
router.post('/', asyncHandler(async (req, res) => {
  const {
    vin,
    yearModel,
    customer,
    items,
    discount,
    tax,
    deposit,
    refundAmount,
    refundReason,
    notes,
    paymentStatus,
    paymentMethod
  } = req.body;

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (discount / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (tax / 100);
  const grandTotal = taxableAmount + taxAmount - deposit - refundAmount;

  // Update item quantities in inventory
  for (const item of items) {
    const existingItem = await Item.findOne({ name: item.name });
    if (existingItem) {
      existingItem.quantity -= item.quantity;
      existingItem.updatedAt = Date.now();
      await existingItem.save();
    }
  }

  const invoice = await Invoice.create({
    vin,
    yearModel,
    customer,
    items,
    subtotal,
    discount,
    discountAmount,
    tax,
    taxAmount,
    deposit,
    refundAmount,
    refundReason,
    grandTotal,
    notes,
    paymentStatus,
    paymentMethod
  });

  res.status(201).json(invoice);
}));

// Get single invoice
router.get('/:id', asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }
  res.json(invoice);
}));

// Delete invoice
router.delete('/:id', asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }
  
  // Restore item quantities
  for (const item of invoice.items) {
    const existingItem = await Item.findOne({ name: item.name });
    if (existingItem) {
      existingItem.quantity += item.quantity;
      existingItem.updatedAt = Date.now();
      await existingItem.save();
    }
  }
  
  await invoice.deleteOne();
  res.json({ message: 'Invoice removed' });
}));

module.exports = router;