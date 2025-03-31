import mongoose, { Document, Schema } from 'mongoose';

export interface IBid extends Document {
  roomId: string | mongoose.Types.ObjectId;
  userId: string;
  amount: number;
  timestamp: Date;
  username: string;
}

const BidSchema: Schema = new Schema({
  roomId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Room', 
    required: true 
  },
  userId: { 
    type: String, 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  username: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IBid>('Bid', BidSchema); 