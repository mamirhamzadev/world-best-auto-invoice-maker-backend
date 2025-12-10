const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Customer = require('../models/Customer');

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
      { phone: { $regex: q, $options: 'i' } }
    ]
  }).limit(10);
  res.json(customers);
}));

// Create new customer
router.post('/', asyncHandler(async (req, res) => {
  const { name, phone, address } = req.body;
  
  const customerExists = await Customer.findOne({ phone });
  if (customerExists) {
    res.status(400);
    throw new Error('Customer with this phone already exists');
  }
  
  const customer = await Customer.create({
    name,
    phone,
    address
  });
  
  res.status(201).json(customer);
}));

module.exports = router;