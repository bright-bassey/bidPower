import { useState } from 'react';
import heroImage from "../../../assets/images/hero-image.png"
import Register from '../header/navbar/register/register';
import Login from '../header/navbar/login/login';
import pinkBackgroundTheme from "../../../assets/images/Decore.png"

function Hero() {
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    const handleSwitchToLogin = () => {
        setShowLoginModal(true);
    };

    const handleSwitchToRegister = () => {
        setShowRegisterModal(true);
    };

    return (
        <div className="fixed inset-0 w-full min-h-screen overflow-hidden">
            {/* Background Theme Image */}
            <div className="absolute top-0 right-0 w-[55%] h-full">
                <img 
                    src={pinkBackgroundTheme} 
                    alt="Background decoration" 
                    className="h-full w-full object-cover translate-x-[150px] translate-y-[0px]"
                />
            </div>
            
            {/* Hero Image */}
            <div className="absolute top-[70px] right-[10%] z-10">
                <img 
                    src={heroImage} 
                    alt="Woman with luggage" 
                    className="w-auto h-[600px] object-contain"
                />
            </div>
            
            {/* Content container */}
            <div className="relative z-10 ml-[140.92px] mt-[120px] max-w-[45%]">
                <p className="text-[#DF6951] font-medium mb-4">
                    BEST DEALS AROUND THE WORLD
                </p>
                
                <h1 className="text-[#181E4B] text-5xl font-bold leading-tight mb-8">
                    Bid Smart.
                    <br />
                    Win Big.
                    <br />
                    Experience the Thrill
                    <br />
                    of Live Auctions!
                </h1>
                
                <p className="text-[#5E6282] text-base mb-8 max-w-[477px]">
                    Discover an exciting way to shop! Bid on unique items, outbid competitors in real-time, 
                    and take home incredible deals. Join thousands of buyers competing for exclusive treasures.
                </p>
                
                <div className="flex items-center gap-8">
                    <button 
                        className="bg-[#F1A501] text-white px-6 py-3 rounded-lg hover:bg-[#e09600] transition-colors"
                        onClick={() => setShowRegisterModal(true)}
                    >
                        Bid Now!
                    </button>
                    <button className="flex items-center gap-4">
                        <div className="bg-[#DF6951] p-4 rounded-full">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M12 6L0 0v12l12-6z" fill="white"/>
                            </svg>
                        </div>
                        <span className="text-[#686D77]">Play Demo</span>
                    </button>
                </div>
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
    )
}

export default Hero