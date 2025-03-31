import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connect as natsConnect, StringCodec } from 'nats';
import roomRoutes from './routes/room.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/bidpower')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// NATS Connection
async function connectToNats() {
  try {
    const nc = await natsConnect({ servers: process.env.NATS_URL || 'nats://nats:4222' });
    console.log('Connected to NATS');
    
    const sc = StringCodec();
    
    // Subscribe to bid.placed events to update room's highest bid
    const bidPlacedSub = nc.subscribe('bid.placed');
    (async () => {
      for await (const msg of bidPlacedSub) {
        try {
          const data = JSON.parse(sc.decode(msg.data));
          console.log('Received bid.placed event:', data);
          
          // Update room's highest bid
          const { roomId, userId, amount } = data;
          
          const room = await mongoose.model('Room').findById(roomId);
          if (room && (!room.currentHighestBid || amount > room.currentHighestBid.amount)) {
            room.currentHighestBid = { amount, userId };
            await room.save();
            console.log(`Updated highest bid for room ${roomId} to ${amount}`);
          }
        } catch (error) {
          console.error('Error processing bid.placed message:', error);
        }
      }
    })();
    
    // Set up global NATS client for use in controllers
    global.natsClient = nc;
    return nc;
  } catch (error) {
    console.error('NATS connection error:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/rooms', roomRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
app.listen(PORT, async () => {
  await connectToNats();
  console.log(`Room service running on port ${PORT}`);
});

// For TypeScript
declare global {
  var natsClient: any;
}