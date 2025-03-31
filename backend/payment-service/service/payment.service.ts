import Payment, { PaymentMethod, PaymentStatus, IPayment } from '../model/payment.model';
import { DatabaseError, NotFoundError } from './error.service';
import { StringCodec } from 'nats';

export class PaymentService {
    static async createPayment(invoiceId: string, userId: string, amount: number, 
                           paymentMethod: PaymentMethod = PaymentMethod.CREDIT_CARD, 
                           paymentDetails: any = {}): Promise<IPayment> {
        try {
            const payment = new Payment({
                invoiceId,
                userId,
                amount,
                method: paymentMethod,
                status: PaymentStatus.PROCESSING,
                paymentDetails
            });
            
            // Generate a transaction ID
            payment.transactionId = `txn_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
            
            await payment.save();
            
            // Process payment asynchronously
            this.processPaymentAsync(payment);
            
            return payment;
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to create payment: ${error.message}`);
            }
            throw new DatabaseError('Failed to create payment');
        }
    }
    
    static async processPaymentAsync(payment: IPayment): Promise<void> {
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
                
                // Publish events if NATS is available
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
    }
    
    static async getPaymentById(id: string): Promise<IPayment> {
        try {
            const payment = await Payment.findById(id);
            
            if (!payment) {
                throw new NotFoundError('Payment not found');
            }
            
            return payment;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to fetch payment: ${error.message}`);
            }
            
            throw new DatabaseError('Failed to fetch payment');
        }
    }
    
    static async getUserPayments(userId: string): Promise<IPayment[]> {
        try {
            return await Payment.find({ userId }).sort({ createdAt: -1 });
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to fetch user payments: ${error.message}`);
            }
            
            throw new DatabaseError('Failed to fetch user payments');
        }
    }
    
    static async getInvoicePayments(invoiceId: string): Promise<IPayment[]> {
        try {
            return await Payment.find({ invoiceId }).sort({ createdAt: -1 });
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to fetch invoice payments: ${error.message}`);
            }
            
            throw new DatabaseError('Failed to fetch invoice payments');
        }
    }
} 