import { useState } from 'react';
import Register from './register/register';
import Login from './login/login';
import Categories from "./categories/categories"
import LiveAuctions from "./live-auctions/live-auctions"

function Navbar() {
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    const handleSwitchToLogin = () => {
        setShowLoginModal(true);
    };

    const handleSwitchToRegister = () => {
        setShowRegisterModal(true);
    };

    return (
        <div className="relative flex items-center w-full">
            <div className="absolute left-[478px]">
                <button 
                    onClick={() => setShowRegisterModal(true)}
                    className="text-[#212832] hover:text-[#DF6951] transition-colors"
                >
                    register
                </button>
            </div>
            <div className="absolute left-[600px]">
                <button 
                    onClick={() => setShowLoginModal(true)}
                    className="text-[#212832] hover:text-[#DF6951] transition-colors"
                >
                    Login
                </button>
            </div>
            <div className="absolute left-[700px]">
            <LiveAuctions />

            </div>
            <div className="absolute left-[900px]">
            <Categories />

            </div>
            
            <Register 
                isOpen={showRegisterModal} 
                onClose={() => setShowRegisterModal(false)}
                onSwitchToLogin={handleSwitchToLogin}
            />
            <Login 
                isOpen={showLoginModal} 
                onClose={() => setShowLoginModal(false)}
                onSwitchToRegister={handleSwitchToRegister}
            />
        </div>
    );
}

export default Navbar;