import { Request, Response } from 'express';
import { ValidationService } from '../service/validation.service';
import { RoomService } from '../service/room.service';
import { handleError } from '../service/error.service';

export const getAllRooms = async (req: Request, res: Response) => {
  try {
    // Get all rooms
    const rooms = await RoomService.getAllRooms();
    
    // Update status for each room
    for (const room of rooms) {
      await RoomService.updateRoomStatus(room);
    }
    
    res.status(200).json(rooms);
  } catch (error) {
    const appError = handleError(error);
    console.error('Error fetching rooms:', appError);
    res.status(appError.statusCode).json({ 
      success: false,
      message: appError.message 
    });
  }
};

export const getRoomById = async (req: Request, res: Response) => {
  try {
    const room = await RoomService.getRoomById(req.params.id);
    
    // Update room status
    await RoomService.updateRoomStatus(room);
    
    res.status(200).json(room);
  } catch (error) {
    const appError = handleError(error);
    console.error('Error fetching room:', appError);
    res.status(appError.statusCode).json({
      success: false,
      message: appError.message
    });
  }
};

export const createRoom = async (req: Request, res: Response) => {
  try {
    // Validate input
    ValidationService.validateCreateRoomInput(req);
    
    // Create room
    const room = await RoomService.createRoom(req.body);
    
    res.status(201).json(room);
  } catch (error) {
    const appError = handleError(error);
    console.error('Error creating room:', appError);
    res.status(appError.statusCode).json({
      success: false,
      message: appError.message
    });
  }
};

export const joinRoom = async (req: Request, res: Response) => {
  try {
    // Validate input
    ValidationService.validateJoinRoomInput(req);
    
    const { userId } = req.body;
    const roomId = req.params.id;
    
    // Join room
    const room = await RoomService.joinRoom(roomId, userId);
    
    // If room is live, publish event
    if (room.status === 'live') {
      await RoomService.publishUserJoinedEvent(roomId, userId);
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Successfully joined room', 
      room 
    });
  } catch (error) {
    const appError = handleError(error);
    console.error('Error joining room:', appError);
    res.status(appError.statusCode).json({
      success: false,
      message: appError.message
    });
  }
};

export const updateRoomHighestBid = async (req: Request, res: Response) => {
  try {
    // Validate input
    ValidationService.validateBidInput(req);
    
    const { id } = req.params;
    const { amount, userId } = req.body;
    
    // Update highest bid
    const room = await RoomService.updateHighestBid(id, userId, amount);
    
    res.status(200).json(room);
  } catch (error) {
    const appError = handleError(error);
    console.error('Error updating room highest bid:', appError);
    res.status(appError.statusCode).json({
      success: false,
      message: appError.message
    });
  }
};