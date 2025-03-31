import { Request } from 'express';
import { ValidationError } from './error.service';
import mongoose from 'mongoose';

export class ValidationService {
    static validateBidInput(req: Request): { roomObjectId: mongoose.Types.ObjectId } {
        const { roomId, userId, amount, username } = req.body;
        
        if (!roomId || !userId || !amount || !username) {
            throw new ValidationError('Please provide roomId, userId, amount, and username');
        }
        
        if (typeof userId !== 'string' || typeof username !== 'string') {
            throw new ValidationError('Invalid input types: userId and username must be strings');
        }
        
        if (typeof amount !== 'number' || amount <= 0) {
            throw new ValidationError('Bid amount must be a positive number');
        }
        
        // Validate roomId is a valid ObjectId
        let roomObjectId;
        try {
            roomObjectId = new mongoose.Types.ObjectId(roomId);
        } catch (error) {
            throw new ValidationError('Invalid room ID format');
        }
        
        return { roomObjectId };
    }
    
    static validateRoomId(roomId: string): mongoose.Types.ObjectId {
        if (!roomId) {
            throw new ValidationError('Room ID is required');
        }
        
        try {
            return new mongoose.Types.ObjectId(roomId);
        } catch (error) {
            throw new ValidationError('Invalid room ID format');
        }
    }
}
