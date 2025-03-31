import { Router } from 'express';
import { PaymentController } from '../controller/payment.controller';

const router = Router();
const paymentController = new PaymentController();

// Process a payment
router.post('/process', paymentController.processPayment);

// Get a payment by ID
router.get('/:id', paymentController.getPaymentById);

// Get all payments for a user
router.get('/user/:userId', paymentController.getUserPayments);

// Get all payments for an invoice
router.get('/invoice/:invoiceId', paymentController.getPaymentsByInvoice);

export default router; 