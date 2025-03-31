import SidebarHeader from './sidebar-header';
import SearchBar from './searchbar';
import ChatList from './chat-list';

const Sidebar = () => {
    return (
        <div className="w-[320px] border-r border-gray-200 h-full flex flex-col">
            <SidebarHeader />
            <SearchBar />
            <ChatList />
        </div>
    );
};

export default Sidebar;