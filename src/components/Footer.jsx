import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container footer-content">
                <div className="footer-column">
                    <h5 className="footer-heading">Product</h5>
                    <ul className="footer-links">
                        <li><Link to="/">Features</Link></li>
                        <li><Link to="/pricing">Plans & Pricing</Link></li>
                        <li><Link to="/login">Login</Link></li>
                    </ul>
                </div>
                <div className="footer-column">
                    <h5 className="footer-heading">Support</h5>
                    <ul className="footer-links">
                        <li><Link to="/help">Help Center</Link></li>
                        <li><a href="mailto:hello@checkmate.io">Contact Us</a></li>
                        <li><Link to="/terms">Terms of Service</Link></li>
                        <li><Link to="/privacy">Privacy Policy</Link></li>
                    </ul>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
