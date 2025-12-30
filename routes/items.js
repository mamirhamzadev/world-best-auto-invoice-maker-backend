import express from 'express';
const router = express.Router();
import asyncHandler from 'express-async-handler';
import Item from '../models/Item.js';

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
router.patch('/', asyncHandler(async (req, res) => {
  const { _id, name, price } = req.body;

  const existingItem = await Item.findOne({ name, _id: { $ne: _id } });
  if (existingItem)
    return res.status(400).json({ message: 'Another item with this name already exists' });
  const item = await Item.findById(_id);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  item.name = name;
  item.price = price;
  await item.save();
  res.json(item);
}));

export default router;