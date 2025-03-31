import { useEffect, useRef, useState } from "react";
import { useSocket } from "../../../context/socket-context";
import { useMessages } from "./message-context";
// import { useRooms } from "../../../contexts/room-context";

interface MessageThreadProps {
  roomId: string;
  userId: string;
}

interface BidData {
  amount: number;
  username?: string;
  timestamp?: string;
}

export default function MessageThread({ roomId, userId }: MessageThreadProps) {
  const { socket } = useSocket();
  const { messages, addMessage } = useMessages();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentRoomIdRef = useRef<string | null>(null);

  // Track if we've already shown the join message for this room session
  const [hasShownJoinMessage, setHasShownJoinMessage] = useState(false);

  useEffect(() => {
    if (!socket || !roomId) return;

    // Only emit join/leave if the room has actually changed
    if (currentRoomIdRef.current !== roomId) {
      // If we were in a previous room, leave it first
      if (currentRoomIdRef.current) {
        console.log(`Leaving room: ${currentRoomIdRef.current}`);
        socket.emit("leave_room", currentRoomIdRef.current);
      }

      console.log(`Joining room: ${roomId}`);
      socket.emit("join_room", roomId);
      currentRoomIdRef.current = roomId;

      // Reset join message flag when changing rooms
      setHasShownJoinMessage(false);
    }

    if (!hasShownJoinMessage) {
      addMessage({
        id: `sys_${Date.now()}`,
        type: "system",
        content: "You joined the auction room",
        sender: "System",
        timestamp: new Date().toISOString(),
        roomId: roomId,
      });
      setHasShownJoinMessage(true);
    }

    // Handle new bids
    const handleNewBid = (data: BidData) => {
      console.log("New bid received:", data);
      addMessage({
        id: `bid_${Date.now()}`,
        type: "bid",
        content: `Placed a bid of $${data.amount}`,
        sender: data.username || "Anonymous",
        timestamp: data.timestamp || new Date().toISOString(),
        amount: data.amount,
        roomId: roomId,
      });
    };

    // Handle auction end notification
    const handleAuctionEnd = (data: {
      winnerId: string;
      winningBid: number;
    }) => {
      const isWinner = data.winnerId === userId;
      const message = isWinner
        ? `Congratulations! You won the auction with a bid of $${data.winningBid}`
        : `Auction ended. The winning bid was $${data.winningBid}`;

      addMessage({
        id: `sys_${Date.now()}`,
        type: "system",
        content: message,
        sender: "System",
        timestamp: new Date().toISOString(),
        roomId: roomId,
      });
    };

    // Handle chat messages
    const handleChatMessage = (data: {
      userId: string;
      username: string;
      message: string;
      roomId?: string;
      timestamp?: string;
      messageId?: string;
    }) => {
      console.log("Chat message received:", data);

      // Only process messages for the current room
      if (data.roomId && data.roomId !== roomId) {
        console.log(
          `Message for room ${data.roomId} ignored (current room: ${roomId})`
        );
        return;
      }

      const isOwnMessage = data.userId === userId;
      const displayName = isOwnMessage ? "You" : data.username;

      // More robust duplicate detection:
      // 1. Check for matching messageId if provided
      // 2. Check for matching content, sender and timestamp within a short time window
      const isDuplicate = messages.some(
        (msg) =>
          // If we have a messageId, use that for exact matching
          (data.messageId && msg.id === data.messageId) ||
          // Otherwise use content + sender + approximate timestamp
          (msg.content === data.message &&
            msg.sender === displayName &&
            Math.abs(
              new Date(msg.timestamp).getTime() -
                new Date(data.timestamp || new Date().toISOString()).getTime()
            ) < 5000)
      );

      if (isDuplicate) {
        console.log("Duplicate message detected, ignoring:", data);
        return;
      }

      // Create a deterministic ID if possible
      const messageId = data.messageId || `chat_${data.userId}_${Date.now()}`;

      addMessage({
        id: messageId,
        type: "chat",
        content: data.message,
        sender: displayName,
        timestamp: data.timestamp || new Date().toISOString(),
        roomId: roomId,
      });
    };

    socket.on("new_bid", handleNewBid);
    socket.on("auction_end", handleAuctionEnd);
    socket.on("chat_message", handleChatMessage);

    return () => {
      socket.off("new_bid", handleNewBid);
      socket.off("auction_end", handleAuctionEnd);
      socket.off("chat_message", handleChatMessage);

      // Only emit leave_room when the component is fully unmounted, not just when changing rooms
      if (currentRoomIdRef.current && !roomId) {
        socket.emit("leave_room", currentRoomIdRef.current);
        currentRoomIdRef.current = null;
      }
    };
  }, [socket, roomId, userId, addMessage, hasShownJoinMessage, messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter messages by the current room ID
  const filteredMessages = messages.filter((msg) => msg.roomId === roomId);

  // Helper to format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col space-y-4 py-3 overflow-y-auto">
      {filteredMessages.map((msg) => {
        const isSystem = msg.type === "system";
        const isBid = msg.type === "bid";
        const isChat = msg.type === "chat";
        const isOwnMessage = msg.sender === "You";
        const isClickable = !!msg.onClick;

        return (
          <div
            key={msg.id}
            className={`${
              isSystem
                ? "flex justify-center"
                : isOwnMessage
                ? "flex justify-end"
                : "flex justify-start"
            } mb-4`}
          >
            {isSystem ? (
              <div
                className={`bg-gray-100 px-4 py-2 rounded-lg text-sm text-gray-600 ${
                  isClickable ? "cursor-pointer hover:bg-gray-200" : ""
                }`}
                onClick={msg.onClick}
              >
                {msg.content}
                <span className="text-xs text-gray-500 ml-2">
                  {formatTime(msg.timestamp)}
                </span>
                {isClickable && (
                  <span className="ml-2 text-blue-500 text-xs">
                    Click to view
                  </span>
                )}
              </div>
            ) : isBid ? (
              <div className="bg-green-50 px-4 py-2 rounded-lg shadow-sm border border-green-100">
                <div className="font-medium text-green-800">
                  {msg.sender} placed a bid
                </div>
                <div className="text-xl font-bold text-green-700">
                  ${msg.amount}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            ) : isChat ? (
              <div
                className={`${
                  isOwnMessage ? "bg-blue-100 text-blue-800" : "bg-gray-100"
                } px-4 py-2 rounded-lg max-w-[80%]`}
              >
                <div className="font-medium">{msg.sender}</div>
                <div>{msg.content}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
