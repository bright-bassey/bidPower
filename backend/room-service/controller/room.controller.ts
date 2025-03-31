import { Request, Response } from 'express';
import Room, { RoomStatus } from '../model/room.model';

export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await Room.find({});
    
    // Update status based on current time
    const currentTime = new Date();
    for (const room of rooms) {
      if (room.startTime <= currentTime && room.endTime >= currentTime) {
        if (room.status !== RoomStatus.LIVE) {
          room.status = RoomStatus.LIVE;
          await room.save();
        }
      } else if (room.endTime < currentTime) {
        if (room.status !== RoomStatus.CLOSED) {
          room.status = RoomStatus.CLOSED;
          await room.save();
          
          // Notify bidding service that auction has ended
          if (global.natsClient) {
            interface AuctionEndEvent {
              roomId: any;
              roomName: string;
              timestamp: string;
              winningBid?: {
                userId: string;
                amount: number;
              };
            }
            
            const eventData: AuctionEndEvent = {
              roomId: room._id,
              roomName: room.name,
              timestamp: new Date().toISOString()
            };
            
            // Add winning bid information if available
            if (room.currentHighestBid && room.currentHighestBid.userId) {
              eventData.winningBid = {
                userId: room.currentHighestBid.userId,
                amount: room.currentHighestBid.amount
              };
            }
            
            await global.natsClient.publish('auction.ended', JSON.stringify(eventData));
            console.log(`Published auction.ended event for room ${room._id} with data:`, eventData);
          }
        }
      }
    }
    
    res.status(200).json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: 'Error fetching rooms' });
  }
};

export const getRoomById = async (req: Request, res: Response) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Update room status based on current time
    const currentTime = new Date();
    if (room.startTime <= currentTime && room.endTime >= currentTime) {
      if (room.status !== RoomStatus.LIVE) {
        room.status = RoomStatus.LIVE;
        await room.save();
      }
    } else if (room.endTime < currentTime) {
      if (room.status !== RoomStatus.CLOSED) {
        room.status = RoomStatus.CLOSED;
        await room.save();
      }
    }
    
    res.status(200).json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ message: 'Error fetching room' });
  }
};

export const createRoom = async (req: Request, res: Response) => {
  try {
    const roomData = req.body;
    const room = new Room(roomData);
    await room.save();
    
    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: 'Error creating room' });
  }
};

export const joinRoom = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const roomId = req.params.id;
    
    console.log(`Joining room request: roomId=${roomId}, userId=${userId}`);
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Check if room is closed
    if (room.status === RoomStatus.CLOSED) {
      return res.status(400).json({ message: 'Cannot join a closed auction' });
    }
    
    // Check if user is already in participants
    const isAlreadyParticipant = room.participants.includes(userId);
    console.log(`User ${userId} is already a participant: ${isAlreadyParticipant}`);
    
    // Add user to participants if not already in
    if (!isAlreadyParticipant) {
      room.participants.push(userId);
      await room.save();
      console.log(`Added user ${userId} to room ${roomId} participants`);
    } else {
      console.log(`User ${userId} is already in participants list`);
    }
    
    // Notify bidding service if room is live
    if (room.status === RoomStatus.LIVE && global.natsClient) {
      await global.natsClient.publish('user.joined.room', JSON.stringify({
        userId,
        roomId: room._id
      }));
    }
    
    res.status(200).json({ message: 'Successfully joined room', room });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ message: 'Error joining room' });
  }
};

export const updateRoomHighestBid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, userId } = req.body;
    
    if (!amount || !userId) {
      return res.status(400).json({ message: 'Amount and userId are required' });
    }
    
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Update highest bid if higher than current
    if (!room.currentHighestBid || amount > room.currentHighestBid.amount) {
      room.currentHighestBid = { amount, userId };
      await room.save();
    }
    
    res.status(200).json(room);
  } catch (error) {
    console.error('Error updating room highest bid:', error);
    res.status(500).json({ message: 'Error updating room highest bid' });
  }
};