import express from 'express';
const router = express.Router();
import asyncHandler from 'express-async-handler';
import Customer from '../models/Customer.js';

// Get all customers
router.get('/', asyncHandler(async (req, res) => {
  const customers = await Customer.find().sort({ createdAt: -1 });
  res.json(customers);
}));

// Search customers
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  const customers = await Customer.find({
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
    ]
  }).sort({ createdAt: -1 });
  res.json(customers);
}));

// Create new customer
router.post('/', asyncHandler(async (req, res) => {
  const { name, phone, address = "" } = req.body;

  if (!name) return res.status(400).json({ message: "Name is required" });
  if (!phone) return res.status(400).json({ message: "Phone is required" });

  const customerExists = await Customer.findOne({ phone, name });
  if (customerExists)
    res.status(400).json({ message: 'Customer with this name and phone already exists' });

  const customer = await Customer.create({
    name,
    phone,
    address
  });
  if (customer)
    res.status(200).json({ message: 'Customer created successfully' });
  res.status(500).json({ message: 'Customer cannot be created.' });
}));

export default router;