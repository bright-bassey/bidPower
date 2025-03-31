import { Request, Response } from 'express';
import { ValidationService } from '../service/validation.service';
import { BidService } from '../service/bid.service';
import {  handleError } from '../service/error.service';

export class BiddingController {
    placeBid = async (req: Request, res: Response) => {
        try {
            // Validate bid input
            const { roomObjectId } = ValidationService.validateBidInput(req);
            const { userId, amount, username } = req.body;
            
            // Create bid
            const bid = await BidService.createBid(roomObjectId, userId, amount, username);
            
            res.status(201).json(bid);
        } catch (error) {
            const appError = handleError(error);
            console.error('Error placing bid:', appError);
            res.status(appError.statusCode).json({ 
                success: false,
                message: appError.message 
            });
        }
    }
    
    getBidsByRoom = async (req: Request, res: Response) => {
        try {
            const roomId = req.params.roomId;
            const roomObjectId = ValidationService.validateRoomId(roomId);
            
            const bids = await BidService.getBidsByRoom(roomObjectId);
            
            res.status(200).json({
                success: true,
                bids
            });
        } catch (error) {
            const appError = handleError(error);
            console.error('Error fetching bids:', appError);
            res.status(appError.statusCode).json({ 
                success: false,
                message: appError.message 
            });
        }
    }
    
    getHighestBid = async (req: Request, res: Response) => {
        try {
            const roomId = req.params.roomId;
            const roomObjectId = ValidationService.validateRoomId(roomId);
            
            const highestBid = await BidService.getHighestBid(roomObjectId);
            
            res.status(200).json({
                success: true,
                bid: highestBid
            });
        } catch (error) {
            const appError = handleError(error);
            console.error('Error fetching highest bid:', appError);
            res.status(appError.statusCode).json({ 
                success: false,
                message: appError.message 
            });
        }
    }
}

// Export controller instance for routes
export const biddingController = new BiddingController(); 