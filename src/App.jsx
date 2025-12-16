import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';

// Lazy load page components
const Home = lazy(() => import('./components/Home'));
const Pricing = lazy(() => import('./components/Pricing'));
const Login = lazy(() => import('./components/Login'));
const Register = lazy(() => import('./components/Register'));
const ForgotPassword = lazy(() => import('./components/ForgotPassword'));
const TermsOfService = lazy(() => import('./components/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const HelpCenter = lazy(() => import('./components/HelpCenter'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

// Simple Loading Component
const LoadingFallback = () => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
    }}>
        Loading...
    </div>
);

function App() {
    return (
        <Router>
            <div className="app">
                <Suspense fallback={<LoadingFallback />}>
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
                            {/* Add other dashboard sub-routes here if needed */}
                        </Route>

                    </Routes>
                </Suspense>
            </div>
        </Router>
    );
}

export default App;
