import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  type: 'bid' | 'auction_win' | 'payment' | 'invoice' | 'chat' | 'system';
  title: string;
  message: string;
  recipientType: 'user' | 'room';
  recipientId: mongoose.Types.ObjectId | string;
  data: any;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  type: { 
    type: String, 
    enum: ['bid', 'auction_win', 'payment', 'invoice', 'chat', 'system'],
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  recipientType: { 
    type: String, 
    enum: ['user', 'room'],
    required: true 
  },
  recipientId: { 
    type: Schema.Types.Mixed, 
    required: true 
  },
  data: { 
    type: Schema.Types.Mixed 
  },
  read: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

export default mongoose.model<INotification>('Notification', NotificationSchema); 