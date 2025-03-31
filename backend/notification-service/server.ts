import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import notificationRoutes from './routes/notification.routes';
import { SocketService } from './service/socket.service';
import { NatsService } from './service/nats.service';
import { handleError } from './service/error.service';

dotenv.config();

// Initialize Express and HTTP Server
const app = express();
const server = http.createServer(app);

// Constants
const PORT = process.env.PORT || 4003;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/bidpower';
const NATS_URL = process.env.NATS_URL || 'nats://nats:4222';

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store the Socket.IO instance for use in controllers
app.set('socketio', io);

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

// Routes
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  const appError = handleError(err);
  res.status(appError.statusCode).json({
    success: false,
    message: appError.message
  });
});

// Initialize Socket.IO handlers
function initializeSocketIO() {
  const socketService = new SocketService(io);
  socketService.setupEventHandlers();
  return socketService;
}

// Initialize NATS
async function setupNats() {
  try {
    const natsService = new NatsService(io);
    await natsService.connect(NATS_URL);
    await natsService.setupSubscriptions();
    return natsService;
  } catch (error) {
    console.error('NATS initialization error:', error);
    process.exit(1);
  }
}

// Start application
async function startServer() {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Initialize Socket.IO
    const socketService = initializeSocketIO();
    
    // Initialize NATS
    const natsService = await setupNats();
    
    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`Notification service running on port ${PORT}`);
    });
    
    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      
      // Close NATS connection
      if (natsService) {
        await natsService.disconnect();
      }
      
      // Close MongoDB connection
      await mongoose.disconnect();
      
      // Close HTTP server
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    };
    
    // Listen for termination signals
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the server
startServer();

// For TypeScript
declare global {
  var natsClient: any;
} 