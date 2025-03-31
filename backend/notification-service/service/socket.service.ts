import { Server, Socket } from 'socket.io';

export class SocketService {
  private io: Server;
  
  constructor(io: Server) {
    this.io = io;
  }
  
  setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('A client connected:', socket.id);
      
      // Keep track of joined rooms for this socket
      const joinedRooms = new Set<string>();
      
      // Join room for bidding
      socket.on('join_room', (roomId) => this.handleJoinRoom(socket, roomId, joinedRooms));
      
      // Handle chat messages
      socket.on('chat_message', (data) => this.handleChatMessage(socket, data));
      
      // Join user's personal notification channel
      socket.on('join_user', (userId) => this.handleJoinUser(socket, userId, joinedRooms));
      
      // Leave room
      socket.on('leave_room', (roomId) => this.handleLeaveRoom(socket, roomId, joinedRooms));
      
      // Disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Clean up any tracking when socket disconnects
        joinedRooms.clear();
      });
    });
  }
  
  private handleJoinRoom(socket: Socket, roomId: any, joinedRooms: Set<string>) {
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
  }
  
  private handleChatMessage(socket: Socket, data: any) {
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
      this.io.to(data.roomId).emit('chat_message', {
        userId: data.userId,
        username: data.username || 'Anonymous',
        message: data.message,
        roomId: data.roomId,
        timestamp: data.timestamp || new Date().toISOString(),
        messageId: data.messageId || `server_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      });
      
      console.log(`Chat message broadcast to room ${data.roomId}`);
    } catch (error) {
      console.error('Error processing chat message:', error);
    }
  }
  
  private handleJoinUser(socket: Socket, userId: any, joinedRooms: Set<string>) {
    try {
      // Validate userId
      if (!userId || typeof userId !== 'string') {
        console.error(`Invalid userId: ${userId}`);
        return;
      }
      
      const userChannel = `user:${userId}`;
      
      // Avoid redundant join operations
      if (joinedRooms.has(userChannel)) {
        console.log(`Socket ${socket.id} already in user channel ${userChannel}, skipping join`);
        return;
      }
      
      socket.join(userChannel);
      joinedRooms.add(userChannel);
      console.log(`Socket ${socket.id} joined user channel for ${userId}`);
    } catch (error) {
      console.error(`Error joining user channel for ${userId}:`, error);
    }
  }
  
  private handleLeaveRoom(socket: Socket, roomId: any, joinedRooms: Set<string>) {
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
  }
}
