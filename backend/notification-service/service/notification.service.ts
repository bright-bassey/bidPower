import Notification from '../model/notification.model';
import { DatabaseError, NotFoundError } from './error.service';

export class NotificationService {
    static async getUserNotifications(userId: string) {
        try {
            return await Notification.find({
                recipientType: 'user',
                recipientId: userId
            }).sort({ createdAt: -1 });
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to fetch user notifications: ${error.message}`);
            }
            throw new DatabaseError('Failed to fetch user notifications');
        }
    }

    static async getRoomNotifications(roomId: string) {
        try {
            return await Notification.find({
                recipientType: 'room',
                recipientId: roomId
            }).sort({ createdAt: -1 });
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to fetch room notifications: ${error.message}`);
            }
            throw new DatabaseError('Failed to fetch room notifications');
        }
    }

    static async markAsRead(notificationId: string) {
        try {
            const notification = await Notification.findById(notificationId);
            
            if (!notification) {
                throw new NotFoundError('Notification not found');
            }
            
            notification.read = true;
            return await notification.save();
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to mark notification as read: ${error.message}`);
            }
            throw new DatabaseError('Failed to mark notification as read');
        }
    }

    static async createNotification(notificationData: {
        type: string;
        title: string;
        message: string;
        recipientType: 'user' | 'room';
        recipientId: string;
        data?: any;
    }) {
        try {
            const notification = new Notification({
                ...notificationData,
                read: false
            });
            
            return await notification.save();
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to create notification: ${error.message}`);
            }
            throw new DatabaseError('Failed to create notification');
        }
    }
}
