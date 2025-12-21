import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate
import {
    LayoutDashboard,
    CreditCard,
    User,
    Users,
    LogOut,
    CheckSquare,
    Menu,
    X
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
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false); // Sidebar state

    const handleSignOut = (e) => {
        e.preventDefault();
        navigate('/login');
    };

    return (
        <div className="dashboard-layout">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <CheckSquare size={28} className="logo-icon" />
                    <span className="logo-text">Checkmate Essays</span>

                    {/* Close Button (Mobile Only) */}
                    <button
                        className="mobile-close-btn"
                        onClick={() => setIsSidebarOpen(false)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'none' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {/* Common / Conditional Dashboard Link */}
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Dashboard"
                        to={location.pathname.includes('/admin') || JSON.parse(localStorage.getItem('user') || '{}').is_admin ? "/dashboard/admin" : "/dashboard"}
                        active={location.pathname.includes('/dashboard')}
                        onClick={() => setIsSidebarOpen(false)}
                    />

                    {/* Admin Specific Links */}
                    {JSON.parse(localStorage.getItem('user') || '{}').is_admin && (
                        <SidebarItem
                            icon={Users}
                            label="Users"
                            to="/dashboard/admin/users"
                            active={location.pathname === '/dashboard/admin/users'}
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}

                    {/* User Specific Links (Hidden for Admin) */}
                    {!JSON.parse(localStorage.getItem('user') || '{}').is_admin && (
                        <>
                            <SidebarItem
                                icon={CreditCard}
                                label="Plans"
                                to="/pricing"
                                active={location.pathname === '/pricing'}
                                onClick={() => setIsSidebarOpen(false)}
                            />
                            <SidebarItem
                                icon={User}
                                label="Account"
                                to="/dashboard/account"
                                active={location.pathname === '/dashboard/account'}
                                onClick={() => setIsSidebarOpen(false)}
                            />
                            <SidebarItem
                                icon={Users}
                                label="Affiliate"
                                to="/dashboard/affiliate"
                                active={location.pathname === '/dashboard/affiliate'}
                                onClick={() => setIsSidebarOpen(false)}
                            />
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <button onClick={handleSignOut} className="sidebar-item sign-out-btn">
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <main className="dashboard-content">
                {/* Mobile Header with Menu Button */}
                <div className="mobile-header">
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu size={24} />
                    </button>
                    <span className="mobile-logo-text">Checkmate Essays</span>
                </div>

                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;
