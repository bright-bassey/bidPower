import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connect as natsConnect, StringCodec } from 'nats';
import paymentRoutes from './routes/payment.routes';
import Payment, { PaymentMethod, PaymentStatus } from './model/payment.model';
import { AppError, handleError } from './service/error.service';
import { PaymentService } from './service/payment.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4005;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/bidpower')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// NATS Connection and Subscription Setup
async function setupNats() {
  try {
    const nc = await natsConnect({ servers: process.env.NATS_URL || 'nats://nats:4222' });
    console.log('Connected to NATS');
    
    const sc = StringCodec();
    
    // Subscribe to process payment events from invoice service
    const processPaymentSub = nc.subscribe('process.payment');
    (async () => {
      for await (const msg of processPaymentSub) {
        try {
          const data = JSON.parse(sc.decode(msg.data));
          console.log('Payment processing request received:', data);
          
          const { invoiceId, userId, amount } = data;
          
          // Create payment using PaymentService
          await PaymentService.createPayment(
            invoiceId,
            userId,
            amount,
            PaymentMethod.CREDIT_CARD,
            {
              // In a real app, this would come from the user or a secure storage
              cardHolder: 'Test User',
              cardNumber: '**** **** **** 1234' 
            }
          );
          
        } catch (error) {
          const appError = handleError(error);
          console.error('Error processing payment request:', appError);
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
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Global error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const appError = handleError(err);
  console.error('Unhandled error:', appError);
  
  res.status(appError.statusCode).json({
    success: false,
    message: appError.message
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error: Error) => {
  console.error('Unhandled Promise Rejection:', error);
  // In production, you might want to exit the process here
  // process.exit(1);
});

// Start the server
app.listen(PORT, async () => {
  await setupNats();
  console.log(`Payment service running on port ${PORT}`);
});

// For TypeScript
declare global {
  var natsClient: any;
} 