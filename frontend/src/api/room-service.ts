import axios from 'axios';

const API_URL = import.meta.env.VITE_ROOM_SERVICE_URL || 'http://localhost:4001';

const roomServiceApi = axios.create({
  baseURL: `${API_URL}/api/rooms`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Room {
  _id: string;
  name: string;
  description: string;
  startingBid: number;
  currentBid?: number;
  createdBy: string;
  participants: string[];
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomParams {
  name: string;
  description: string;
  startingBid: number;
}

export interface JoinRoomParams {
  userId: string;
}

export interface UpdateBidParams {
  userId: string;
  bidAmount: number;
}

export const roomService = {
  // Get all available rooms
  getAllRooms: async (): Promise<Room[]> => {
    const response = await roomServiceApi.get('/');
    return response.data;
  },

  // Get a specific room by ID
  getRoomById: async (roomId: string): Promise<Room> => {
    const response = await roomServiceApi.get(`/${roomId}`);
    return response.data;
  },

  // Create a new room
  createRoom: async (roomData: CreateRoomParams): Promise<Room> => {
    const token = localStorage.getItem('token');
    const response = await roomServiceApi.post('/', roomData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Join an existing room
  joinRoom: async (roomId: string, userId: string): Promise<any> => {
    try {
      console.log(`Joining room ${roomId} with userId ${userId}`);
      console.log(`API URL: ${API_URL}/api/rooms/${roomId}/join`);
      
      const response = await roomServiceApi.post(`/${roomId}/join`, { userId });
      console.log('Join room response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Error joining room ${roomId}:`, error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  // Update the highest bid for a room
  updateHighestBid: async (roomId: string, data: UpdateBidParams): Promise<Room> => {
    const token = localStorage.getItem('token');
    const response = await roomServiceApi.patch(`/${roomId}/highest-bid`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};

export default roomService; 