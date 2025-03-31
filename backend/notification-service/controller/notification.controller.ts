import { Request, Response } from 'express';
import { ValidationService } from '../service/validation.service';
import { NotificationService } from '../service/notification.service';
import { handleError } from '../service/error.service';

// Get all unread notifications for a user
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    ValidationService.validateIdParam(userId);
    
    const notifications = await NotificationService.getUserNotifications(userId);
    
    res.status(200).json({
      success: true,
      notifications
    });
  } catch (error) {
    const appError = handleError(error);
    console.error('Error fetching user notifications:', appError);
    res.status(appError.statusCode).json({
      success: false,
      message: appError.message
    });
  }
};

// Get all notifications for a room
export const getRoomNotifications = async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId;
    ValidationService.validateIdParam(roomId);
    
    const notifications = await NotificationService.getRoomNotifications(roomId);
    
    res.status(200).json({
      success: true,
      notifications
    });
  } catch (error) {
    const appError = handleError(error);
    console.error('Error fetching room notifications:', appError);
    res.status(appError.statusCode).json({
      success: false,
      message: appError.message
    });
  }
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.id;
    ValidationService.validateIdParam(notificationId);
    
    const notification = await NotificationService.markAsRead(notificationId);
    
    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    const appError = handleError(error);
    console.error('Error marking notification as read:', appError);
    res.status(appError.statusCode).json({
      success: false,
      message: appError.message
    });
  }
};

// Create a notification 
export const createNotification = async (req: Request, res: Response) => {
  try {
    ValidationService.validateNotificationCreation(req);
    
    const { type, title, message, recipientType, recipientId, data } = req.body;
    
    const notification = await NotificationService.createNotification({
      type,
      title,
      message,
      recipientType,
      recipientId,
      data
    });
    
    // for active socket connection for a recipient, emit notification
    const io = req.app.get('socketio');
    if (io) {
      if (recipientType === 'user') {
        io.to(`user:${recipientId}`).emit('notification', notification);
      } else if (recipientType === 'room') {
        io.to(recipientId).emit('notification', notification);
      }
    }
    
    res.status(201).json({
      success: true,
      notification
    });
  } catch (error) {
    const appError = handleError(error);
    console.error('Error creating notification:', appError);
    res.status(appError.statusCode).json({
      success: false,
      message: appError.message
    });
  }
}; 