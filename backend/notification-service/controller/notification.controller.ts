import { Request, Response } from 'express';
import Notification from '../model/notification.model';

// Get all unread notifications for a user
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const notifications = await Notification.find({
      recipientType: 'user',
      recipientId: userId
    }).sort({ createdAt: -1 });
    
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

// Get all notifications for a room
export const getRoomNotifications = async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId;
    const notifications = await Notification.find({
      recipientType: 'room',
      recipientId: roomId
    }).sort({ createdAt: -1 });
    
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching room notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.id;
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    notification.read = true;
    await notification.save();
    
    res.status(200).json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error updating notification' });
  }
};

// Create a notification (typically used internally, but exposed as API for testing)
export const createNotification = async (req: Request, res: Response) => {
  try {
    const { type, title, message, recipientType, recipientId, data } = req.body;
    
    const notification = new Notification({
      type,
      title,
      message,
      recipientType,
      recipientId,
      data,
      read: false
    });
    
    await notification.save();
    
    // If we have an active socket connection for this recipient, emit notification
    const io = req.app.get('socketio');
    if (io) {
      if (recipientType === 'user') {
        io.to(`user:${recipientId}`).emit('notification', notification);
      } else if (recipientType === 'room') {
        io.to(recipientId).emit('notification', notification);
      }
    }
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Error creating notification' });
  }
}; 