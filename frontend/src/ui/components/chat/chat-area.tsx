import ChatHeader from "./chat-header";
import MessageThread from "./message-thread";
import MessageInput from "./message-input";
import { useState, useEffect } from "react";

const ChatArea = () => {
  const [userId, setUserId] = useState<string>("");

  // Get user ID from localStorage or create a mock one
  useEffect(() => {
    const storedUserId =
      localStorage.getItem("userId") ||
      `user_${Math.floor(Math.random() * 1000)}`;
    setUserId(storedUserId);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-screen">
      <ChatHeader />

      <div className="flex-grow overflow-auto">
        <MessageThread roomId="general" userId={userId} />
      </div>

      <MessageInput roomId="general" />
    </div>
  );
};

export default ChatArea;
