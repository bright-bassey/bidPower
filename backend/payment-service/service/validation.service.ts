import { Request } from 'express';
import { ValidationError } from './error.service';
import { PaymentMethod } from '../model/payment.model';

export class ValidationService {
    static validatePaymentInput(req: Request): void {
        const { invoiceId, userId, amount, paymentMethod } = req.body;

        if (!invoiceId) {
            throw new ValidationError('Invoice ID is required');
        }

        if (!userId) {
            throw new ValidationError('User ID is required');
        }

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            throw new ValidationError('Amount must be a positive number');
        }

        if (paymentMethod && !Object.values(PaymentMethod).includes(paymentMethod)) {
            throw new ValidationError('Invalid payment method');
        }
    }

    static validateIdParam(id: string): void {
        if (!id) {
            throw new ValidationError('ID is required');
        }

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            throw new ValidationError('Invalid ID format');
        }
    }
} 