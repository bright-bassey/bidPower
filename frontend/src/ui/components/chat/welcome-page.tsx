import { useRooms } from "../../../context/room-context";

const WelcomePage = () => {
  const { rooms } = useRooms();

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <h1 className="text-3xl font-bold mb-3">Welcome to BidPower</h1>
      <p className="text-gray-600 mb-6 max-w-md">
        Your platform for real-time auction bidding. Join a room to start
        bidding or create your own auction.
      </p>

      <div className="flex flex-col items-center gap-4 w-full max-w-md">
        {rooms.filter((room) => room.status === "live").length > 0 ? (
          <div className="bg-green-100 p-4 rounded-lg w-full">
            <h2 className="text-lg font-medium text-green-800 mb-2">
              Live Auctions Available!
            </h2>
            <p className="text-green-700 text-sm">
              There are currently{" "}
              {rooms.filter((room) => room.status === "live").length} live
              auctions. Check them out in the sidebar.
            </p>
          </div>
        ) : (
          <div className="bg-blue-100 p-4 rounded-lg w-full">
            <h2 className="text-lg font-medium text-blue-800 mb-2">
              No Live Auctions
            </h2>
            <p className="text-blue-700 text-sm">
              There are no live auctions at the moment.
              {rooms.filter((room) => room.status === "upcoming").length > 0
                ? ` Check out the upcoming auctions in the sidebar.`
                : ` Why not create one?`}
            </p>
          </div>
        )}

        <div className="bg-gray-100 p-4 rounded-lg w-full">
          <h2 className="text-lg font-medium mb-2">Quick Stats</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Total Auctions</p>
              <p className="text-2xl font-bold">{rooms.length}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Live Now</p>
              <p className="text-2xl font-bold">
                {rooms.filter((room) => room.status === "live").length}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Upcoming</p>
              <p className="text-2xl font-bold">
                {rooms.filter((room) => room.status === "upcoming").length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
