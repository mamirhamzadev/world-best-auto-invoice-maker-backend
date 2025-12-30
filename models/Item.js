import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
}, { timestamps: true });

export default mongoose.model('Item', itemSchema);