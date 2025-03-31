import api from './api';

const API_URL = import.meta.env.VITE_ROOM_SERVICE_URL || 'http://localhost:4001';

export interface Room {
  _id: string;
  name: string;
  description: string;
  status: 'upcoming' | 'live' | 'closed';
  startTime: string;
  endTime: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomPayload {
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
  itemDetails: {
    name: string;
    description: string;
    startingPrice: number;
    imageUrl?: string;
  };
}

export interface BidPayload {
  amount: number;
  userId: string;
  username?: string;
}

class RoomService {
  /**
   * Get all available rooms
   */
  async getAllRooms(): Promise<Room[]> {
    try {
      return await api.get(`${API_URL}/api/rooms`);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  }

  /**
   * Get a specific room by ID
   */
  async getRoomById(roomId: string): Promise<Room> {
    try {
      return await api.get(`${API_URL}/api/rooms/${roomId}`);
    } catch (error) {
      console.error(`Error fetching room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new auction room
   */
  async createRoom(roomData: CreateRoomPayload): Promise<Room> {
    try {
      return await api.post(`${API_URL}/api/rooms`, roomData);
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  /**
   * Join an auction room
   */
  async joinRoom(roomId: string, userId: string): Promise<any> {
    try {
      console.log(`Joining room ${roomId} with userId ${userId}`);
      
      // Direct simple fetch - no credentials needed for this endpoint
      const response = await api.post(`${API_URL}/api/rooms/${roomId}/join`, { userId });
      
      console.log('Join room response:', response);
      return response;
    } catch (error: any) {
      console.error(`Error joining room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Update room's highest bid
   */
  async updateHighestBid(roomId: string, bidData: BidPayload): Promise<Room> {
    try {
      return await api.patch(`${API_URL}/api/rooms/${roomId}/highest-bid`, bidData);
    } catch (error) {
      console.error(`Error updating bid in room ${roomId}:`, error);
      throw error;
    }
  }
}

export default new RoomService(); 