import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRooms } from "../../../contexts/room-context";
import { useParams, useNavigate } from "react-router-dom";
import roomService from "../../../services/room.service";
import biddingService from "../../../services/bidding.service";
import { useMessages } from "./message-context";
import { useSocket } from "../../../context/socket-context";
// import { useNotifications } from "../../../context/notification-context";
import MessageThread from "./message-thread";
import MessageInput from "./message-input";
import AuctionWinnerController from "../invoice/AuctionWinnerController";

// Add this type definition for better type safety
interface BidHistoryItem {
  _id: string;
  userId: string;
  username: string;
  amount: number;
  timestamp: string;
  roomId: string;
}

interface AggregatedBid {
  userId: string;
  username: string;
  totalAmount: number;
  lastBidTime: string;
  bidCount: number;
}

const RoomDetail = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { currentRoom, loading, error, fetchRoomById, placeBid, updateRoom } =
    useRooms();
  const { addMessage, clearRoomMessages } = useMessages();
  const { isConnected, reconnect, socket } = useSocket();
  // const { refreshNotifications } = useNotifications();
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [userId, setUserId] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>([]);
  const [aggregatedBids, setAggregatedBids] = useState<AggregatedBid[]>([]);
  const [loadingBids, setLoadingBids] = useState<boolean>(false);
  const [isManualRefresh, setIsManualRefresh] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Add a ref to track the last highest bid ID we synced with
  const lastSyncedBidRef = useRef<string | null>(null);

  // Mock user authentication - In a real app, you'd get this from auth context
  useEffect(() => {
    // Mock user ID - In real app this would come from authentication
    // Make sure the userId is a simple string format to match our updated model
    setUserId(`user_${Math.floor(Math.random() * 1000)}`);
  }, []);

  // Clear room messages when room changes - preventing the infinite re-render
  const clearMessagesForRoom = useCallback(
    (id: string) => {
      if (id) {
        clearRoomMessages(id);
      }
    },
    [clearRoomMessages]
  );

  // Fetch room data when component mounts
  useEffect(() => {
    if (roomId) {
      fetchRoomById(roomId);
      // Clear previous messages for this room to avoid duplicates
      clearMessagesForRoom(roomId);
      // Reset the bid sync ref when changing rooms
      lastSyncedBidRef.current = null;
    }
  }, [roomId, fetchRoomById, clearMessagesForRoom]);

  // Handle successful join
  useEffect(() => {
    if (currentRoom && userId) {
      const isUserInRoom =
        currentRoom.participants &&
        Array.isArray(currentRoom.participants) &&
        currentRoom.participants.includes(userId);

      if (isUserInRoom) {
        setJoinSuccess(true);
      }
    }
  }, [currentRoom, userId]);

  // Calculate time left
  useEffect(() => {
    if (!currentRoom) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const endTime = new Date(currentRoom.endTime);

      // If auction ended
      if (now > endTime) {
        setTimeLeft("Auction ended");
        return;
      }

      // If auction not started yet
      const startTime = new Date(currentRoom.startTime);
      if (now < startTime) {
        setTimeLeft("Auction not started yet");
        return;
      }

      // Calculate time left
      const diffMs = endTime.getTime() - now.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft(`${diffHrs}h ${diffMins}m ${diffSecs}s`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [currentRoom]);

  // Set minimum bid amount
  useEffect(() => {
    if (currentRoom) {
      const minBid = currentRoom.currentHighestBid
        ? currentRoom.currentHighestBid.amount + 1
        : currentRoom.itemDetails.startingPrice;

      setBidAmount(minBid);
    }
  }, [currentRoom]);

  // Add error display for API errors
  useEffect(() => {
    if (error) {
      setActionError(error);
    }
  }, [error]);

  // Update the isParticipant calculation
  const determineIsParticipant = () => {
    // First check the joinSuccess flag (from UI interaction)
    if (joinSuccess) return true;

    // Then check if user is in room participants list (from backend)
    return !!(
      currentRoom &&
      currentRoom.participants &&
      Array.isArray(currentRoom.participants) &&
      userId &&
      currentRoom.participants.includes(userId)
    );
  };

  const isParticipant = determineIsParticipant();
  const isLive = currentRoom ? currentRoom.status === "live" : false;
  const isClosed = currentRoom ? currentRoom.status === "closed" : false;

  // Update the minimum bid calculation and isUserHighestBidder flag
  const getHighestBidAmount = useCallback(() => {
    // If we have bid history, use the highest bid from there
    if (bidHistory.length > 0) {
      return bidHistory[0].amount;
    }
    // Otherwise fall back to currentRoom
    return (
      currentRoom?.currentHighestBid?.amount ||
      currentRoom?.itemDetails?.startingPrice ||
      0
    );
  }, [bidHistory, currentRoom]);

  const getMinimumBidAmount = useCallback(() => {
    return getHighestBidAmount() + 1;
  }, [getHighestBidAmount]);

  // Update the isUserHighestBidder check to use bidHistory first
  const isUserHighestBidder = useMemo(() => {
    if (bidHistory.length > 0) {
      return bidHistory[0].userId === userId;
    }
    return currentRoom?.currentHighestBid?.userId === userId || false;
  }, [bidHistory, currentRoom, userId]);

  // Function to aggregate bids by user
  const aggregateBidsByUser = useCallback((bids: BidHistoryItem[]) => {
    const userBids = new Map<string, AggregatedBid>();

    bids.forEach((bid) => {
      const existingUserBid = userBids.get(bid.userId);

      if (existingUserBid) {
        // Update existing user bid data
        existingUserBid.totalAmount += bid.amount;
        existingUserBid.bidCount += 1;
        // Update last bid time only if newer
        if (new Date(bid.timestamp) > new Date(existingUserBid.lastBidTime)) {
          existingUserBid.lastBidTime = bid.timestamp;
        }
      } else {
        // Create new user bid entry
        userBids.set(bid.userId, {
          userId: bid.userId,
          username: bid.username,
          totalAmount: bid.amount,
          lastBidTime: bid.timestamp,
          bidCount: 1,
        });
      }
    });

    // Convert map to array and sort by total amount (highest first)
    return Array.from(userBids.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );
  }, []);

  // Function to refresh bid history - wrapped in useCallback to optimize performance
  const refreshBidHistory = useCallback(
    async (manual = false, force = false) => {
      if (!roomId || !isParticipant) return;

      try {
        setLoadingBids(true);
        setIsManualRefresh(manual);

        // Force fresh data from server by adding a timestamp parameter
        const timestamp = new Date().getTime();
        const bids = await biddingService.getBidsByRoom(
          roomId,
          force ? timestamp : undefined
        );

        // Update the last refresh time
        setLastRefreshTime(new Date());

        if (bids.length > 0) {
          // Ensure we sort by amount in descending order
          const sortedBids = bids.sort((a, b) => b.amount - a.amount);
          console.log("Refreshed bid history, highest bid:", sortedBids[0]);
          setBidHistory(sortedBids);

          // Create aggregated bids
          const aggregated = aggregateBidsByUser(sortedBids);
          setAggregatedBids(aggregated);

          // Update current room if we have new highest bid
          if (currentRoom) {
            const highestBid = sortedBids[0];
            if (
              !currentRoom.currentHighestBid ||
              highestBid.amount > currentRoom.currentHighestBid.amount
            ) {
              console.log("Updating room with highest bid:", highestBid);

              // Still fetch from API to ensure consistency
              fetchRoomById(roomId);
            }
          }
        } else {
          console.log("No bids found for room:", roomId);
          setBidHistory([]);
          setAggregatedBids([]);
        }
      } catch (error) {
        console.error("Error refreshing bid history:", error);
      } finally {
        setLoadingBids(false);
        // If manual refresh, clear the manual flag after a short delay
        if (manual) {
          setTimeout(() => setIsManualRefresh(false), 500);
        }
      }
    },
    [
      roomId,
      isParticipant,
      currentRoom,
      fetchRoomById,
      aggregateBidsByUser,
      setBidHistory,
      setAggregatedBids,
      setLoadingBids,
      setIsManualRefresh,
      setLastRefreshTime,
    ]
  );

  // Update the bid history useEffect - only set up automatic refresh if not manual refresh
  useEffect(() => {
    // Initial fetch
    refreshBidHistory(false);

    // Set up interval for background refreshing - increase to 30 seconds to reduce flickering
    const interval = setInterval(() => {
      // Use a less disruptive refresh method for automatic updates
      refreshBidHistory(false, false);
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshBidHistory]);

  // Add a new useEffect to sync the highest bid from history with the current room
  useEffect(() => {
    // Only run this if we have bid history and a current room
    if (bidHistory.length > 0 && currentRoom && roomId) {
      // Get the highest bid from history (already sorted in descending order)
      const highestBidFromHistory = bidHistory[0];

      // Check if we've already synced this bid
      const alreadySynced =
        lastSyncedBidRef.current === highestBidFromHistory._id;

      // If current room doesn't have a highest bid or it's outdated and we haven't synced this bid yet
      if (
        !alreadySynced &&
        (!currentRoom.currentHighestBid ||
          highestBidFromHistory.amount > currentRoom.currentHighestBid.amount)
      ) {
        console.log(
          "Syncing room with highest bid from history:",
          highestBidFromHistory
        );

        // Update our ref to prevent duplicate syncs
        lastSyncedBidRef.current = highestBidFromHistory._id;

        // Refresh the room data to update the UI
        fetchRoomById(roomId);
      }
    }
  }, [bidHistory, currentRoom, roomId, fetchRoomById]);

  const handleJoinRoom = async () => {
    setActionError(null);

    try {
      if (!roomId || !userId) {
        setActionError("Missing room or user information");
        return;
      }

      console.log(`Attempting to join room ${roomId} with userId ${userId}`);

      // Check if already a participant
      if (currentRoom?.participants?.includes(userId)) {
        console.log(
          "User is already a participant, setting joinSuccess to true"
        );
        setJoinSuccess(true);
        return;
      }

      // Set loading state
      setIsJoining(true);

      // Direct call to service to avoid context issues
      console.log("Making API call to join room...");
      const response = await roomService.joinRoom(roomId, userId);
      console.log("Join room response:", response);

      console.log("Setting joinSuccess to true and refreshing room data");
      setJoinSuccess(true);

      // Refresh room data to get updated participants list
      await fetchRoomById(roomId);
      console.log("Room data refreshed after joining");
    } catch (error: any) {
      console.error("Error joining room:", error);

      // Error handling
      let errorMessage = "Failed to join room. Please try again.";

      if (error.message) {
        errorMessage = error.message;
      }

      setActionError(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const handlePlaceBid = async (e?: React.FormEvent) => {
    // Prevent any form submission that might cause page reload
    if (e) {
      e.preventDefault();
    }

    if (!roomId || !userId || !bidAmount) {
      setActionError("Missing required information for bid");
      return;
    }

    setActionError(null);

    // Disable the button right away
    const bidButton = document.getElementById("place-bid-button");
    if (bidButton) {
      bidButton.setAttribute("disabled", "true");
      bidButton.textContent = "Placing Bid...";
    }

    try {
      // Validate bid amount
      if (!currentRoom) {
        throw new Error("Room information not available");
      }

      // Use the new function to get minimum bid
      const minBid = getMinimumBidAmount();

      // Strict validation to ensure bid meets minimum
      if (bidAmount < minBid) {
        throw new Error(`Bid amount must be at least $${minBid}`);
      }

      // Check if user is already highest bidder
      if (isUserHighestBidder) {
        throw new Error("You are already the highest bidder!");
      }

      const username = `User ${userId.split("_")[1] || "Anonymous"}`;

      // Place the bid through the context
      await placeBid(roomId, {
        amount: bidAmount,
        userId,
        username,
      });

      // Add local message for immediate feedback
      addMessage({
        id: `local-bid-${Date.now()}`,
        type: "bid",
        content: `Placed a bid of $${bidAmount}`,
        sender: `You`,
        timestamp: new Date().toISOString(),
        amount: bidAmount,
        roomId,
      });

      // Refresh room to update current highest bid
      await fetchRoomById(roomId);

      // Refresh bid history immediately with manual flag and force fresh data
      await refreshBidHistory(true, true);

      // Increment bid amount for next bid
      setBidAmount(bidAmount + 1);

      console.log("Bid placed successfully");
    } catch (err: any) {
      console.error("Error placing bid:", err);
      let errorMessage = "Failed to place bid. Please try again.";

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setActionError(errorMessage);
    } finally {
      // Re-enable the button
      if (bidButton) {
        bidButton.removeAttribute("disabled");
        bidButton.textContent = "Place Bid";
      }
    }
  };

  // Function to handle auction end
  const handleAuctionEnd = useCallback(
    async (winnerId: string, winningBid: number) => {
      if (!currentRoom || !roomId) return;

      // Just update the room status to closed
      if (currentRoom) {
        updateRoom({
          ...currentRoom,
          status: "closed",
          currentHighestBid: {
            userId: winnerId,
            amount: winningBid,
          },
        });
      }

      // We'll let AuctionWinnerController handle the invoice creation
    },
    [currentRoom, roomId, updateRoom]
  );

  // Listen for auction end events
  useEffect(() => {
    if (!socket || !roomId) return;

    const onAuctionEnd = (data: {
      roomId: string;
      winnerId: string;
      winningBid: number;
    }) => {
      console.log("Auction end event received:", data);

      if (data.roomId === roomId) {
        // Handle invoice creation for winner
        handleAuctionEnd(data.winnerId, data.winningBid);
      }
    };

    // Listen for both event types for compatibility
    socket.on("auction_end", onAuctionEnd);
    socket.on("auction_ended", onAuctionEnd);

    return () => {
      socket.off("auction_end", onAuctionEnd);
      socket.off("auction_ended", onAuctionEnd);
    };
  }, [socket, roomId, currentRoom, updateRoom, handleAuctionEnd]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading room details...</p>
      </div>
    );
  }

  if (error || !currentRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-red-500 mb-4">{error || "Room not found"}</div>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Back to Rooms
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {!isConnected && (
        <div className="bg-yellow-50 p-4 border-b border-yellow-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You are currently disconnected from the server.
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => reconnect()}
                  className="inline-flex bg-yellow-100 p-1.5 rounded-md text-yellow-500 hover:bg-yellow-200 focus:outline-none"
                >
                  <span className="sr-only">Reconnect</span>
                  <span className="px-2 py-1 text-xs font-medium">
                    Reconnect
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex justify-center items-center z-10">
          <div className="animate-spin h-10 w-10 border-4 border-green-500 rounded-full border-t-transparent"></div>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-red-100 text-red-700 border border-red-300 rounded-md mx-4 mt-4 absolute top-0 right-0 z-20">
          <p>{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="mt-2 px-3 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Fixed Header with Room Info */}
      <div className="p-4 border-b bg-white flex-shrink-0">
        <div className="flex items-start">
          <div className="flex-grow">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{currentRoom.name}</h1>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  isLive
                    ? "bg-green-100 text-green-800"
                    : isClosed
                    ? "bg-gray-100 text-gray-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {currentRoom.status}
              </span>
            </div>
            <p className="text-gray-600 mt-1">{currentRoom.description}</p>
          </div>
        </div>

        {/* Item & Auction Details - Collapsible Section */}
        <details className="mt-3">
          <summary className="font-medium text-blue-600 cursor-pointer">
            Show Auction Details
          </summary>
          <div className="mt-3 grid md:grid-cols-2 gap-4 pb-2">
            {/* Item Details */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Item Details</h3>
              <p className="text-gray-800 font-medium">
                {currentRoom.itemDetails.name}
              </p>
              <p className="text-gray-600 text-sm mb-2">
                {currentRoom.itemDetails.description}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Starting Price: </span>$
                {currentRoom.itemDetails.startingPrice}
              </p>
              {currentRoom.itemDetails.imageUrl && (
                <img
                  src={currentRoom.itemDetails.imageUrl}
                  alt={currentRoom.itemDetails.name}
                  className="w-full mt-3 rounded-md object-cover"
                  style={{ maxHeight: "200px" }}
                />
              )}
            </div>

            {/* Auction Info */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Auction Info</h3>
              <p className="text-gray-700">
                <span className="font-medium">Time Left: </span>
                <span
                  className={
                    isClosed ? "text-red-600" : isLive ? "text-green-600" : ""
                  }
                >
                  {timeLeft}
                </span>
              </p>

              {/* Enhanced Current Bid Display - use bidHistory[0] if available */}
              <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-700 font-medium">
                  Current Highest Bid:
                </p>
                {bidHistory.length > 0 ? (
                  <div className="mt-1">
                    <div className="text-2xl font-bold text-green-600">
                      ${bidHistory[0].amount}
                    </div>
                    <p className="text-sm text-gray-500">
                      by{" "}
                      {bidHistory[0].userId === userId
                        ? "You"
                        : bidHistory[0].username}
                    </p>
                    {isLive && bidHistory[0].userId !== userId && (
                      <p className="text-xs text-gray-500 mt-1">
                        Min. next bid: ${bidHistory[0].amount + 1}
                      </p>
                    )}
                  </div>
                ) : currentRoom.currentHighestBid ? (
                  <div className="mt-1">
                    <div className="text-2xl font-bold text-green-600">
                      ${currentRoom.currentHighestBid.amount}
                    </div>
                    <p className="text-sm text-gray-500">
                      by{" "}
                      {currentRoom.currentHighestBid.userId === userId
                        ? "You"
                        : `User ${
                            currentRoom.currentHighestBid.userId.split(
                              "_"
                            )[1] || "Anonymous"
                          }`}
                    </p>
                    {isLive && !isUserHighestBidder && (
                      <p className="text-xs text-gray-500 mt-1">
                        Min. next bid: $
                        {currentRoom.currentHighestBid.amount + 1}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-1">
                    <div className="text-xl text-gray-600">No bids yet</div>
                    <p className="text-xs text-gray-500 mt-1">
                      Starting at ${currentRoom.itemDetails.startingPrice}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-gray-700 mt-2">
                <span className="font-medium">Participants: </span>
                {currentRoom &&
                currentRoom.participants &&
                Array.isArray(currentRoom.participants)
                  ? currentRoom.participants.length
                  : null}
              </p>
            </div>
          </div>
        </details>

        {/* Add Bid History Section with User Aggregation and Refresh Button */}
        {isParticipant && (
          <details className="mt-3">
            <summary className="font-medium text-blue-600 cursor-pointer">
              View Bid History
            </summary>
            <div className="mt-3 bg-gray-100 rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Bid History</h3>
                <div className="flex items-center gap-2">
                  {lastRefreshTime && (
                    <span className="text-xs text-gray-500">
                      Last updated: {lastRefreshTime.toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault(); // Prevent details from closing
                      refreshBidHistory(true, true); // Force refresh from server
                    }}
                    disabled={loadingBids}
                    className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm flex items-center gap-1 disabled:opacity-50 transition-colors"
                  >
                    {loadingBids && isManualRefresh ? (
                      <>
                        <span className="inline-block h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                        <span>Refreshing...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        <span>Refresh Bids</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {loadingBids && !isManualRefresh ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
              ) : (
                <div>
                  {/* User aggregated bids section */}
                  {aggregatedBids.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">
                        Total Contributions by User
                      </h4>
                      {aggregatedBids.map((userBid) => (
                        <div
                          key={userBid.userId}
                          className="flex justify-between border-b border-gray-200 pb-2"
                        >
                          <div>
                            <span className="font-medium">
                              {userBid.userId === userId
                                ? "You"
                                : userBid.username}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({userBid.bidCount} bid
                              {userBid.bidCount !== 1 ? "s" : ""})
                            </span>
                          </div>
                          <div className="font-medium text-green-700">
                            ${userBid.totalAmount}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Individual bids section */}
                  {bidHistory.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">
                        All Bids (Highest to Lowest)
                      </h4>
                      <div className="space-y-2">
                        {bidHistory.map((bid) => (
                          <div
                            key={bid._id}
                            className="flex justify-between border-b border-gray-200 pb-2"
                          >
                            <div>
                              <span className="font-medium">
                                {bid.userId === userId ? "You" : bid.username}
                              </span>
                              <span className="text-gray-500 text-xs ml-2">
                                {new Date(bid.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="font-medium text-green-700">
                              ${bid.amount}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No bids placed yet.</p>
                  )}
                </div>
              )}
            </div>
          </details>
        )}

        {!isParticipant && !isClosed && (
          <button
            onClick={handleJoinRoom}
            disabled={isJoining || joinSuccess}
            className={`mt-4 px-4 py-2 rounded-md ${
              joinSuccess
                ? "bg-gray-300 cursor-not-allowed"
                : isJoining
                ? "bg-gray-400 cursor-wait"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {isJoining ? "Joining..." : joinSuccess ? "Joined" : "Join Room"}
          </button>
        )}
      </div>

      {/* Main content */}
      {isParticipant ? (
        <div className="flex flex-col flex-grow overflow-hidden">
          {/* Message thread - Scrollable Area */}
          <div className="flex-grow overflow-auto px-4">
            <MessageThread roomId={roomId || ""} userId={userId} />
          </div>

          {/* Fixed Footer with Controls */}
          <div className="flex-shrink-0">
            {/* Always show bid input form for live auctions when user is a participant */}
            {isLive && (
              <div className="p-4 border-t bg-gray-50">
                <div className="mb-2 font-medium text-gray-700 flex justify-between items-center">
                  <span>Place Your Bid:</span>
                  <span className="text-sm font-semibold text-green-600">
                    Min bid: ${getMinimumBidAmount()}
                  </span>
                </div>
                <form onSubmit={handlePlaceBid} className="flex gap-2">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        setBidAmount(value);
                      }
                    }}
                    className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      bidAmount < getMinimumBidAmount()
                        ? "border-red-300 bg-red-50 text-red-500"
                        : "border-gray-300"
                    }`}
                    min={getMinimumBidAmount()}
                    step="1"
                  />
                  <button
                    id="place-bid-button"
                    type="submit"
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={
                      isUserHighestBidder || bidAmount < getMinimumBidAmount()
                    }
                  >
                    <span>Place Bid</span>
                  </button>
                </form>
                {isUserHighestBidder && (
                  <p className="text-green-600 text-sm mt-2 font-semibold">
                    You are currently the highest bidder!
                  </p>
                )}
                {bidAmount < getMinimumBidAmount() && (
                  <p className="text-red-500 text-sm mt-2 font-semibold">
                    Your bid must be at least ${getMinimumBidAmount()}
                  </p>
                )}
              </div>
            )}

            {/* Chat input area - only show if not a closed auction */}
            {!isClosed && (
              <div className="border-t border-gray-200 p-3 bg-white">
                <MessageInput roomId={roomId || ""} />
              </div>
            )}

            {/* Show closed auction message */}
            {isClosed && (
              <div className="p-4 border-t bg-yellow-50">
                <div className="p-3 border border-yellow-100 rounded-lg">
                  <h3 className="font-medium text-yellow-800">
                    Auction Closed
                  </h3>
                  <p className="text-yellow-800 text-sm">
                    {isUserHighestBidder
                      ? "Congratulations! You won this auction."
                      : "This auction has ended."}
                  </p>

                  {/* Use the AuctionWinnerController for winner functionality */}
                  {isUserHighestBidder && (
                    <AuctionWinnerController
                      isActive={isClosed}
                      isUserWinner={isUserHighestBidder}
                      userId={userId}
                      roomId={roomId || ""}
                      roomName={currentRoom.name}
                      winningBid={
                        currentRoom.currentHighestBid?.amount ||
                        (bidHistory.length > 0 ? bidHistory[0].amount : 0)
                      }
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-medium mb-4">
              Join this auction room to participate
            </h2>
            <p className="text-gray-600 mb-6">
              You need to join this room to view messages and place bids.
            </p>
            <button
              onClick={handleJoinRoom}
              disabled={isJoining}
              className={`px-6 py-3 rounded-md ${
                isJoining
                  ? "bg-gray-400 cursor-wait"
                  : "bg-green-500 hover:bg-green-600 text-white"
              }`}
            >
              {isJoining ? "Joining..." : "Join Room"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomDetail;
