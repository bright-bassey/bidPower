import Invoice, { InvoiceStatus } from '../model/invoice.model';
import { StringCodec } from 'nats';
import { DatabaseError, NotFoundError, ConflictError, ServiceUnavailableError } from './error.service';
import mongoose from 'mongoose';

export class InvoiceService {
    static async createInvoice(
        roomId: string, 
        userId: string, 
        amount: number, 
        items?: Array<{description: string, amount: number}>, 
        tax?: number, 
        totalAmount?: number
    ) {
        try {
            // Calculate defaults if not provided
            const calculatedTax = tax || amount * 0.1;
            const calculatedTotal = totalAmount || amount * 1.1;
            
            // Create invoice
            const invoice = new Invoice({
                roomId,
                userId,
                amount,
                items: items || [{ description: 'Auction win', amount }],
                tax: calculatedTax,
                totalAmount: calculatedTotal,
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
            
            return invoice;
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to create invoice: ${error.message}`);
            }
            throw new DatabaseError('Failed to create invoice');
        }
    }

    static async getInvoiceById(id: string) {
        try {
            const invoice = await Invoice.findById(id);
            
            if (!invoice) {
                throw new NotFoundError('Invoice not found');
            }
            
            return invoice;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to fetch invoice: ${error.message}`);
            }
            throw new DatabaseError('Failed to fetch invoice');
        }
    }

    static async getUserInvoices(userId: string) {
        try {
            return await Invoice.find({ userId }).sort({ createdAt: -1 });
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to fetch user invoices: ${error.message}`);
            }
            throw new DatabaseError('Failed to fetch user invoices');
        }
    }

    static async updateInvoiceStatus(id: string, status: InvoiceStatus, paymentId?: string) {
        try {
            const invoice = await Invoice.findById(id);
            
            if (!invoice) {
                throw new NotFoundError('Invoice not found');
            }
            
            invoice.status = status;
            
            if (status === InvoiceStatus.PAID) {
                invoice.paidAt = new Date();
                if (paymentId) {
                    invoice.paymentId = new mongoose.Types.ObjectId(paymentId);
                }
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
            
            return invoice;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to update invoice: ${error.message}`);
            }
            throw new DatabaseError('Failed to update invoice');
        }
    }

    static async processPayment(
        invoiceId: string, 
        paymentMethod: string, 
        paymentDetails: any
    ) {
        try {
            const invoice = await Invoice.findById(invoiceId);
            
            if (!invoice) {
                throw new NotFoundError('Invoice not found');
            }
            
            if (invoice.status === InvoiceStatus.PAID) {
                throw new ConflictError('Invoice already paid');
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
                
                return {
                    message: 'Payment processing initiated',
                    invoiceId: invoice._id,
                    status: invoice.status
                };
            } else {
                // If NATS client is not available, return error
                invoice.status = InvoiceStatus.PENDING;
                await invoice.save();
                throw new ServiceUnavailableError('Payment service unavailable');
            }
        } catch (error) {
            if (error instanceof NotFoundError || 
                error instanceof ConflictError || 
                error instanceof ServiceUnavailableError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to process payment: ${error.message}`);
            }
            throw new DatabaseError('Failed to process payment');
        }
    }
}
