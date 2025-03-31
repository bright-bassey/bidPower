
const SidebarHeader = () => {
    return (
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#10B981]">
                    {/* Icon placeholder */}
                </div>
                <h1 className="text-lg font-semibold text-gray-900">Bidding Rooms</h1>
            </div>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <span className="text-2xl text-gray-600">+</span>
            </button>
        </div>
    );
};

export default SidebarHeader;