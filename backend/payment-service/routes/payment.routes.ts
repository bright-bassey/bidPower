import { Router, RequestHandler } from 'express';
import { 
  processPayment, 
  getPaymentById, 
  getUserPayments,
  getPaymentsByInvoice
} from '../controller/payment.controller';

const router = Router();

// Process a payment
router.post('/process', processPayment as RequestHandler);

// Get a payment by ID
router.get('/:id', getPaymentById as RequestHandler);

// Get all payments for a user
router.get('/user/:userId', getUserPayments as RequestHandler);

// Get all payments for an invoice
router.get('/invoice/:invoiceId', getPaymentsByInvoice as RequestHandler);

export default router; 