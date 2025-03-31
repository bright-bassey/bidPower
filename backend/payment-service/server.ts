import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connect as natsConnect, StringCodec } from 'nats';
import paymentRoutes from './routes/payment.routes';
import Payment, { PaymentMethod, PaymentStatus } from './model/payment.model';

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
          
          // Create payment record
          const payment = new Payment({
            invoiceId,
            userId,
            amount,
            method: PaymentMethod.CREDIT_CARD, // Default method
            status: PaymentStatus.PROCESSING,
            paymentDetails: {
              // In a real app, this would come from the user or a secure storage
              cardHolder: 'Test User',
              cardNumber: '**** **** **** 1234' // Never store full card numbers
            }
          });
          
          // Generate a transaction ID
          payment.transactionId = `txn_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
          
          await payment.save();
          
          // Simulate payment processing
          setTimeout(async () => {
            try {
              // Simulate successful payment 90% of the time
              const isSuccessful = Math.random() < 0.9;
              
              payment.status = isSuccessful ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;
              
              if (isSuccessful) {
                payment.completedAt = new Date();
              }
              
              await payment.save();
              
              // Publish payment result event
              await nc.publish('payment.completed', sc.encode(JSON.stringify({
                paymentId: payment._id,
                invoiceId: payment.invoiceId,
                status: payment.status,
                transactionId: payment.transactionId
              })));
              
              // If payment is successful, update invoice status
              if (isSuccessful) {
                await nc.publish('update.invoice', sc.encode(JSON.stringify({
                  invoiceId: payment.invoiceId,
                  status: 'paid',
                  paymentId: payment._id
                })));
              }
              
              console.log(`Payment ${payment._id} processed with status: ${payment.status}`);
            } catch (error) {
              console.error('Error finalizing payment:', error);
            }
          }, 2000); // Simulate 2 second payment processing time
          
        } catch (error) {
          console.error('Error processing payment request:', error);
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

// Start the server
app.listen(PORT, async () => {
  await setupNats();
  console.log(`Payment service running on port ${PORT}`);
});

// For TypeScript
declare global {
  var natsClient: any;
} 