import Room, { IRoom, RoomStatus } from '../model/room.model';
import { DatabaseError, NotFoundError, BadRequestError } from './error.service';

export class RoomService {
    static async getAllRooms(): Promise<IRoom[]> {
        try {
            return await Room.find({});
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to fetch rooms: ${error.message}`);
            }
            throw new DatabaseError('Failed to fetch rooms');
        }
    }

    static async getRoomById(id: string): Promise<IRoom> {
        try {
            const room = await Room.findById(id);
            if (!room) {
                throw new NotFoundError('Room not found');
            }
            return room;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to fetch room: ${error.message}`);
            }
            throw new DatabaseError('Failed to fetch room');
        }
    }

    static async createRoom(roomData: any): Promise<IRoom> {
        try {
            const room = new Room(roomData);
            return await room.save();
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to create room: ${error.message}`);
            }
            throw new DatabaseError('Failed to create room');
        }
    }

    static async joinRoom(roomId: string, userId: string): Promise<IRoom> {
        try {
            const room = await this.getRoomById(roomId);
            
            // Check if room is closed
            if (room.status === RoomStatus.CLOSED) {
                throw new BadRequestError('Cannot join a closed auction');
            }
            
            // Check if user is already in participants
            const isAlreadyParticipant = room.participants.includes(userId);
            
            // Add user to participants if not already in there
            if (!isAlreadyParticipant) {
                room.participants.push(userId);
                await room.save();
            }
            
            return room;
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof BadRequestError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to join room: ${error.message}`);
            }
            throw new DatabaseError('Failed to join room');
        }
    }
    
    static async updateHighestBid(roomId: string, userId: string, amount: number): Promise<IRoom> {
        try {
            const room = await this.getRoomById(roomId);
            
            // Update highest bid if higher than current bid
            if (!room.currentHighestBid || amount > room.currentHighestBid.amount) {
                room.currentHighestBid = { amount, userId };
                await room.save();
            }
            
            return room;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to update highest bid: ${error.message}`);
            }
            throw new DatabaseError('Failed to update highest bid');
        }
    }
    
    static async updateRoomStatus(room: IRoom): Promise<IRoom> {
        const currentTime = new Date();
        
        try {
            if (room.startTime <= currentTime && room.endTime >= currentTime) {
                if (room.status !== RoomStatus.LIVE) {
                    room.status = RoomStatus.LIVE;
                    await room.save();
                }
            } else if (room.endTime < currentTime) {
                if (room.status !== RoomStatus.CLOSED) {
                    room.status = RoomStatus.CLOSED;
                    await room.save();
                    
                    // Notify bidding service that auction has ended through  NATS client 
                    await this.publishAuctionEndedEvent(room);
                }
            }
            
            return room;
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to update room status: ${error.message}`);
            }
            throw new DatabaseError('Failed to update room status');
        }
    }
    
    static async publishAuctionEndedEvent(room: IRoom): Promise<void> {
        // Skip if no NATS client available
        if (!global.natsClient) return;
        
        try {
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
            console.log(`Published auction.ended event for room ${room._id}`);
        } catch (error) {
            console.error('Failed to publish auction ended event:', error);
            
        }
    }
    
    static async publishUserJoinedEvent(roomId: string, userId: string): Promise<void> {
        // Skip if no NATS client available
        if (!global.natsClient) return;
        
        try {
            await global.natsClient.publish('user.joined.room', JSON.stringify({
                userId,
                roomId
            }));
        } catch (error) {
            console.error('Failed to publish user joined event:', error);
           
        }
    }
} 