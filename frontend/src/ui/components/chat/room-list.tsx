import { useRooms } from "../../../contexts/room-context";
import { useNavigate } from "react-router-dom";

const RoomList = () => {
  const { rooms, loading, error, fetchRoomById } = useRooms();
  const navigate = useNavigate();

  const handleRoomClick = async (roomId: string) => {
    await fetchRoomById(roomId);
    navigate(`/room/${roomId}`);
  };

  const getRoomStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-green-100 text-green-800";
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse flex flex-col gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>Error loading rooms</p>
        <button
          className="mt-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full pb-20">
      {rooms.length === 0 ? (
        <div className="p-4 text-gray-500 text-center">
          <p>No auction rooms available</p>
        </div>
      ) : (
        <div className="p-2 space-y-3">
          {rooms.map((room) => (
            <div
              key={room._id}
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleRoomClick(room._id)}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium">{room.name}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${getRoomStatusColor(
                    room.status
                  )}`}
                >
                  {room.status}
                </span>
              </div>

              <p className="text-sm text-gray-600 my-1 line-clamp-2">
                {room.description}
              </p>

              <div className="mt-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Item:</span>
                  <span className="font-medium">{room.itemDetails.name}</span>
                </div>
                {room.currentHighestBid && (
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Current bid:</span>
                    <span className="font-medium text-green-600">
                      ${room.currentHighestBid.amount}
                    </span>
                  </div>
                )}
                {!room.currentHighestBid && (
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Starting price:</span>
                    <span className="font-medium">
                      ${room.itemDetails.startingPrice}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList;
