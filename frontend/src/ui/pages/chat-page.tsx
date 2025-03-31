import TwoColumnLayout from '../components/layout/two-column-layout';
import Sidebar from '../components/sidebar/sidebar';
import ChatArea from '../components/chat/chat-area';

const ChatPage = () => {
    return (
        <TwoColumnLayout>
            <Sidebar />
            <ChatArea />
        </TwoColumnLayout>
    );
};

export default ChatPage;