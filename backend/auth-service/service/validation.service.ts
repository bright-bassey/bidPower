import { Request } from 'express';
import { ValidationError } from './error.service';

export class ValidationService {
    static validateRegistrationInput(req: Request): void {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            throw new ValidationError('Please provide username, email and password');
        }

        if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
            throw new ValidationError('Invalid input types');
        }

        if (password.length < 6) {
            throw new ValidationError('Password must be at least 6 characters long');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new ValidationError('Invalid email format');
        }
    }

    static validateLoginInput(req: Request): void {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new ValidationError('Please provide email and password');
        }

        if (typeof email !== 'string' || typeof password !== 'string') {
            throw new ValidationError('Invalid input types');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new ValidationError('Invalid email format');
        }
    }
} 