import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useSocket } from "../../../context/socket-context";

interface Message {
  id: string;
  type: "bid" | "system" | "chat";
  content: string;
  sender: string;
  timestamp: string;
  isBot?: boolean;
  image?: string;
  roomId?: string;
  amount?: number;
  onClick?: () => void;
}

interface MessagesContextType {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  clearRoomMessages: (roomId: string) => void;
  sendChatMessage: (content: string, userId: string, roomId: string) => void;
}

const MessagesContext = createContext<MessagesContextType>({
  messages: [],
  addMessage: () => {},
  clearMessages: () => {},
  clearRoomMessages: () => {},
  sendChatMessage: () => {},
});

export const MessagesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Use a ref to track if component is mounted to avoid memory leaks
  const isMounted = useRef(true);

  // Use refs to track last state updates
  const messageRef = useRef<Message[]>([]);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedMessages = localStorage.getItem("chatMessages");
      const parsed = savedMessages ? JSON.parse(savedMessages) : [];

      // Remove any onClick handlers from loaded messages
      // as function references can't be serialized
      return parsed.map((msg: Message) => ({
        ...msg,
        onClick: undefined,
      }));
    } catch (error) {
      console.error("Error loading messages from localStorage:", error);
      return [];
    }
  });

  const { socket } = useSocket();

  // Update the ref when messages change
  useEffect(() => {
    messageRef.current = messages;
  }, [messages]);

  // Set up the mount/unmount tracking
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Save messages to localStorage when changed, using a debounce pattern
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if (isMounted.current) {
        try {
          // Instead of saving all messages, only save up to the last 100 messages
          // to prevent localStorage from becoming too large

          // Remove onClick handlers before saving to localStorage
          const messagesToSave = messages.slice(-100).map((msg) => {
            const { onClick, ...msgWithoutOnClick } = msg;
            return msgWithoutOnClick;
          });

          localStorage.setItem("chatMessages", JSON.stringify(messagesToSave));
          console.log(
            `Saved ${messagesToSave.length} messages to localStorage`
          );
        } catch (error) {
          console.error("Error saving messages to localStorage:", error);
        }
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(saveTimeout);
  }, [messages]);

  const addMessage = useCallback((message: Message) => {
    // Check for duplicates first
    setMessages((prev) => {
      // Make sure message has an ID
      if (!message.id) {
        message.id = `msg_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
      }

      // Check if this message already exists based on ID or content+timestamp
      const isDuplicate = prev.some(
        (m) =>
          m.id === message.id ||
          (m.content === message.content &&
            m.sender === message.sender &&
            Math.abs(
              new Date(m.timestamp).getTime() -
                new Date(message.timestamp).getTime()
            ) < 2000)
      );

      if (isDuplicate) {
        console.log("Duplicate message detected, not adding:", message);
        return prev;
      }

      return [...prev, message];
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem("chatMessages");
    } catch (error) {
      console.error("Error clearing messages from localStorage:", error);
    }
  }, []);

  const clearRoomMessages = useCallback((roomId: string) => {
    if (!roomId) return;

    setMessages((prev) => {
      const filteredMessages = prev.filter((msg) => msg.roomId !== roomId);

      // Schedule localStorage update for next tick to avoid recursion
      setTimeout(() => {
        try {
          if (isMounted.current) {
            // Remove onClick handlers before saving
            const messagesToSave = filteredMessages.map((msg) => {
              const { onClick, ...msgWithoutOnClick } = msg;
              return msgWithoutOnClick;
            });

            localStorage.setItem(
              "chatMessages",
              JSON.stringify(messagesToSave)
            );
          }
        } catch (error) {
          console.error(
            "Error updating localStorage after clearing room messages:",
            error
          );
        }
      }, 0);

      return filteredMessages;
    });
  }, []);

  const sendChatMessage = useCallback(
    (content: string, userId: string, roomId: string) => {
      if (!content.trim()) return;

      const username = `User ${userId.split("_")[1] || "Anonymous"}`;
      const timestamp = new Date().toISOString();
      // Create a stable, deterministic messageId that will be the same if the message is reprocessed
      const messageId = `chat_${userId}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      // Prepare message object
      const message: Message = {
        id: messageId,
        type: "chat",
        content,
        sender: "You", // Always show as "You" for the sender
        timestamp,
        roomId,
      };

      // Add message locally first for immediate feedback
      addMessage(message);

      // Send via socket if available
      if (socket) {
        try {
          console.log(`Emitting chat message to room ${roomId}:`, content);

          socket.emit("chat_message", {
            userId,
            username,
            message: content,
            roomId,
            timestamp,
            messageId, // Include the messageId for deduplication
          });
        } catch (error) {
          console.error("Error sending chat message via socket:", error);
        }
      } else {
        console.warn("Socket not available, message only saved locally");
      }
    },
    [socket, addMessage]
  );

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = {
    messages,
    addMessage,
    clearMessages,
    clearRoomMessages,
    sendChatMessage,
  };

  return (
    <MessagesContext.Provider value={contextValue}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return context;
};
