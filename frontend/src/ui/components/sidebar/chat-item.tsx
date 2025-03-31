import { useNavigate } from 'react-router-dom';
import { useChatRooms } from '../../../context/chat-rooms-context';
import { ChatRoom } from '../../../types/chat';

interface ChatItemProps {
    room: ChatRoom;
}

const ChatItem: React.FC<ChatItemProps> = ({ room }) => {
    const navigate = useNavigate();
    const { setCurrentRoom, currentRoom } = useChatRooms();

    const handleRoomSelect = () => {
        setCurrentRoom(room);
        navigate(`/chat/${room.id}`);
    };

    return (
        <div 
            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                currentRoom?.id === room.id ? 'bg-gray-50' : ''
            }`}
            onClick={handleRoomSelect}
        >
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                    {room.avatar}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {room.name}
                        </p>
                        <span className="text-xs text-gray-500">{room.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{room.lastMessage}</p>
                </div>
            </div>
        </div>
    );
};

export default ChatItem;