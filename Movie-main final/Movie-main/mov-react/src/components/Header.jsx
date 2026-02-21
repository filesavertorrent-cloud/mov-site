import { Link } from 'react-router-dom';

function Header() {
    return (
        <header className="header fade-in-up">
            <div className="header__center">
                <div className="header__logo">MovieVault</div>
                <div className="header__tagline">Your Premium Movie Collection</div>
            </div>
            <div className="header__nav">
                <Link to="/admin" className="header__admin-btn">⚙️ Admin</Link>
            </div>
        </header>
    );
}

export default Header;
