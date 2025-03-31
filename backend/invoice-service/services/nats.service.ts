import { NatsConnection, StringCodec } from 'nats';
import Invoice, { InvoiceStatus } from '../model/invoice.model';
import mongoose from 'mongoose';
import { DatabaseError } from './error.service';

export class NatsService {
  private static sc = StringCodec();

  static async handleGenerateInvoice(nc: NatsConnection, msg: any) {
    try {
      const data = JSON.parse(this.sc.decode(msg.data));
      console.log('Generate invoice request received:', data);
      
      // Extract data from the message
      const { roomId, userId, bidAmount } = data;
      
      // Generate invoice
      const invoice = new Invoice({
        roomId: new mongoose.Types.ObjectId(roomId),
        userId: new mongoose.Types.ObjectId(userId),
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
      await nc.publish('invoice.created', this.sc.encode(JSON.stringify({
        invoiceId: invoice._id,
        userId,
        amount: invoice.totalAmount,
        invoiceNumber: invoice.invoiceNumber
      })));
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error processing generate.invoice message:', error);
        throw new DatabaseError(`Failed to generate invoice: ${error.message}`);
      }
      throw new DatabaseError('Failed to generate invoice');
    }
  }

  static async handleUpdateInvoice(nc: NatsConnection, msg: any) {
    try {
      const data = JSON.parse(this.sc.decode(msg.data));
      console.log('Update invoice request received:', data);
      
      const { invoiceId, status, paymentId } = data;
      
      const invoice = await Invoice.findById(invoiceId);
      if (invoice) {
        invoice.status = status;
        
        if (status === InvoiceStatus.PAID) {
          invoice.paidAt = new Date();
          if (paymentId) {
            invoice.paymentId = new mongoose.Types.ObjectId(paymentId);
          }
        }
        
        await invoice.save();
        console.log(`Invoice ${invoice.invoiceNumber} updated to status ${status}`);
        
        // Notify clients about invoice update
        await nc.publish('invoice.updated', this.sc.encode(JSON.stringify({
          invoiceId: invoice._id,
          status: invoice.status,
          invoiceNumber: invoice.invoiceNumber,
          paymentId: invoice.paymentId
        })));
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error processing update.invoice message:', error);
        throw new DatabaseError(`Failed to update invoice: ${error.message}`);
      }
      throw new DatabaseError('Failed to update invoice');
    }
  }

  static async handlePaymentCompleted(nc: NatsConnection, msg: any) {
    try {
      const data = JSON.parse(this.sc.decode(msg.data));
      console.log('Payment completed event received:', data);
      
      const { paymentId, invoiceId, status, transactionId } = data;
      
      if (status === 'COMPLETED') {
        const invoice = await Invoice.findById(invoiceId);
        if (invoice) {
          invoice.status = InvoiceStatus.PAID;
          invoice.paidAt = new Date();
          if (paymentId) {
            invoice.paymentId = new mongoose.Types.ObjectId(paymentId);
          }
          invoice.transactionId = transactionId;
          
          await invoice.save();
          console.log(`Invoice ${invoice.invoiceNumber} marked as paid`);
          
          // Notify clients about invoice payment
          await nc.publish('invoice.paid', this.sc.encode(JSON.stringify({
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
      if (error instanceof Error) {
        console.error('Error processing payment.completed message:', error);
        throw new DatabaseError(`Failed to process payment completion: ${error.message}`);
      }
      throw new DatabaseError('Failed to process payment completion');
    }
  }

  static async setupSubscriptions(nc: NatsConnection) {
    // Subscribe to generate invoice events
    const generateInvoiceSub = nc.subscribe('generate.invoice');
    (async () => {
      for await (const msg of generateInvoiceSub) {
        try {
          await this.handleGenerateInvoice(nc, msg);
        } catch (error) {
          console.error('Error in generate.invoice handler:', error);
        }
      }
    })();
    
    // Subscribe to update invoice events
    const updateInvoiceSub = nc.subscribe('update.invoice');
    (async () => {
      for await (const msg of updateInvoiceSub) {
        try {
          await this.handleUpdateInvoice(nc, msg);
        } catch (error) {
          console.error('Error in update.invoice handler:', error);
        }
      }
    })();
    
    // Subscribe to payment completed events
    const paymentCompletedSub = nc.subscribe('payment.completed');
    (async () => {
      for await (const msg of paymentCompletedSub) {
        try {
          await this.handlePaymentCompleted(nc, msg);
        } catch (error) {
          console.error('Error in payment.completed handler:', error);
        }
      }
    })();
  }
} 