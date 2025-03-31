import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connect as natsConnect, StringCodec } from 'nats';
import biddingRoutes from './routes/bidding.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/bidpower')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// NATS Connection and Subscription Setup
async function setupNats() {
  try {
    const nc = await natsConnect({ servers: process.env.NATS_URL || 'nats://nats:4222' });
    console.log('Connected to NATS');
    
    const sc = StringCodec();
    
    // Subscribe to user joined room events
    const userJoinedSub = nc.subscribe('user.joined.room');
    (async () => {
      for await (const msg of userJoinedSub) {
        try {
          const data = JSON.parse(sc.decode(msg.data));
          console.log(`User ${data.userId} joined room ${data.roomId}`);
          // You can trigger any necessary logic here when a user joins
        } catch (error) {
          console.error('Error processing user.joined.room message:', error);
        }
      }
    })();
    
    // Subscribe to auction ended events
    const auctionEndedSub = nc.subscribe('auction.ended');
    (async () => {
      for await (const msg of auctionEndedSub) {
        try {
          const data = JSON.parse(sc.decode(msg.data));
          console.log(`Auction ended for room ${data.roomId} with winning bid:`, data.winningBid);
          // You can trigger any necessary logic here when an auction ends
        } catch (error) {
          console.error('Error processing auction.ended message:', error);
        }
      }
    })();
    
    // Store NATS client for later use
    global.natsClient = nc;
    return nc;
  } catch (error) {
    console.error('NATS connection error:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/bids', biddingRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
app.listen(PORT, async () => {
  await setupNats();
  console.log(`Bidding service running on port ${PORT}`);
});

// For TypeScript
declare global {
  var natsClient: any;
} 