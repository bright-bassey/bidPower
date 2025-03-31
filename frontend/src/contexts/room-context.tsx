import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import roomService, {
  Room,
  CreateRoomPayload,
  BidPayload,
} from "../services/room.service";
import biddingService from "../services/bidding.service";
// import { useSocket } from "../context/socket-context";

interface RoomContextType {
  rooms: Room[];
  currentRoom: Room | null;
  loading: boolean;
  error: string | null;
  fetchRooms: () => Promise<void>;
  fetchRoomById: (roomId: string) => Promise<void>;
  createRoom: (roomData: CreateRoomPayload) => Promise<Room>;
  joinRoom: (joinData: { roomId: string; userId: string }) => Promise<any>;
  placeBid: (roomId: string, bidData: BidPayload) => Promise<Room>;
  updateRoom: (room: Room) => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await roomService.getAllRooms();
      setRooms(data);
    } catch (err) {
      setError("Failed to fetch rooms");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoomById = useCallback(
    async (roomId: string) => {
      if (currentRoom && currentRoom._id === roomId && !loading) {
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const room = await roomService.getRoomById(roomId);
        setCurrentRoom(room);
      } catch (err) {
        setError("Failed to fetch room details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [currentRoom, loading]
  );

  const createRoom = useCallback(
    async (roomData: CreateRoomPayload): Promise<Room> => {
      setLoading(true);
      setError(null);
      try {
        const newRoom = await roomService.createRoom(roomData);
        setRooms((prevRooms) => [...prevRooms, newRoom]);
        return newRoom;
      } catch (err) {
        setError("Failed to create room");
        console.error(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const joinRoom = useCallback(
    async (joinData: { roomId: string; userId: string }) => {
      setLoading(true);
      setError(null);
      try {
        console.log("Joining room with data:", joinData);

        // Explicitly pass the separate parameters instead of the object
        await roomService.joinRoom(joinData.roomId, joinData.userId);

        await fetchRoomById(joinData.roomId);
        return true;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || "Failed to join room";
        setError(errorMessage);
        console.error("Join room error:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchRoomById]
  );

  const placeBid = useCallback(
    async (roomId: string, bidData: BidPayload): Promise<Room> => {
      setLoading(true);
      setError(null);
      try {
        // Add a username for the bid to display in the chat
        const username = `User ${bidData.userId.split("_")[1] || "Anonymous"}`;

        // Get information about the previous highest bidder and room name for notifications
        let previousHighestBidder = null;
        let roomName = "";

        if (currentRoom) {
          roomName = currentRoom.name;
          if (
            currentRoom.currentHighestBid &&
            currentRoom.currentHighestBid.userId
          ) {
            previousHighestBidder = currentRoom.currentHighestBid.userId;
          }
        }

        const enhancedBidData = {
          ...bidData,
          username,
          previousHighestBidder,
          roomName,
        };

        console.log("Placing bid via bidding service:", {
          roomId,
          ...enhancedBidData,
        });

        // First, place the bid in the bidding service
        try {
          await biddingService.placeBid({
            roomId,
            userId: bidData.userId,
            amount: bidData.amount,
            username,
            previousHighestBidder,
            roomName,
          });
          console.log("Bid successfully recorded in bidding service");
        } catch (error) {
          console.error("Error in bidding service:", error);
          throw new Error(
            "Failed to place bid in the bidding service. Please try again."
          );
        }

        // Then update the room's highest bid in the room service
        try {
          const updatedRoom = await roomService.updateHighestBid(
            roomId,
            enhancedBidData
          );

          // Update rooms list with new bid info
          setRooms((prevRooms) =>
            prevRooms.map((room) => (room._id === roomId ? updatedRoom : room))
          );

          // Update current room if it's the one being updated
          if (currentRoom && currentRoom._id === roomId) {
            setCurrentRoom(updatedRoom);
          }

          return updatedRoom;
        } catch (error) {
          console.error("Error updating room with new bid:", error);
          throw new Error(
            "Your bid was placed but we couldn't update the room data. Refresh to see the current status."
          );
        }
      } catch (err: any) {
        const errorMessage = err.message || "Failed to place bid";
        setError(errorMessage);
        console.error("Place bid error:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentRoom]
  );

  const updateRoom = useCallback((room: Room) => {
    setCurrentRoom(room);
  }, []);

  // Initial load of rooms
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return (
    <RoomContext.Provider
      value={{
        rooms,
        currentRoom,
        loading,
        error,
        fetchRooms,
        fetchRoomById,
        createRoom,
        joinRoom,
        placeBid,
        updateRoom,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRooms = () => {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error("useRooms must be used within a RoomProvider");
  }
  return context;
};

export default RoomContext;
