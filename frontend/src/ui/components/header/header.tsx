import Logo from "./logo/logo";
import Navbar from "./navbar/navbar";

function Header() {
    return (
        <header className="absolute left-[140.92px] top-[20.7px] w-[1160.58px] h-[40px] z-10">
            <div className="flex justify-between items-center w-full h-full">
                <Logo />
                <Navbar />
            </div>
        </header>
    )
}

export default Header