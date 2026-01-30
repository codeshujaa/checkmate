import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    CreditCard,
    User,
    Users,
    LogOut,
    CheckSquare,
    Menu,
    Package,
    X,
    FileText
} from 'lucide-react';
import { admin } from '../services/api';
import NotificationToggle from './NotificationSetup';

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
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Check if current user is admin
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.is_admin) {
                    setIsAdmin(true);
                }
            } catch (e) { }
        }
    }, []);

    const handleSignOut = (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="dashboard-layout">
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
            )}

            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <CheckSquare size={28} className="logo-icon" />
                    <span className="logo-text">Checkmate</span>
                    <button className="mobile-close-btn" onClick={() => setIsSidebarOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'none' }}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Dashboard"
                        to={isAdmin ? "/dashboard/admin" : "/dashboard"}
                        active={location.pathname === (isAdmin ? '/dashboard/admin' : '/dashboard')}
                        onClick={() => setIsSidebarOpen(false)}
                    />

                    {isAdmin && (
                        <>
                            {/* ADDED ORDERS LINK */}
                            <SidebarItem
                                icon={FileText}
                                label="Orders"
                                to="/dashboard/admin/orders"
                                active={location.pathname === '/dashboard/admin/orders'}
                                onClick={() => setIsSidebarOpen(false)}
                            />
                            <SidebarItem
                                icon={Users}
                                label="Users"
                                to="/dashboard/admin/users"
                                active={location.pathname === '/dashboard/admin/users'}
                                onClick={() => setIsSidebarOpen(false)}
                            />
                            <SidebarItem
                                icon={Package}
                                label="Packages"
                                to="/dashboard/admin/packages"
                                active={location.pathname === '/dashboard/admin/packages'}
                                onClick={() => setIsSidebarOpen(false)}
                            />
                        </>
                    )}

                    {!isAdmin && (
                        <>
                            <SidebarItem icon={CreditCard} label="Plans" to="/pricing" active={location.pathname === '/pricing'} onClick={() => setIsSidebarOpen(false)} />
                            <SidebarItem icon={User} label="Account" to="/dashboard/account" active={location.pathname === '/dashboard/account'} onClick={() => setIsSidebarOpen(false)} />
                            <SidebarItem icon={Users} label="Affiliate" to="/dashboard/affiliate" active={location.pathname === '/dashboard/affiliate'} onClick={() => setIsSidebarOpen(false)} />
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    {isAdmin && (
                        <NotificationToggle />
                    )}
                    <button onClick={handleSignOut} className="sidebar-item sign-out-btn">
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <main className="dashboard-content">
                <div className="mobile-header">
                    <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                        <Menu size={24} />
                    </button>
                    <span className="mobile-logo-text">Checkmate</span>
                </div>
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;
