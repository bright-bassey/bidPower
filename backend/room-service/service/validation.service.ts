import { Request } from 'express';
import { ValidationError } from './error.service';
import { RoomStatus } from '../model/room.model';

export class ValidationService {
    static validateCreateRoomInput(req: Request): void {
        const { name, description, startTime, endTime, itemDetails } = req.body;

        if (!name || !description || !startTime || !endTime || !itemDetails) {
            throw new ValidationError('Missing required fields');
        }

        // Validate item details
        if (!itemDetails.name || !itemDetails.description || !itemDetails.startingPrice) {
            throw new ValidationError('Missing required item details');
        }

        // Validate dates
        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new ValidationError('Invalid date format');
        }

        if (end <= start) {
            throw new ValidationError('End time must be after start time');
        }

        // Validate starting price
        if (typeof itemDetails.startingPrice !== 'number' || itemDetails.startingPrice <= 0) {
            throw new ValidationError('Starting price must be a positive number');
        }
    }

    static validateJoinRoomInput(req: Request): void {
        const { userId } = req.body;

        if (!userId) {
            throw new ValidationError('User ID is required');
        }

        if (typeof userId !== 'string' || userId.trim() === '') {
            throw new ValidationError('Invalid User ID');
        }
    }

    static validateBidInput(req: Request): void {
        const { amount, userId } = req.body;

        if (!amount || !userId) {
            throw new ValidationError('Amount and userId are required');
        }

        if (typeof amount !== 'number' || amount <= 0) {
            throw new ValidationError('Amount must be a positive number');
        }

        if (typeof userId !== 'string' || userId.trim() === '') {
            throw new ValidationError('Invalid User ID');
        }
    }
} 