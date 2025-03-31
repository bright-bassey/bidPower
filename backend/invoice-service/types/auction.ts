export interface RoomInfo {
  _id: string;
  name: string;
  description?: string;
  status: 'upcoming' | 'live' | 'closed';
  startTime: string;
  endTime: string;
  participants: string[];
  itemDetails: {
    name: string;
    description?: string;
    startingPrice: number;
    imageUrl?: string;
  };
  currentHighestBid?: {
    userId: string;
    amount: number;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BidInfo {
  _id: string;
  roomId: string;
  userId: string;
  username: string;
  amount: number;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  description: string;
  amount: number;
  quantity?: number;
}

export interface InvoiceData {
  roomId: string;
  userId: string;
  amount: number;
  items: InvoiceItem[];
  tax: number;
  totalAmount: number;
}

export interface AuctionEndEvent {
  roomId: string;
  winnerId: string;
  winningBid: number;
  timestamp: string;
} 