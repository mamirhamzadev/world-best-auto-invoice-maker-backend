const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Item = require('../models/Item');

// Get all items
router.get('/', asyncHandler(async (req, res) => {
  const items = await Item.find().sort({ name: 1 });
  res.json(items);
}));

// Search items
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  const items = await Item.find({
    name: { $regex: q, $options: 'i' }
  }).sort({ name: 1 });
  res.json(items);
}));

// Create new item
router.post('/', asyncHandler(async (req, res) => {
  const { name, price } = req.body;

  if (!name) return res.status(400).json({ message: 'Item name is required' });
  if (!price) return res.status(400).json({ message: 'Item Unit price is required' });

  const itemExists = await Item.findOne({ name });
  if (itemExists) return res.status(400).json({ message: 'Item with this name already exists' });

  const item = await Item.create({ name, price });
  if (item)
    res.json({ message: 'Item added successfully' });
  res.json({ message: 'Item cannot be added' });
}));

// Update item quantity
router.patch('/:id', asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  const item = await Item.findById(req.params.id);
  if (!item) {
    res.status(404);
    throw new Error('Item not found');
  }

  item.quantity = quantity;
  item.updatedAt = Date.now();
  await item.save();

  res.json(item);
}));

module.exports = router;