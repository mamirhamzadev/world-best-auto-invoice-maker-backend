import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true
  },
  vehicle: {
    vin: {
      type: String,
      trim: true
    },
    model: {
      type: String,
      trim: true
    }
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  items: [invoiceItemSchema],
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  total_discounted_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  tax: {
    type: Number,
    default: 8,
    min: 0
  },
  deposit: {
    type: Number,
    default: 0,
    min: 0
  },
  refund_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  refund_notes: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  payment_status: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Paid'
  },
  payment_method: {
    type: String,
    enum: ['Cash', 'Card', 'Cheque'],
    default: 'Cash'
  }
}, { timestamps: true });

// Generate invoice number before save
invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    this.invoiceNumber = `INV-${year}${month}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

export default mongoose.model('Invoice', invoiceSchema);