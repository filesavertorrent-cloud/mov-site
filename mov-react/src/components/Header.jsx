import { Link } from 'react-router-dom';

function Header({ onRequestClick }) {
    return (
        <header className="header fade-in-up">
            <div className="header__center">
                <div className="header__logo">MovieVault</div>
                <div className="header__tagline">Your Premium Movie Collection</div>
            </div>
            <div className="header__nav">
                <button onClick={onRequestClick} className="header__nav-btn">Request Movie</button>
                <Link to="/admin" className="header__admin-btn">⚙️ Admin</Link>
            </div>
        </header>
    );
}

export default Header;
