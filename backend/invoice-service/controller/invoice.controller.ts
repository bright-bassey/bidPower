import { Request, Response } from 'express';
import Invoice, { InvoiceStatus } from '../model/invoice.model';
import { StringCodec } from 'nats';

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { roomId, userId, amount, items, tax, totalAmount } = req.body;
    
    if (!roomId || !userId || !amount) {
      return res.status(400).json({ message: 'Required fields missing' });
    }
    
    // Create invoice
    const invoice = new Invoice({
      roomId,
      userId,
      amount,
      items: items || [{ description: 'Auction win', amount }],
      tax: tax || amount * 0.1,
      totalAmount: totalAmount || amount * 1.1,
      status: InvoiceStatus.PENDING
    });
    
    await invoice.save();
    
    // Publish event to NATS
    if (global.natsClient) {
      const sc = StringCodec();
      global.natsClient.publish('invoice.created', sc.encode(JSON.stringify({
        invoiceId: invoice._id,
        userId,
        amount: invoice.totalAmount,
        invoiceNumber: invoice.invoiceNumber
      })));
    }
    
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Error creating invoice' });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.status(200).json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: 'Error fetching invoice' });
  }
};

export const getUserInvoices = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const invoices = await Invoice.find({ userId }).sort({ createdAt: -1 });
    
    res.status(200).json(invoices);
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    res.status(500).json({ message: 'Error fetching user invoices' });
  }
};

export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, paymentId } = req.body;
    
    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    invoice.status = status;
    
    if (status === InvoiceStatus.PAID) {
      invoice.paidAt = new Date();
      invoice.paymentId = paymentId;
    }
    
    await invoice.save();
    
    // Publish event for status update
    if (global.natsClient) {
      const sc = StringCodec();
      global.natsClient.publish('invoice.updated', sc.encode(JSON.stringify({
        invoiceId: invoice._id,
        status: invoice.status,
        paymentId: invoice.paymentId
      })));
    }
    
    res.status(200).json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ message: 'Error updating invoice' });
  }
};

export const processPayment = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const { paymentMethod, paymentDetails } = req.body;
    
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    if (invoice.status === InvoiceStatus.PAID) {
      return res.status(400).json({ message: 'Invoice already paid' });
    }
    
    // Update invoice status to processing
    invoice.status = InvoiceStatus.PROCESSING;
    await invoice.save();
    
    // Publish event to request payment processing
    if (global.natsClient) {
      const sc = StringCodec();
      global.natsClient.publish('process.payment', sc.encode(JSON.stringify({
        invoiceId: invoice._id,
        userId: invoice.userId,
        amount: invoice.totalAmount,
        paymentMethod,
        paymentDetails
      })));
      
      res.status(202).json({ 
        message: 'Payment processing initiated',
        invoiceId: invoice._id,
        status: invoice.status 
      });
    } else {
      // If NATS client is not available, return error
      invoice.status = InvoiceStatus.PENDING;
      await invoice.save();
      res.status(500).json({ message: 'Payment service unavailable' });
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Error processing payment' });
  }
}; 