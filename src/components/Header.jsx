import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <header className="header">
            <div className="container header-container">
                <Link to="/" className="logo">CheckMate</Link>
                <nav className="nav">
                    <a href="/#features" className="nav-link">Features</a>
                    <a href="/#how-it-works" className="nav-link">How it Works</a>
                    <Link to="/pricing" className="nav-link">Plans</Link>
                    <Link to="/login" className="nav-link btn-login">Login</Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;
