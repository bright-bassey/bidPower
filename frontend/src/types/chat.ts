export interface ChatRoom {
    id: string;
    name: string;
    lastMessage?: string;
    timestamp?: string;
    avatar?: string;
    unreadCount?: number;
}

export interface Message {
    id: string;
    content: string;
    sender: string;
    timestamp: string;
    roomId: string;  
    isBot?: boolean;
}