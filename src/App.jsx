import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import Pricing from './components/Pricing';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import HelpCenter from './components/HelpCenter';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import AdminOrders from './components/AdminOrders';
import AdminUsers from './components/AdminUsers';
import AdminPackages from './components/AdminPackages';
import Account from './components/Account';
import Affiliate from './components/Affiliate';

function App() {
    return (
        <Router>
            <div className="app">
                <Routes>
                    {/* Public Routes with Header/Footer */}
                    <Route path="/" element={
                        <>
                            <Header />
                            <main><Home /></main>
                            <Footer />
                        </>
                    } />
                    <Route path="/pricing" element={
                        <>
                            <Header />
                            <main><Pricing /></main>
                            <Footer />
                        </>
                    } />
                    <Route path="/login" element={
                        <>
                            <Header />
                            <main><Login /></main>
                            <Footer />
                        </>
                    } />
                    <Route path="/register" element={
                        <>
                            <Header />
                            <main><Register /></main>
                            <Footer />
                        </>
                    } />
                    <Route path="/forgot-password" element={
                        <>
                            <Header />
                            <main><ForgotPassword /></main>
                            <Footer />
                        </>
                    } />
                    <Route path="/reset-password" element={
                        <>
                            <Header />
                            <main><ResetPassword /></main>
                            <Footer />
                        </>
                    } />
                    <Route path="/terms" element={
                        <>
                            <Header />
                            <main><TermsOfService /></main>
                            <Footer />
                        </>
                    } />
                    <Route path="/privacy" element={
                        <>
                            <Header />
                            <main><PrivacyPolicy /></main>
                            <Footer />
                        </>
                    } />
                    <Route path="/help" element={
                        <>
                            <Header />
                            <main><HelpCenter /></main>
                            <Footer />
                        </>
                    } />

                    {/* Dashboard Routes (No Header/Footer, uses DashboardLayout) */}
                    <Route path="/dashboard" element={<DashboardLayout />}>

                        <Route index element={<Dashboard />} />

                        <Route path="admin" element={<AdminDashboard />} />
                        <Route path="admin/orders" element={<AdminOrders />} />
                        <Route path="admin/users" element={<AdminUsers />} />
                        <Route path="admin/packages" element={<AdminPackages />} />
                        <Route path="account" element={<Account />} />
                        <Route path="affiliate" element={<Affiliate />} />
                    </Route>

                </Routes>
            </div>
        </Router>
    );
}

export default App;
