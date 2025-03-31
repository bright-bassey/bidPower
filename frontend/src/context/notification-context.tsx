import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useSocket } from "./socket-context";
import notificationService, {
  type Notification as NotificationModel,
} from "../services/notification.service";

interface NotificationContextType {
  notifications: NotificationModel[];
  unreadCount: number;
  showNotifications: boolean;
  toggleNotifications: () => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (notificationId: string) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  showNotifications: false,
  toggleNotifications: () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  dismissNotification: () => {},
  refreshNotifications: async () => {},
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationModel[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { socket, isConnected } = useSocket();
  const isMounted = useRef(true);
  const notificationsPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Get current user ID
  useEffect(() => {
    // In a real app, get this from an auth context or service
    // For now, use our existing mock userId from local storage or generate a new one
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const newUserId = `user_${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem("userId", newUserId);
      setUserId(newUserId);
    }

    return () => {
      isMounted.current = false;
      if (notificationsPollingRef.current) {
        clearInterval(notificationsPollingRef.current);
      }
    };
  }, []);

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const userNotifications = await notificationService.getUserNotifications(
        userId
      );
      if (isMounted.current) {
        setNotifications(userNotifications);
        setUnreadCount(userNotifications.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }, [userId]);

  // Socket notification handling
  useEffect(() => {
    if (!socket || !userId || !isConnected) return;

    // Join user-specific notification channel
    console.log(`Joining user notification channel for ${userId}`);
    socket.emit("join_user", userId);

    // Listen for notifications through socket
    const handleNotification = (notification: NotificationModel) => {
      console.log("New notification received via socket:", notification);

      // Only handle if the notification is for this user
      if (
        notification.recipientType === "user" &&
        notification.recipientId === userId
      ) {
        setNotifications((prev) => {
          // Check if we already have this notification to avoid duplicates
          const exists = prev.some((n) => n._id === notification._id);
          if (exists) return prev;

          // Add the new notification and update unread count
          const newNotifications = [notification, ...prev];
          setUnreadCount(newNotifications.filter((n) => !n.read).length);

          // Show native browser notification if supported
          if (
            Notification.permission === "granted" &&
            document.visibilityState !== "visible"
          ) {
            new window.Notification(notification.title, {
              body: notification.message,
              icon: "/favicon.ico",
            });
          }

          return newNotifications;
        });
      }

      // Handle room notifications for all rooms the user is participating in
      if (notification.recipientType === "room") {
        // In a real app, check if user is part of this room
        // For now, we'll assume all room notifications are relevant

        // Add notification and show alert
        setNotifications((prev) => {
          const exists = prev.some((n) => n._id === notification._id);
          if (exists) return prev;

          const newNotifications = [notification, ...prev];
          setUnreadCount(newNotifications.filter((n) => !n.read).length);
          return newNotifications;
        });
      }
    };

    // Socket event for new notifications
    socket.on("notification", handleNotification);

    // Socket events for specific notification types
    socket.on("new_bid", (data) => {
      const { roomId, amount, username } = data;
      // Create a local notification for bids
      const bidNotification: NotificationModel = {
        _id: `local_bid_${Date.now()}`,
        type: "bid",
        title: "New Bid Placed",
        message: `${username} placed a bid of $${amount}`,
        recipientType: "room",
        recipientId: roomId,
        data: data,
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      handleNotification(bidNotification);
    });

    socket.on("auction_win", (data) => {
      // Handle auction win notification
      if (data.winningBid && data.winningBid.userId === userId) {
        const winNotification: NotificationModel = {
          _id: `local_win_${Date.now()}`,
          type: "auction_win",
          title: "Auction Won!",
          message: `You won the auction with a bid of $${data.winningBid.amount}`,
          recipientType: "user",
          recipientId: userId,
          data: data,
          read: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        handleNotification(winNotification);
      }
    });

    // Clean up
    return () => {
      socket.off("notification", handleNotification);
      socket.off("new_bid");
      socket.off("auction_win");
    };
  }, [socket, userId, isConnected]);

  // Initial load and polling for notifications
  useEffect(() => {
    // Initial load
    loadNotifications();

    // Poll every 30 seconds as backup if socket isn't working
    notificationsPollingRef.current = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => {
      if (notificationsPollingRef.current) {
        clearInterval(notificationsPollingRef.current);
      }
    };
  }, [loadNotifications]);

  // Request notification permissions
  useEffect(() => {
    if (
      "Notification" in window &&
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission();
    }
  }, []);

  // Toggle notification panel
  const toggleNotifications = useCallback(() => {
    setShowNotifications((prev) => !prev);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );

      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      await notificationService.markAllAsRead(userId);

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [userId]);

  // Dismiss notification (client-side only)
  const dismissNotification = useCallback(
    (notificationId: string) => {
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));

      // Update unread count if needed
      const wasDismissedUnread = notifications.find(
        (n) => n._id === notificationId && !n.read
      );
      if (wasDismissedUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    },
    [notifications]
  );

  // Force refresh notifications
  const refreshNotifications = useCallback(async () => {
    return loadNotifications();
  }, [loadNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        showNotifications,
        toggleNotifications,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
