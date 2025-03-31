import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./app-routes";
import { SocketProvider } from "./context/socket-context";
import { MessagesProvider } from "./context/message-context";
import { NotificationProvider } from "./context/notification-context";
import NotificationCenter from "./ui/components/notification/NotificationCenter";
import "./index.css";

function App() {
  return (
    <SocketProvider>
      <NotificationProvider>
        <MessagesProvider>
          <Router>
            <NotificationCenter />
            <AppRoutes />
          </Router>
        </MessagesProvider>
      </NotificationProvider>
    </SocketProvider>
  );
}

export default App;
