import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate
import {
    LayoutDashboard,
    CreditCard,
    User,
    Users,
    LogOut,
    CheckSquare
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, to, active, onClick }) => (
    <Link
        to={to}
        onClick={onClick}
        className={`sidebar-item ${active ? 'active' : ''}`}
    >
        <Icon size={20} />
        <span>{label}</span>
    </Link>
);

const DashboardLayout = () => {
    const location = useLocation();
    const navigate = useNavigate(); // Hook for navigation

    const handleSignOut = (e) => {
        e.preventDefault();
        // Clear tokens or state here if needed in the future
        navigate('/login');
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <CheckSquare size={28} className="logo-icon" />
                    <span className="logo-text">CheckMate</span>
                </div>

                <nav className="sidebar-nav">
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Dashboard"
                        to="/dashboard"
                        active={location.pathname === '/dashboard'}
                    />
                    <SidebarItem
                        icon={CreditCard}
                        label="Plans"
                        to="/pricing"
                        active={location.pathname === '/pricing'}
                    />
                    <SidebarItem
                        icon={User}
                        label="Account"
                        to="/account"
                        active={location.pathname === '/account'}
                    />
                    <SidebarItem
                        icon={Users}
                        label="Affiliate"
                        to="/affiliate"
                        active={location.pathname === '/affiliate'}
                    />
                </nav>

                <div className="sidebar-footer">
                    <button onClick={handleSignOut} className="sidebar-item sign-out-btn">
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <main className="dashboard-content">
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;
