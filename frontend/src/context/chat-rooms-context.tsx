import { createContext, useContext, useState} from 'react';
import { ChatRoom } from '../types/chat';

interface ChatRoomsContextType {
    rooms: ChatRoom[];
    currentRoom: ChatRoom | null;
    setCurrentRoom: (room: ChatRoom) => void;
}

const ChatRoomsContext = createContext<ChatRoomsContextType>({
    rooms: [],
    currentRoom: null,
    setCurrentRoom: () => {}
});

export const ChatRoomsProvider = ({ children }: { children: React.ReactNode }) => {
    const [rooms] = useState<ChatRoom[]>([
        {
            id: '1',
            name: 'Diet Chef',
            lastMessage: 'Based on the ingredients you listed...',
            timestamp: 'Today',
            avatar: '🍳'
        },
        {
            id: '2',
            name: 'Stock Market Trading',
            lastMessage: 'The latest market analysis shows...',
            timestamp: 'Today',
            avatar: '📈'
        },
        {
            id: '3',
            name: 'Real Estate Advisor',
            lastMessage: 'Current property trends indicate...',
            timestamp: 'Yesterday',
            avatar: '🏠'
        }
    ]);

    const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);

    return (
        <ChatRoomsContext.Provider value={{ rooms, currentRoom, setCurrentRoom }}>
            {children}
        </ChatRoomsContext.Provider>
    );
};

export const useChatRooms = () => useContext(ChatRoomsContext);