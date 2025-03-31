import { Outlet } from "react-router-dom";
import { RoomProvider } from "../../contexts/room-context";
import Sidebar from "../components/chat/sidebar";

const MainLayout = () => {
  return (
    <RoomProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </RoomProvider>
  );
};

export default MainLayout;
