import { useState } from "react";
import RoomList from "./room-list";
import CreateRoomModal from "./create-room-modal";
import { useRooms } from "../../../contexts/room-context";

const Sidebar = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { fetchRooms } = useRooms();

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    // Refresh the rooms list after creating a new room
    fetchRooms();
  };

  return (
    <div className="w-80 border-r flex flex-col h-full bg-white">
      <div className="h-[60px] border-b flex items-center px-4">
        <h1 className="text-lg font-semibold flex-1">Bidding Rooms</h1>
        <button
          className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600"
          onClick={handleOpenCreateModal}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <RoomList />
      </div>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
      />
    </div>
  );
};

export default Sidebar;
