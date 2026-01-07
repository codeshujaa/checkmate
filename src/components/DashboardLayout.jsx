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
    FileText,
    Bell,
    BellOff
} from 'lucide-react';
import { admin } from '../services/api';

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

    // --- NOTIFICATION STATE (Global) ---
    const [soundEnabled, setSoundEnabled] = useState(() => {
        return localStorage.getItem('adminSoundEnabled') !== 'false';
    });

    // Audio ref
    const audioRef = useRef(null);
    // Tracking refs
    const prevOrderCountRef = useRef(0);
    const prevTransactionCountRef = useRef(0);
    const knownOrderIdsRef = useRef(new Set());
    const knownTransactionIdsRef = useRef(new Map()); // Changed from Set to Map
    const isFirstRun = useRef(true);

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

    // Initialize Audio
    useEffect(() => {
        audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audioRef.current.volume = 0.5;
    }, []);

    // Global Polling for Admins
    useEffect(() => {
        if (!isAdmin) return;

        const checkNotifications = async () => {
            try {
                const [ordersRes, transRes] = await Promise.all([
                    admin.list(),
                    admin.transactions()
                ]);

                const currentOrders = ordersRes.data || [];
                const currentTransactions = transRes.data || [];

                let newOrdersFound = false;
                let newPaymentFound = false;
                let paymentDetails = "";

                // 1. Check Orders
                currentOrders.forEach(o => {
                    if (!knownOrderIdsRef.current.has(o.id) && o.status === 'Pending') {
                        if (!isFirstRun.current) newOrdersFound = true;
                    }
                    knownOrderIdsRef.current.add(o.id);
                });

                // 2. Check Transactions
                currentTransactions.forEach(t => {
                    const knownStatus = knownTransactionIdsRef.current.get(t.id);

                    // Case A: New Transaction found that is already completed
                    if (!knownStatus && t.status === 'completed') {
                        if (!isFirstRun.current) {
                            newPaymentFound = true;
                            paymentDetails = `${t.amount} from ${t.user?.first_name || 'User'}`;
                        }
                    }

                    // Case B: Existing Transaction changed status (e.g. pending -> completed)
                    if (knownStatus && knownStatus !== 'completed' && t.status === 'completed') {
                        newPaymentFound = true;
                        paymentDetails = `${t.amount} from ${t.user?.first_name || 'User'}`;
                    }

                    // Update known map
                    knownTransactionIdsRef.current.set(t.id, t.status);
                });

                // Trigger Alert (Skip on first load to prevent noise)
                if ((newOrdersFound || newPaymentFound) && soundEnabled && !isFirstRun.current) {
                    if (audioRef.current) {
                        audioRef.current.play().catch(e => console.error("Sound blocked:", e));
                    }
                    // Optional: Native Notification
                    if (Notification.permission === "granted") {
                        if (newPaymentFound) new Notification("New Payment!", { body: paymentDetails });
                        if (newOrdersFound) new Notification("New Upload!", { body: "New document waiting for review." });
                    }
                }

                prevOrderCountRef.current = currentOrders.length;
                prevTransactionCountRef.current = currentTransactions.length;
                isFirstRun.current = false;

            } catch (error) {
                // Silently fail polling
            }
        };

        // Request permission
        if (Notification.permission !== "granted") Notification.requestPermission();

        checkNotifications(); // Immediate check
        const interval = setInterval(checkNotifications, 5000);
        return () => clearInterval(interval);
    }, [isAdmin, soundEnabled]);


    const toggleSound = () => {
        const newState = !soundEnabled;
        setSoundEnabled(newState);
        localStorage.setItem('adminSoundEnabled', newState);
        if (!soundEnabled && audioRef.current) audioRef.current.play().catch(() => { });
    };

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
                        <button onClick={toggleSound} className="sidebar-item" style={{ marginBottom: '10px' }}>
                            {soundEnabled ? <Bell size={20} color="#10b981" /> : <BellOff size={20} color="#94a3b8" />}
                            <span>{soundEnabled ? "Sound On" : "Sound Off"}</span>
                        </button>
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
