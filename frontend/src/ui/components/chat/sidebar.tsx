import { useState, useEffect } from "react";
import RoomList from "./room-list";
import CreateRoomModal from "./create-room-modal";
import { useRooms } from "../../../context/room-context";

const Sidebar = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { fetchRooms } = useRooms();

  // Check if the screen is mobile size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIfMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Initially close sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    // Refresh the rooms list after creating a new room
    fetchRooms();
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <>
      {/* Mobile toggle button - shown only on mobile */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed z-20 top-4 left-4 bg-blue-500 text-white p-2 rounded-md shadow-md"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"
              }
            />
          </svg>
        </button>
      )}

      {/* Sidebar - conditionally shown based on sidebarOpen state */}
      <div
        className={`${isMobile ? "absolute z-10" : "relative"} ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } w-80 border-r flex flex-col h-full bg-white transition-transform duration-300 ease-in-out`}
      >
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

      {/* Overlay to close sidebar when clicking outside for mobile only */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-0"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
