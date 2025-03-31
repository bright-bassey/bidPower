import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connect as natsConnect } from 'nats';
import invoiceRoutes from './routes/invoice.routes';
import { NatsService } from './services/nats.service';
import { AppError } from './services/error.service';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 4004;

// Middleware
app.use(cors());
app.use(express.json());

// Global error handler middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  const statusCode = err instanceof AppError ? (err as AppError).statusCode : 500;
  const message = err instanceof AppError ? err.message : 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    message
  });
});

// MongoDB Connection
async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/bidpower');
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

// NATS Connection and Subscription Setup
async function setupNats() {
  try {
    const nc = await natsConnect({ servers: process.env.NATS_URL || 'nats://nats:4222' });
    console.log('Connected to NATS');
    
    // Set up all event subscriptions
    await NatsService.setupSubscriptions(nc);
    
    // Store NATS client for later use
    global.natsClient = nc;
    return nc;
  } catch (error) {
    console.error('NATS connection error:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/invoices', invoiceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Initialize and start the server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Start the HTTP server
    app.listen(PORT, async () => {
      console.log(`Invoice service running on port ${PORT}`);
      
      // Connect to NATS and set up subscriptions
      await setupNats();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// For TypeScript
declare global {
  var natsClient: any;
} 