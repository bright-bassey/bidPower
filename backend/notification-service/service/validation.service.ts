import { Request } from 'express';
import { ValidationError } from './error.service';

export class ValidationService {
    static validateNotificationCreation(req: Request): void {
        const { type, title, message, recipientType, recipientId } = req.body;

        if (!type || !title || !message || !recipientType || !recipientId) {
            throw new ValidationError('Please provide type, title, message, recipientType, and recipientId');
        }

        if (typeof type !== 'string' || typeof title !== 'string' || typeof message !== 'string') {
            throw new ValidationError('type, title and message must be strings');
        }

        if (recipientType !== 'user' && recipientType !== 'room') {
            throw new ValidationError('recipientType must be either "user" or "room"');
        }

        if (typeof recipientId !== 'string') {
            throw new ValidationError('recipientId must be a string');
        }
    }

    static validateIdParam(id: string | undefined): void {
        if (!id) {
            throw new ValidationError('ID parameter is required');
        }
    }
}
