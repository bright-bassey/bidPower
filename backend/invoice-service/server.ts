import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connect as natsConnect, StringCodec } from 'nats';
import invoiceRoutes from './routes/invoice.routes';
import Invoice, { InvoiceStatus } from './model/invoice.model';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4004;

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
    
    // Subscribe to generate invoice events from notification service
    const generateInvoiceSub = nc.subscribe('generate.invoice');
    (async () => {
      for await (const msg of generateInvoiceSub) {
        try {
          const data = JSON.parse(sc.decode(msg.data));
          console.log('Generate invoice request received:', data);
          
          // Extract data from the message
          const { roomId, userId, bidAmount } = data;
          
          // Generate invoice
          const invoice = new Invoice({
            roomId,
            userId,
            amount: bidAmount,
            items: [
              {
                description: 'Winning auction bid',
                amount: bidAmount
              }
            ],
            tax: bidAmount * 0.1, // 10% tax as an example
            totalAmount: bidAmount * 1.1,
            status: InvoiceStatus.PENDING
          });
          
          await invoice.save();
          console.log(`Invoice ${invoice.invoiceNumber} created for user ${userId}`);
          
          // Notify client about the invoice
          await nc.publish('invoice.created', sc.encode(JSON.stringify({
            invoiceId: invoice._id,
            userId,
            amount: invoice.totalAmount,
            invoiceNumber: invoice.invoiceNumber
          })));
          
        } catch (error) {
          console.error('Error processing generate.invoice message:', error);
        }
      }
    })();
    
    // Subscribe to update invoice events from payment service
    const updateInvoiceSub = nc.subscribe('update.invoice');
    (async () => {
      for await (const msg of updateInvoiceSub) {
        try {
          const data = JSON.parse(sc.decode(msg.data));
          console.log('Update invoice request received:', data);
          
          const { invoiceId, status, paymentId } = data;
          
          const invoice = await Invoice.findById(invoiceId);
          if (invoice) {
            invoice.status = status;
            
            if (status === InvoiceStatus.PAID) {
              invoice.paidAt = new Date();
              invoice.paymentId = paymentId;
            }
            
            await invoice.save();
            console.log(`Invoice ${invoice.invoiceNumber} updated to status ${status}`);
            
            // Notify clients about invoice update
            await nc.publish('invoice.updated', sc.encode(JSON.stringify({
              invoiceId: invoice._id,
              status: invoice.status,
              invoiceNumber: invoice.invoiceNumber,
              paymentId: invoice.paymentId
            })));
          }
        } catch (error) {
          console.error('Error processing update.invoice message:', error);
        }
      }
    })();
    
    // Subscribe to payment completed events from payment service
    const paymentCompletedSub = nc.subscribe('payment.completed');
    (async () => {
      for await (const msg of paymentCompletedSub) {
        try {
          const data = JSON.parse(sc.decode(msg.data));
          console.log('Payment completed event received:', data);
          
          const { paymentId, invoiceId, status, transactionId } = data;
          
          if (status === 'COMPLETED') {
            const invoice = await Invoice.findById(invoiceId);
            if (invoice) {
              invoice.status = InvoiceStatus.PAID;
              invoice.paidAt = new Date();
              invoice.paymentId = paymentId;
              invoice.transactionId = transactionId;
              
              await invoice.save();
              console.log(`Invoice ${invoice.invoiceNumber} marked as paid`);
              
              // Notify clients about invoice payment
              await nc.publish('invoice.paid', sc.encode(JSON.stringify({
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                paymentId,
                transactionId,
                paidAt: invoice.paidAt
              })));
            }
          } else if (status === 'FAILED') {
            const invoice = await Invoice.findById(invoiceId);
            if (invoice) {
              invoice.status = InvoiceStatus.PENDING;
              await invoice.save();
              console.log(`Payment failed for invoice ${invoice.invoiceNumber}, status reset to pending`);
            }
          }
        } catch (error) {
          console.error('Error processing payment.completed message:', error);
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
app.use('/api/invoices', invoiceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
app.listen(PORT, async () => {
  await setupNats();
  console.log(`Invoice service running on port ${PORT}`);
});

// For TypeScript
declare global {
  var natsClient: any;
} 