import api from './api';

// Base API URL for invoice service
const API_URL = 'http://localhost:3002/api/invoices';

export enum InvoiceStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface Invoice {
  _id: string;
  roomId: string;
  userId: string;
  invoiceNumber: string;
  items: InvoiceItem[];
  tax: number;
  amount: number;
  totalAmount: number;
  status: InvoiceStatus;
  paymentId?: string;
  transactionId?: string;
  createdAt: string;
  paidAt?: string;
  roomName?: string; // Added for UI display purposes
}

// API error interface
interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
}

/**
 * Create a new invoice
 */
export const createInvoice = async (
  roomId: string,
  userId: string,
  amount: number,
  items?: InvoiceItem[],
  tax?: number
): Promise<Invoice> => {
  try {
    console.log('Creating invoice:', { roomId, userId, amount });
    const response = await api.post(`${API_URL}`, {
      roomId,
      userId,
      amount,
      items,
      tax
    });
    console.log('Invoice created:', response);
    return response;
  } catch (error) {
    console.error('Error creating invoice:', error);
    const apiError = error as ApiError;
    if (apiError.status === 400) {
      throw new Error('Missing required fields for invoice creation');
    } else if (apiError.status === 500) {
      throw new Error('Server error while creating invoice');
    }
    throw new Error('Failed to create invoice');
  }
};

/**
 * Create an invoice for auction winner
 */
export const createAuctionInvoice = async (
  roomId: string,
  userId: string,
  bidAmount: number,
  roomName: string
): Promise<Invoice> => {
  try {
    // Calculate tax (10% of bid amount)
    const tax = bidAmount * 0.1;
    
    // Create invoice items
    const items = [
      {
        description: `Winning bid for auction: ${roomName}`,
        amount: bidAmount
      }
    ];
    
    // Create the invoice
    return await createInvoice(roomId, userId, bidAmount, items, tax);
  } catch (error) {
    console.error('Error creating auction invoice:', error);
    throw error;
  }
};

/**
 * Get invoice by ID
 */
export const getInvoiceById = async (invoiceId: string): Promise<Invoice> => {
  try {
    console.log('Fetching invoice:', invoiceId);
    const response = await api.get(`${API_URL}/${invoiceId}`);
    console.log('Invoice fetched:', response);
    return response;
  } catch (error) {
    console.error(`Error fetching invoice ${invoiceId}:`, error);
    const apiError = error as ApiError;
    if (apiError.status === 404) {
      throw new Error('Invoice not found');
    }
    throw new Error('Failed to fetch invoice');
  }
};

/**
 * Get all invoices for a user
 */
export const getUserInvoices = async (userId: string): Promise<Invoice[]> => {
  try {
    console.log('Fetching invoices for user:', userId);
    const response = await api.get(`${API_URL}/user/${userId}`);
    console.log('User invoices fetched:', response);
    return response;
  } catch (error) {
    console.error(`Error fetching invoices for user ${userId}:`, error);
    const apiError = error as ApiError;
    if (apiError.status === 404) {
      // If no invoices are found, return an empty array
      return [];
    }
    throw new Error('Failed to fetch user invoices');
  }
};

/**
 * Process payment for an invoice
 */
export const processPayment = async (
  invoiceId: string,
  paymentMethod: string = 'card',
  paymentDetails: any = { cardToken: 'simulated-payment' }
): Promise<any> => {
  try {
    console.log('Processing payment for invoice:', invoiceId);
    const response = await api.post(`${API_URL}/${invoiceId}/pay`, {
      paymentMethod,
      paymentDetails
    });
    console.log('Payment processed:', response);
    return response;
  } catch (error) {
    console.error(`Error processing payment for invoice ${invoiceId}:`, error);
    const apiError = error as ApiError;
    if (apiError.status === 400) {
      throw new Error('Invoice already paid or invalid payment details');
    } else if (apiError.status === 404) {
      throw new Error('Invoice not found');
    } else if (apiError.status === 500) {
      throw new Error('Payment service unavailable');
    }
    throw new Error('Failed to process payment');
  }
}; 