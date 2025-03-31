import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connect as natsConnect, StringCodec } from 'nats';
import notificationRoutes from './routes/notification.routes';
import Notification from './model/notification.model';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 4003;

// Store the Socket.IO instance for use in controllers
app.set('socketio', io);

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/bidpower')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  
  // Keep track of joined rooms for this socket
  const joinedRooms = new Set<string>();
  
  // Join room for bidding
  socket.on('join_room', (roomId) => {
    try {
      // Validate roomId
      if (!roomId || typeof roomId !== 'string') {
        console.error(`Invalid roomId: ${roomId}`);
        return;
      }
  
      // Avoid redundant join operations
      if (joinedRooms.has(roomId)) {
        console.log(`Socket ${socket.id} already in room ${roomId}, skipping join`);
        return;
      }
      
      socket.join(roomId);
      joinedRooms.add(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    } catch (error) {
      console.error(`Error joining room ${roomId}:`, error);
    }
  });
  
  // Handle chat messages
  socket.on('chat_message', (data) => {
    console.log(`Chat message received: ${JSON.stringify(data)}`);
    
    if (!data.roomId || !data.userId || !data.message) {
      console.error('Invalid chat message data:', data);
      return;
    }
    
    try {
      // Check if this is a duplicate message - sometimes clients send twice
      const messageKey = `${data.userId}_${data.roomId}_${data.message}`;
      const now = Date.now();
      const recentMessages = socket.data.recentMessages || {};
      
      // Check if this message was processed in the last 5 seconds
      if (recentMessages[messageKey] && now - recentMessages[messageKey] < 5000) {
        console.log(`Ignoring duplicate message: ${messageKey}`);
        return;
      }
      
      // Store this message timestamp
      recentMessages[messageKey] = now;
      socket.data.recentMessages = recentMessages;
      
      // Clean up old messages (older than 30 seconds)
      Object.keys(recentMessages).forEach(key => {
        if (now - recentMessages[key] > 30000) {
          delete recentMessages[key];
        }
      });
      
      // Broadcast to everyone in the room including detailed info
      io.to(data.roomId).emit('chat_message', {
        userId: data.userId,
        username: data.username || 'Anonymous',
        message: data.message,
        roomId: data.roomId,
        timestamp: data.timestamp || new Date().toISOString(),
        messageId: data.messageId || `server_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      });
      
      console.log(`Chat message broadcast to room ${data.roomId}`);
      
      // Save to database if needed - but don't save if MongoDB isn't connected
      // Chat messages are ephemeral - no need to save them to avoid the validation error
      // Only broadcast them in real-time
      
      // If we really need to save these in the future, we can modify the schema
      // or use a different collection specifically for chat messages
    } catch (error) {
      console.error('Error processing chat message:', error);
    }
  });
  
  // Join user's personal notification channel
  socket.on('join_user', (userId) => {
    const userChannel = `user:${userId}`;
    
    // Avoid redundant join operations
    if (joinedRooms.has(userChannel)) {
      console.log(`Socket ${socket.id} already in user channel ${userChannel}, skipping join`);
      return;
    }
    
    socket.join(userChannel);
    joinedRooms.add(userChannel);
    console.log(`Socket ${socket.id} joined user channel for ${userId}`);
  });
  
  // Leave room
  socket.on('leave_room', (roomId) => {
    try {
      // Validate roomId
      if (!roomId || typeof roomId !== 'string') {
        console.error(`Invalid roomId for leave: ${roomId}`);
        return;
      }
    
      socket.leave(roomId);
      joinedRooms.delete(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    } catch (error) {
      console.error(`Error leaving room ${roomId}:`, error);
    }
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Clean up any tracking when socket disconnects
    joinedRooms.clear();
  });
});

// NATS Connection and Subscription Setup
async function setupNats() {
  try {
    const nc = await natsConnect({ servers: process.env.NATS_URL || 'nats://nats:4222' });
    console.log('Connected to NATS');
    
    const sc = StringCodec();
    
    // Subscribe to bid placed events
    const bidPlacedSub = nc.subscribe('bid.placed');
    (async () => {
      for await (const msg of bidPlacedSub) {
        try {
          const bidData = JSON.parse(sc.decode(msg.data));
          console.log('New bid received:', bidData);
          
          // Create room notification for all participants
          const roomNotification = new Notification({
            type: 'bid',
            title: 'New Bid Placed',
            message: `${bidData.username} placed a bid of $${bidData.amount}`,
            recipientType: 'room',
            recipientId: bidData.roomId,
            data: bidData
          });
          await roomNotification.save();
          
          // If the bid was placed by someone else, notify the previous highest bidder
          if (bidData.previousHighestBidder && bidData.previousHighestBidder !== bidData.userId) {
            try {
              const userNotification = new Notification({
                type: 'bid',
                title: 'You\'ve Been Outbid!',
                message: `Someone placed a higher bid of $${bidData.amount} in ${bidData.roomName || 'an auction room'}`,
                recipientType: 'user',
                recipientId: bidData.previousHighestBidder,
                data: bidData
              });
              await userNotification.save();
              
              // Emit to the outbid user
              io.to(`user:${bidData.previousHighestBidder}`).emit('notification', userNotification);
            } catch (error) {
              console.error('Error creating outbid notification:', error);
            }
          }
          
          // Emit to room
          io.to(bidData.roomId).emit('new_bid', {
            ...bidData,
            notificationType: 'bid'
          });
          
          // Also emit room notification to all room participants
          io.to(bidData.roomId).emit('notification', roomNotification);
        } catch (error) {
          console.error('Error processing bid.placed message:', error);
        }
      }
    })();
    
    // Subscribe to auction ended events
    const auctionEndedSub = nc.subscribe('auction.ended');
    (async () => {
      for await (const msg of auctionEndedSub) {
        try {
          const data = JSON.parse(sc.decode(msg.data));
          console.log('Auction ended:', data);
          
          // Check if winningBid exists and has a userId field
          if (data.winningBid && data.winningBid.userId) {
            // Save notification for winner
            const winnerNotification = new Notification({
              type: 'auction_win',
              title: 'Congratulations! You Won',
              message: `You won the auction for room ${data.roomId}`,
              recipientType: 'user',
              recipientId: data.winningBid.userId,
              data: data
            });
            await winnerNotification.save();
            
            // Emit to room
            io.to(data.roomId).emit('auction_ended', {
              roomId: data.roomId,
              winnerId: data.winningBid.userId,
              winningBid: data.winningBid.amount,
              notificationType: 'auction_ended'
            });
            
            // Emit to winner
            io.to(`user:${data.winningBid.userId}`).emit('auction_win', {
              roomId: data.roomId,
              winnerId: data.winningBid.userId,
              winningBid: data.winningBid.amount,
              notificationType: 'auction_win'
            });
            
            // Notify invoice service
            await nc.publish('generate.invoice', sc.encode(JSON.stringify({
              roomId: data.roomId,
              userId: data.winningBid.userId,
              bidAmount: data.winningBid.amount
            })));
          } else {
            console.log('Auction ended but no valid winning bid found:', data);
            
            // Create room notification about auction ending with no winner
            const roomNotification = new Notification({
              type: 'system',
              title: 'Auction Ended',
              message: `The auction for room ${data.roomId} has ended without a winner.`,
              recipientType: 'room',
              recipientId: data.roomId,
              data: data
            });
            await roomNotification.save();
            
            // Emit to room
            io.to(data.roomId).emit('auction_ended', {
              roomId: data.roomId,
              notificationType: 'auction_ended'
            });
          }
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
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
server.listen(PORT, async () => {
  await setupNats();
  console.log(`Notification service running on port ${PORT}`);
});

// For TypeScript
declare global {
  var natsClient: any;
} 