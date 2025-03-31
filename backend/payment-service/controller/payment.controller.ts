import { Request, Response } from 'express';
import Payment, { PaymentMethod, PaymentStatus } from '../model/payment.model';
import { StringCodec } from 'nats';

export const processPayment = async (req: Request, res: Response) => {
  try {
    const { invoiceId, userId, amount, paymentMethod, paymentDetails } = req.body;
    
    if (!invoiceId || !userId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment data' });
    }
    
    // Create payment record
    const payment = new Payment({
      invoiceId,
      userId,
      amount,
      method: paymentMethod || PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.PROCESSING,
      paymentDetails: paymentDetails || {}
    });
    
    // Generate a transaction ID (in real world this would come from payment gateway)
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
        if (global.natsClient) {
          const sc = StringCodec();
          global.natsClient.publish('payment.completed', sc.encode(JSON.stringify({
            paymentId: payment._id,
            invoiceId: payment.invoiceId,
            status: payment.status,
            transactionId: payment.transactionId
          })));
          
          // If payment is successful, update invoice status
          if (isSuccessful) {
            global.natsClient.publish('update.invoice', sc.encode(JSON.stringify({
              invoiceId: payment.invoiceId,
              status: 'paid',
              paymentId: payment._id
            })));
          }
        }
        
        console.log(`Payment ${payment._id} processed with status: ${payment.status}`);
      } catch (error) {
        console.error('Error finalizing payment:', error);
      }
    }, 2000); // Simulate 2 second payment processing time
    
    res.status(202).json({ 
      message: 'Payment processing initiated', 
      payment: {
        id: payment._id,
        status: payment.status,
        transactionId: payment.transactionId
      }
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Error processing payment' });
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    res.status(200).json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ message: 'Error fetching payment' });
  }
};

export const getUserPayments = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
    
    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching user payments:', error);
    res.status(500).json({ message: 'Error fetching user payments' });
  }
};

export const getPaymentsByInvoice = async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.invoiceId;
    const payments = await Payment.find({ invoiceId }).sort({ createdAt: -1 });
    
    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching invoice payments:', error);
    res.status(500).json({ message: 'Error fetching payments' });
  }
}; 