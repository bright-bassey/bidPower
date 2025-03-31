import { Request } from 'express';
import { ValidationError } from './error.service';

export class ValidationService {
    static validateCreateInvoice(req: Request): void {
        const { roomId, userId, amount } = req.body;

        if (!roomId || !userId || !amount) {
            throw new ValidationError('Required fields missing: roomId, userId, and amount are required');
        }

        if (typeof amount !== 'number' || amount <= 0) {
            throw new ValidationError('Amount must be a positive number');
        }

        if (typeof roomId !== 'string' || typeof userId !== 'string') {
            throw new ValidationError('Invalid input types: roomId and userId must be strings');
        }
    }

    static validateUpdateInvoiceStatus(req: Request): void {
        const { status, paymentId } = req.body;

        if (!status) {
            throw new ValidationError('Status is required');
        }

        const validStatuses = ['PENDING', 'PROCESSING', 'PAID', 'CANCELLED', 'FAILED'];
        if (!validStatuses.includes(status)) {
            throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
        }

        if (status === 'PAID' && !paymentId) {
            throw new ValidationError('Payment ID is required for paid invoices');
        }
    }

    static validateProcessPayment(req: Request): void {
        const { paymentMethod, paymentDetails } = req.body;

        if (!paymentMethod) {
            throw new ValidationError('Payment method is required');
        }

        if (!paymentDetails) {
            throw new ValidationError('Payment details are required');
        }
    }
}
