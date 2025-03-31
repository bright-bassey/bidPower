import mongoose, { Document, Schema } from 'mongoose';

export enum RoomStatus {
  UPCOMING = 'upcoming',
  LIVE = 'live',
  CLOSED = 'closed'
}

export interface IRoom extends Document {
  name: string;
  description: string;
  status: RoomStatus;
  startTime: Date;
  endTime: Date;
  itemDetails: {
    name: string;
    description: string;
    startingPrice: number;
    imageUrl?: string;
  };
  participants: string[];
  currentHighestBid?: {
    amount: number;
    userId: string;
  };
}

const RoomSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: Object.values(RoomStatus),
    default: RoomStatus.UPCOMING,
    required: true 
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  itemDetails: {
    name: { type: String, required: true },
    description: { type: String, required: true },
    startingPrice: { type: Number, required: true },
    imageUrl: { type: String }
  },
  participants: [{ 
    type: String
  }],
  currentHighestBid: {
    amount: { type: Number },
    userId: { type: String }
  }
}, {
  timestamps: true
});

export default mongoose.model<IRoom>('Room', RoomSchema);