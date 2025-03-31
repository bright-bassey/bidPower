import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./ui/layouts/main-layout";
import RoomDetail from "./ui/components/chat/room-detail";
import WelcomePage from "./ui/components/chat/welcome-page";
import { InvoiceProvider } from "./context/invoice-context";

const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <InvoiceProvider>
            <MainLayout />
          </InvoiceProvider>
        }
      >
        <Route index element={<WelcomePage />} />
        <Route path="room/:roomId" element={<RoomDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
