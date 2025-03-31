import React from "react";

interface MessageData {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  isBot?: boolean;
  image?: string;
  roomId?: string;
}

interface MessageProps {
  message: MessageData;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const { isBot, content, image, timestamp, sender } = message;
  const isUserMessage = sender === "user";

  return (
    <div
      className={`flex ${
        isBot || !isUserMessage ? "items-start" : "items-end justify-end"
      } gap-3`}
    >
      {(isBot || !isUserMessage) && (
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center">
          🍳
        </div>
      )}
      <div
        className={`max-w-[80%] ${
          isBot || !isUserMessage ? "bg-gray-100" : "bg-blue-500 text-white"
        } rounded-2xl px-4 py-3`}
      >
        <div className="whitespace-pre-wrap text-sm">{content}</div>
        {image && (
          <div className="mt-3">
            <img
              src={image}
              alt="Message attachment"
              className="rounded-lg max-w-full h-auto"
            />
          </div>
        )}
        <div
          className={`text-xs mt-1 ${
            isBot || !isUserMessage ? "text-gray-500" : "text-blue-200"
          }`}
        >
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default Message;
