import api from './api';

const API_URL = import.meta.env.VITE_BIDDING_SERVICE_URL || 'http://localhost:4002';

export interface BidData {
  roomId: string;
  userId: string;
  amount: number;
  username: string;
  previousHighestBidder?: string | null;
  roomName?: string;
}

export interface Bid {
  _id: string;
  roomId: string;
  userId: string;
  amount: number;
  timestamp: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

class BiddingService {
  /**
   * Place a new bid
   */
  async placeBid(bidData: BidData): Promise<Bid> {
    // Make a copy of the data to avoid mutations affecting original state
    const bidDataCopy = { ...bidData };
    
    try {
      console.log('Placing bid with data:', bidDataCopy);
      
      // Ensure bidData has all required fields
      if (!bidDataCopy.roomId || !bidDataCopy.userId || !bidDataCopy.amount) {
        throw new Error('Missing required bid data');
      }
      
      // Validate amount is a positive number
      if (typeof bidDataCopy.amount !== 'number' || bidDataCopy.amount <= 0) {
        throw new Error('Bid amount must be a positive number');
      }
      
      const response = await api.post(`${API_URL}/api/bids`, bidDataCopy);
      console.log('Bid placed successfully:', response);
      return response;
    } catch (error: any) {
      console.error('Error placing bid:', error);
      
      // Enhance error message based on error response
      if (error.response) {
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.message || 'Unknown error';
        
        if (statusCode === 400) {
          throw new Error(`Invalid bid data: ${errorMessage}`);
        } else if (statusCode === 404) {
          throw new Error('Auction room not found');
        } else if (statusCode === 500) {
          throw new Error('Server error when placing bid. Please try again.');
        }
      }
      
      // If it's another type of error, include its message
      if (error.message) {
        throw new Error(`Bid failed: ${error.message}`);
      }
      
      throw new Error('Failed to place bid. Please try again.');
    }
  }

  /**
   * Get all bids for a specific room
   */
  async getBidsByRoom(roomId: string, timestamp?: number): Promise<Bid[]> {
    if (!roomId) {
      console.warn('Attempted to fetch bids without a valid roomId');
      return [];
    }
    
    try {
      console.log(`Fetching bids for room ${roomId}`);
      // Add optional timestamp parameter to create a unique URL and bypass cache
      const url = timestamp 
        ? `${API_URL}/api/bids/room/${roomId}?t=${timestamp}` 
        : `${API_URL}/api/bids/room/${roomId}`;
      
      const response = await api.get(url);
      return response;
    } catch (error: any) {
      console.error(`Error fetching bids for room ${roomId}:`, error);
      
      // Custom error handling for bid history
      if (error.response?.status === 404) {
        return []; // Return empty array for no bids
      }
      
      // For other errors, return empty array instead of throwing
      // This prevents UI crashes when bid history can't be loaded
      console.warn('Returning empty bid history due to error');
      return [];
    }
  }

  /**
   * Get the highest bid for a specific room
   */
  async getHighestBid(roomId: string): Promise<Bid | null> {
    if (!roomId) {
      console.warn('Attempted to fetch highest bid without a valid roomId');
      return null;
    }
    
    try {
      console.log(`Fetching highest bid for room ${roomId}`);
      return await api.get(`${API_URL}/api/bids/room/${roomId}/highest`);
    } catch (error: any) {
      // If the error is 404 (no bids), return null instead of throwing an error
      if (error.response?.status === 404) {
        console.log(`No bids found for room ${roomId}`);
        return null;
      }
      console.error(`Error fetching highest bid for room ${roomId}:`, error);
      return null; // Return null rather than throwing to prevent UI crashes
    }
  }
}

export default new BiddingService(); 