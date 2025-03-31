import api from './api';

// Base API URL for payment service
const API_URL = 'http://localhost:3003/api/payments';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export interface Payment {
  _id: string;
  userId: string;
  invoiceId: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// API error interface
interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
}

/**
 * Process a payment for an invoice
 */
export const processPayment = async (
  userId: string,
  invoiceId: string, 
  amount: number,
  paymentMethod: string = 'card',
  paymentDetails: any = {}
): Promise<Payment> => {
  try {
    console.log('Processing payment:', { invoiceId, amount, paymentMethod });
    const response = await api.post(`${API_URL}/process`, {
      userId,
      invoiceId,
      amount,
      paymentMethod,
      paymentDetails
    });
    console.log('Payment processed:', response);
    return response;
  } catch (error) {
    console.error('Error processing payment:', error);
    const apiError = error as ApiError;
    if (apiError.status === 400) {
      throw new Error('Invalid payment details');
    } else if (apiError.status === 500) {
      throw new Error('Payment service unavailable');
    }
    throw new Error('Failed to process payment');
  }
};

/**
 * Get payment by ID
 */
export const getPaymentById = async (paymentId: string): Promise<Payment> => {
  try {
    console.log('Fetching payment:', paymentId);
    const response = await api.get(`${API_URL}/${paymentId}`);
    console.log('Payment fetched:', response);
    return response;
  } catch (error) {
    console.error(`Error fetching payment ${paymentId}:`, error);
    const apiError = error as ApiError;
    if (apiError.status === 404) {
      throw new Error('Payment not found');
    }
    throw new Error('Failed to fetch payment');
  }
};

/**
 * Get all payments for a user
 */
export const getUserPayments = async (userId: string): Promise<Payment[]> => {
  try {
    console.log('Fetching payments for user:', userId);
    const response = await api.get(`${API_URL}/user/${userId}`);
    console.log('User payments fetched:', response);
    return response;
  } catch (error) {
    console.error(`Error fetching payments for user ${userId}:`, error);
    const apiError = error as ApiError;
    if (apiError.status === 404) {
      // If no payments found, return empty array
      return [];
    }
    throw new Error('Failed to fetch user payments');
  }
};

/**
 * Get all payments for an invoice
 */
export const getPaymentsByInvoice = async (invoiceId: string): Promise<Payment[]> => {
  try {
    console.log('Fetching payments for invoice:', invoiceId);
    const response = await api.get(`${API_URL}/invoice/${invoiceId}`);
    console.log('Invoice payments fetched:', response);
    return response;
  } catch (error) {
    console.error(`Error fetching payments for invoice ${invoiceId}:`, error);
    const apiError = error as ApiError;
    if (apiError.status === 404) {
      // If no payments found, return empty array
      return [];
    }
    throw new Error('Failed to fetch invoice payments');
  }
}; 