import { Server } from 'socket.io';
import { connect as natsConnect, NatsConnection, StringCodec, Subscription } from 'nats';
import Notification from '../model/notification.model';
import { DatabaseError } from './error.service';
import { NotificationService } from './notification.service';

export class NatsService {
  private io: Server;
  private nc: NatsConnection | null = null;
  private sc = StringCodec();
  private subscriptions: Subscription[] = [];
  
  constructor(io: Server) {
    this.io = io;
  }
  
  async connect(url: string): Promise<void> {
    try {
      this.nc = await natsConnect({ servers: url });
      console.log('Connected to NATS');
      
      
      global.natsClient = this.nc;
    } catch (error) {
      console.error('NATS connection error:', error);
      throw error;
    }
  }
  
  async setupSubscriptions(): Promise<void> {
    if (!this.nc) {
      throw new Error('NATS connection not established');
    }
    
    // Subscribe to bid placed events
    const bidPlacedSub = this.nc.subscribe('bid.placed');
    this.subscriptions.push(bidPlacedSub);
    this.handleBidPlacedEvents(bidPlacedSub);
    
    // Subscribe to auction ended events
    const auctionEndedSub = this.nc.subscribe('auction.ended');
    this.subscriptions.push(auctionEndedSub);
    this.handleAuctionEndedEvents(auctionEndedSub);
  }
  
  private async handleBidPlacedEvents(subscription: Subscription): Promise<void> {
    for await (const msg of subscription) {
      try {
        const bidData = JSON.parse(this.sc.decode(msg.data));
        console.log('New bid received:', bidData);
        
        // Create room notification for all participants
        const roomNotification = await NotificationService.createNotification({
          type: 'bid',
          title: 'New Bid Placed',
          message: `${bidData.username} placed a bid of $${bidData.amount}`,
          recipientType: 'room',
          recipientId: bidData.roomId,
          data: bidData
        });
        
        // If the bid was placed by someone else, notify the previous highest bidder
        if (bidData.previousHighestBidder && bidData.previousHighestBidder !== bidData.userId) {
          try {
            const userNotification = await NotificationService.createNotification({
              type: 'bid',
              title: 'You\'ve Been Outbid!',
              message: `Someone placed a higher bid of $${bidData.amount} in ${bidData.roomName || 'an auction room'}`,
              recipientType: 'user',
              recipientId: bidData.previousHighestBidder,
              data: bidData
            });
            
            // Emit to the outbid user
            this.io.to(`user:${bidData.previousHighestBidder}`).emit('notification', userNotification);
          } catch (error) {
            console.error('Error creating outbid notification:', error);
          }
        }
        
        // Emit to room
        this.io.to(bidData.roomId).emit('new_bid', {
          ...bidData,
          notificationType: 'bid'
        });
        
        // Also emit room notification to all room participants
        this.io.to(bidData.roomId).emit('notification', roomNotification);
      } catch (error) {
        console.error('Error processing bid.placed message:', error);
      }
    }
  }
  
  private async handleAuctionEndedEvents(subscription: Subscription): Promise<void> {
    for await (const msg of subscription) {
      try {
        const data = JSON.parse(this.sc.decode(msg.data));
        console.log('Auction ended:', data);
        
        // Check if winningBid exists and has a userId field
        if (data.winningBid && data.winningBid.userId) {
          // Save notification for winner
          const winnerNotification = await NotificationService.createNotification({
            type: 'auction_win',
            title: 'Congratulations! You Won',
            message: `You won the auction for room ${data.roomId}`,
            recipientType: 'user',
            recipientId: data.winningBid.userId,
            data: data
          });
          
          // Emit to room
          this.io.to(data.roomId).emit('auction_ended', {
            roomId: data.roomId,
            winnerId: data.winningBid.userId,
            winningBid: data.winningBid.amount,
            notificationType: 'auction_ended'
          });
          
          // Emit to winner
          this.io.to(`user:${data.winningBid.userId}`).emit('auction_win', {
            roomId: data.roomId,
            winnerId: data.winningBid.userId,
            winningBid: data.winningBid.amount,
            notificationType: 'auction_win'
          });
          
          // Notify invoice service
          if (this.nc) {
            await this.nc.publish('generate.invoice', this.sc.encode(JSON.stringify({
              roomId: data.roomId,
              userId: data.winningBid.userId,
              bidAmount: data.winningBid.amount
            })));
          }
        } else {
          console.log('Auction ended but no valid winning bid found:', data);
          
          // Create room notification about auction ending with no winner
          const roomNotification = await NotificationService.createNotification({
            type: 'system',
            title: 'Auction Ended',
            message: `The auction for room ${data.roomId} has ended without a winner.`,
            recipientType: 'room',
            recipientId: data.roomId,
            data: data
          });
          
          // Emit to room
          this.io.to(data.roomId).emit('auction_ended', {
            roomId: data.roomId,
            notificationType: 'auction_ended'
          });
        }
      } catch (error) {
        console.error('Error processing auction.ended message:', error);
      }
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.nc) {
      // Drain all subscriptions
      for (const sub of this.subscriptions) {
        try {
          await sub.drain();
        } catch (e) {
          console.error('Error draining subscription:', e);
        }
      }
      
      // Close the connection
      await this.nc.close();
      console.log('NATS connection closed');
    }
  }
  
  async publishMessage(subject: string, data: any): Promise<void> {
    if (!this.nc) {
      throw new Error('NATS connection not established');
    }
    
    try {
      await this.nc.publish(subject, this.sc.encode(JSON.stringify(data)));
    } catch (error) {
      console.error(`Error publishing to ${subject}:`, error);
      throw new DatabaseError(`Failed to publish message to ${subject}`);
    }
  }
}
