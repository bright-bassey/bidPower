import mongoose, { Document, Schema } from 'mongoose';

export enum InvoiceStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface IInvoice extends Document {
  roomId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  items: InvoiceItem[];
  tax: number;
  amount: number;
  totalAmount: number;
  status: InvoiceStatus;
  paymentId?: mongoose.Types.ObjectId;
  transactionId?: string;
  createdAt: Date;
  paidAt?: Date;
}

const InvoiceSchema: Schema = new Schema({
  roomId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Room', 
    required: true 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  invoiceNumber: { 
    type: String,
    required: true,
    unique: true
  },
  items: [{
    description: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  tax: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: { 
    type: String, 
    enum: Object.values(InvoiceStatus),
    default: InvoiceStatus.PENDING,
    required: true 
  },
  paymentId: {
    type: Schema.Types.ObjectId,
    ref: 'Payment'
  },
  transactionId: {
    type: String
  },
  paidAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate unique invoice number before save
InvoiceSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${Date.now()}-${count + 1}`;
  }
  next();
});

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema); 