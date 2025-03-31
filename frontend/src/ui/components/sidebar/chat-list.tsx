import { useChatRooms } from '../../../context/chat-rooms-context';
import ChatItem from './chat-item';

const ChatList = () => {
    const { rooms } = useChatRooms();

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="py-2">
                <div className="px-4 py-1 text-xs text-gray-500">Today</div>
                {rooms.map(room => (
                    <ChatItem 
                        key={room.id}
                        room={room}
                    />
                ))}
            </div>
        </div>
    );
};

export default ChatList;