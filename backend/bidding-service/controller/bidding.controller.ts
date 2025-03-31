import { Request, Response } from 'express';
import Bid from '../model/bid.model';
import { StringCodec } from 'nats';
import mongoose from 'mongoose';

export const placeBid = async (req: Request, res: Response) => {
  try {
    const { roomId, userId, amount, username } = req.body;
    
    if (!roomId || !userId || !amount || amount <= 0 || !username) {
      return res.status(400).json({ message: 'Invalid bid data' });
    }
    
    // Convert roomId to ObjectId if it's a valid one
    // If roomId isn't a valid ObjectId format, this will throw an error 
    // that will be caught and handled properly
    let roomObjectId;
    try {
      roomObjectId = new mongoose.Types.ObjectId(roomId);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid room ID format' });
    }
    
    // Create new bid with userId as string
    const bid = new Bid({
      roomId: roomObjectId,
      userId, // Keep as string
      amount,
      username,
      timestamp: new Date()
    });
    
    await bid.save();
    
    // Publish bid event to NATS
    if (global.natsClient) {
      const sc = StringCodec();
      await global.natsClient.publish('bid.placed', sc.encode(JSON.stringify({
        roomId,
        userId,
        amount,
        username,
        bidId: bid._id,
        timestamp: bid.timestamp
      })));
    }
    
    res.status(201).json(bid);
  } catch (error) {
    console.error('Error placing bid:', error);
    res.status(500).json({ message: 'Error placing bid' });
  }
};

export const getBidsByRoom = async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId;
    
    // Validate roomId is a valid ObjectId
    let roomObjectId;
    try {
      roomObjectId = new mongoose.Types.ObjectId(roomId);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid room ID format' });
    }
    
    // Find bids by roomId as ObjectId
    const bids = await Bid.find({ roomId: roomObjectId }).sort({ timestamp: -1 });
    
    res.status(200).json(bids);
  } catch (error) {
    console.error('Error fetching bids:', error);
    res.status(500).json({ message: 'Error fetching bids' });
  }
};

export const getHighestBid = async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId;
    
    // Validate roomId is a valid ObjectId
    let roomObjectId;
    try {
      roomObjectId = new mongoose.Types.ObjectId(roomId);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid room ID format' });
    }
    
    // Find highest bid for the room using ObjectId
    const highestBid = await Bid.findOne({ roomId: roomObjectId }).sort({ amount: -1 });
    
    if (!highestBid) {
      return res.status(404).json({ message: 'No bids found for this room' });
    }
    
    res.status(200).json(highestBid);
  } catch (error) {
    console.error('Error fetching highest bid:', error);
    res.status(500).json({ message: 'Error fetching highest bid' });
  }
}; 