import api from './api';

const API_URL = import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:4003';

export interface Notification {
  _id: string;
  type: 'bid' | 'auction_win' | 'payment' | 'invoice' | 'chat' | 'system';
  title: string;
  message: string;
  recipientType: 'user' | 'room';
  recipientId: string;
  data: any;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

class NotificationService {
  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      return await api.get(`${API_URL}/api/notifications/user/${userId}`);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  }

  /**
   * Get all notifications for a room
   */
  async getRoomNotifications(roomId: string): Promise<Notification[]> {
    try {
      return await api.get(`${API_URL}/api/notifications/room/${roomId}`);
    } catch (error) {
      console.error('Error fetching room notifications:', error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    try {
      return await api.patch(`${API_URL}/api/notifications/${notificationId}/read`, {});
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Create a notification (mainly for testing)
   */
  async createNotification(notification: {
    type: string;
    title: string;
    message: string;
    recipientType: 'user' | 'room';
    recipientId: string;
    data?: any;
  }): Promise<Notification> {
    try {
      return await api.post(`${API_URL}/api/notifications`, notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get recent unread notifications for a user
   */
  async getUnreadUserNotifications(userId: string): Promise<Notification[]> {
    try {
      const notifications = await this.getUserNotifications(userId);
      return notifications.filter(notification => !notification.read);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      return [];
    }
  }

  /**
   * Mark all notifications for a user as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const notifications = await this.getUserNotifications(userId);
      const unreadNotifications = notifications.filter(notification => !notification.read);
      
      // Create an array of promises for each markAsRead call
      const markAsReadPromises = unreadNotifications.map(notification => 
        this.markAsRead(notification._id)
      );
      
      // Execute all promises concurrently
      await Promise.all(markAsReadPromises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
}

export default new NotificationService(); 