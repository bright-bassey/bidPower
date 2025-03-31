import React, { useEffect, useRef } from "react";
import { useNotifications } from "../../../context/notification-context";
import NotificationToast from "./NotificationToast";
import NotificationsPanel from "./NotificationsPanel";

interface NotificationCenterProps {
  // Optional props for customization
  maxToasts?: number;
  toastDuration?: number;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  maxToasts = 3,
  toastDuration = 5000,
}) => {
  const { notifications, unreadCount, showNotifications, toggleNotifications } =
    useNotifications();

  // Track notifications that should show as toasts
  const [toasts, setToasts] = React.useState<string[]>([]);
  const previousNotificationsRef = useRef<string[]>([]);

  // When new notifications arrive, add them as toasts
  useEffect(() => {
    // Get the IDs of the current notifications
    const currentNotificationIds = notifications.map((n) => n._id);

    // Find new notifications that weren't in the previous set
    const newNotificationIds = currentNotificationIds.filter(
      (id) => !previousNotificationsRef.current.includes(id)
    );

    // Update the toasts list with new notifications
    if (newNotificationIds.length > 0) {
      setToasts((prev) => {
        // Combine existing toasts with new ones, limiting to maxToasts
        const updatedToasts = [...prev, ...newNotificationIds].slice(
          -maxToasts
        );
        return updatedToasts;
      });
    }

    // Update the previous notifications ref
    previousNotificationsRef.current = currentNotificationIds;
  }, [notifications, maxToasts]);

  // Auto-dismiss toasts after duration
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setTimeout(() => {
      // Remove the oldest toast
      setToasts((prev) => prev.slice(1));
    }, toastDuration);

    return () => clearTimeout(timer);
  }, [toasts, toastDuration]);

  return (
    <>
      {/* Notification Button with Badge */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleNotifications}
          className="relative p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors focus:outline-none"
          aria-label="Notifications"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications Panel */}
      {showNotifications && <NotificationsPanel />}

      {/* Toast Notifications */}
      <div className="fixed top-16 right-4 z-40 flex flex-col gap-2">
        {toasts.map((id) => {
          const notification = notifications.find((n) => n._id === id);
          if (!notification) return null;

          return (
            <NotificationToast
              key={id}
              notification={notification}
              onDismiss={() =>
                setToasts((prev) => prev.filter((toastId) => toastId !== id))
              }
            />
          );
        })}
      </div>
    </>
  );
};

export default NotificationCenter;
