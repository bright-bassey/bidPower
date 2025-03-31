import mongoose, { Document, Schema } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer'
}

export interface IPayment extends Document {
  invoiceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
  paymentDetails?: any;
  completedAt?: Date;
  createdAt: Date;
}

const PaymentSchema: Schema = new Schema({
  invoiceId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Invoice', 
    required: true 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    required: true 
  },
  method: { 
    type: String, 
    enum: Object.values(PaymentMethod),
    required: true 
  },
  transactionId: { 
    type: String 
  },
  paymentDetails: { 
    type: Schema.Types.Mixed 
  },
  completedAt: { 
    type: Date 
  }
}, {
  timestamps: true
});

export default mongoose.model<IPayment>('Payment', PaymentSchema); 