import Bid from '../model/bid.model';
import { StringCodec } from 'nats';
import mongoose from 'mongoose';
import { DatabaseError, NotFoundError } from './error.service';

export class BidService {
    static async createBid(
        roomObjectId: mongoose.Types.ObjectId,
        userId: string,
        amount: number,
        username: string
    ) {
        try {
            const bid = new Bid({
                roomId: roomObjectId,
                userId,
                amount,
                username,
                timestamp: new Date()
            });
            
            await bid.save();
            
            // Publish bid event to NATS
            if (global.natsClient) {
                const sc = StringCodec();
                await global.natsClient.publish('bid.placed', sc.encode(JSON.stringify({
                    roomId: roomObjectId.toString(),
                    userId,
                    amount,
                    username,
                    bidId: bid._id,
                    timestamp: bid.timestamp
                })));
            }
            
            return bid;
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to create bid: ${error.message}`);
            }
            throw new DatabaseError('Failed to create bid');
        }
    }
    
    static async getBidsByRoom(roomObjectId: mongoose.Types.ObjectId) {
        try {
            return await Bid.find({ roomId: roomObjectId }).sort({ timestamp: -1 });
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to fetch bids: ${error.message}`);
            }
            throw new DatabaseError('Failed to fetch bids');
        }
    }
    
    static async getHighestBid(roomObjectId: mongoose.Types.ObjectId) {
        try {
            const highestBid = await Bid.findOne({ roomId: roomObjectId }).sort({ amount: -1 });
            
            if (!highestBid) {
                throw new NotFoundError('No bids found for this room');
            }
            
            return highestBid;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to fetch highest bid: ${error.message}`);
            }
            throw new DatabaseError('Failed to fetch highest bid');
        }
    }
}
