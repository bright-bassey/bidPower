import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  reconnect: () => void;
  lastError: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  reconnect: () => {},
  lastError: null,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const connectAttempts = useRef(0);
  const isMounted = useRef(true);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const setupSocketConnection = useCallback(() => {
    // Cancel any pending reconnect timers
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    // Get the notification service URL from environment variables
    const notificationServiceUrl =
      import.meta.env.VITE_NOTIFICATION_SERVICE_URL || "http://localhost:4003";

    console.log(`Initializing socket connection to: ${notificationServiceUrl}`);

    // Don't create a new socket if one already exists and is connected
    if (socketRef.current?.connected) {
      console.log("Socket already connected, reusing existing connection");
      return;
    }

    // Clean up any existing socket that might be in a bad state
    if (socketRef.current) {
      console.log("Cleaning up existing socket");
      try {
        socketRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting existing socket:", e);
      }
      socketRef.current = null;
    }

    try {
      // Configure socket with proper settings
      const newSocket = io(notificationServiceUrl, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000,
        autoConnect: true,
        forceNew: true, // Try with a fresh connection to avoid stale state
        auth: {
          timestamp: new Date().toISOString(), // Add dynamic auth to prevent caching
        },
      });

      // Store the socket in both state and ref
      socketRef.current = newSocket;
      setSocket(newSocket);
      setLastError(null);

      // Set up event listeners
      newSocket.on("connect", () => {
        console.log("Socket.IO connected successfully", newSocket.id);
        setIsConnected(true);
        connectAttempts.current = 0;
        setLastError(null);
      });

      newSocket.on("connect_error", (error) => {
        const errorMsg = `Socket connection error: ${error.message}`;
        console.error(errorMsg, error);
        setIsConnected(false);
        setLastError(errorMsg);
        connectAttempts.current += 1;

        // After several attempts, try reconnecting less frequently
        if (connectAttempts.current > 5 && isMounted.current) {
          console.log(
            "Multiple connection attempts failed, slowing down reconnection"
          );

          // Schedule a reconnect with exponential backoff (max 30 seconds)
          const delay = Math.min(
            Math.pow(2, connectAttempts.current - 5) * 1000,
            30000
          );
          reconnectTimeout.current = setTimeout(() => {
            if (isMounted.current) {
              console.log(`Attempting reconnect after ${delay}ms delay`);
              setupSocketConnection();
            }
          }, delay);
        }
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Socket.IO disconnected, reason:", reason);
        setIsConnected(false);

        // Auto reconnect for various disconnect reasons
        if (isMounted.current) {
          console.log(`Planning reconnect after disconnect (${reason})`);
          // Schedule reconnect attempt
          reconnectTimeout.current = setTimeout(() => {
            if (isMounted.current) {
              console.log("Attempting to reconnect after disconnect");
              setupSocketConnection();
            }
          }, 2000);
        }
      });

      newSocket.on("error", (error) => {
        const errorMsg = `Socket error: ${error.message || "Unknown error"}`;
        console.error(errorMsg, error);
        setLastError(errorMsg);
      });

      // Make sure it connects
      if (!newSocket.connected) {
        newSocket.connect();
      }
    } catch (error: any) {
      const errorMsg = `Failed to initialize Socket.IO: ${
        error.message || "Unknown error"
      }`;
      console.error(errorMsg, error);
      setLastError(errorMsg);
    }
  }, []);

  // Reconnect function that can be called from outside
  const reconnect = useCallback(() => {
    console.log("Manual reconnection requested");
    connectAttempts.current = 0; // Reset attempts counter for manual reconnection
    setupSocketConnection();
  }, [setupSocketConnection]);

  // Clean up on unmount
  useEffect(() => {
    isMounted.current = true;

    // Initial connection setup
    setupSocketConnection();

    // Clean up function - only run on unmount
    return () => {
      console.log("Cleaning up socket provider - disconnecting socket");
      isMounted.current = false;

      // Clear any scheduled reconnects
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }

      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch (e) {
          console.error("Error during socket cleanup:", e);
        }
        socketRef.current = null;
      }
    };
  }, [setupSocketConnection]);

  // Heartbeat to detect zombie connections
  useEffect(() => {
    if (!socket || !isConnected) return;

    const heartbeatInterval = setInterval(() => {
      if (socket && typeof socket.connected !== "undefined") {
        if (!socket.connected && isConnected) {
          console.log(
            "Heartbeat detected disconnected socket, reconnecting..."
          );
          setIsConnected(false);
          reconnect();
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(heartbeatInterval);
  }, [socket, isConnected, reconnect]);

  return (
    <SocketContext.Provider
      value={{ socket, isConnected, reconnect, lastError }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
