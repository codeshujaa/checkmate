import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle } from 'lucide-react';
import { admin } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [verifying, setVerifying] = useState({}); // Track verify loading state

    // Check authentication on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (!token || !user) {
            navigate('/login');
            return;
        }

        try {
            const userData = JSON.parse(user);
            if (!userData.is_admin) {
                navigate('/dashboard');
            }
        } catch (e) {
            navigate('/login');
        }
    }, [navigate]);

    const fetchData = async () => {
        try {
            // Fetch Transactions only (Notification login is now in Layout)
            const transRes = await admin.transactions();
            setTransactions(transRes.data);
        } catch (error) {
            console.error("Failed to fetch admin data", error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Keep polling for table updates
        return () => clearInterval(interval);
    }, []);

    const handleVerify = async (reference) => {
        setVerifying(prev => ({ ...prev, [reference]: true }));
        try {
            const res = await admin.verifyTransaction(reference);
            if (res.data.status === 'completed') {
                alert("Payment Verified Successfully!");
                fetchData(); // Refresh list
            } else {
                alert(`Verification result: ${res.data.status} - ${res.data.message || ''}`);
            }
        } catch (error) {
            console.error("Verification failed", error);
            alert("Verification request failed. Check console.");
        } finally {
            setVerifying(prev => ({ ...prev, [reference]: false }));
        }
    };

    return (
        <div className="dashboard-container">
            {/* Header Area */}
            <div style={{ marginBottom: '20px' }}>
                <h2 className="dashboard-title" style={{ margin: 0 }}>Admin Dashboard</h2>
            </div>

            {/* Recent Transactions Section */}
            <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <DollarSign size={20} color="#059669" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>Recent Payments</h3>
                </div>
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                        <table className="table" style={{ width: '100%' }}>
                            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                <tr>
                                    <th style={{ padding: '10px 16px', fontSize: '0.75rem', textAlign: 'left' }}>Time</th>
                                    <th style={{ padding: '10px 16px', fontSize: '0.75rem', textAlign: 'left' }}>User</th>
                                    <th style={{ padding: '10px 16px', fontSize: '0.75rem', textAlign: 'left' }}>Phone</th>
                                    <th style={{ padding: '10px 16px', fontSize: '0.75rem', textAlign: 'left' }}>Amount</th>
                                    <th style={{ padding: '10px 16px', fontSize: '0.75rem', textAlign: 'left' }}>Status</th>
                                    <th style={{ padding: '10px 16px', fontSize: '0.75rem', textAlign: 'left' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr><td colSpan="6" style={{ padding: '15px', textAlign: 'center', color: '#94a3b8' }}>No recent transactions</td></tr>
                                ) : (
                                    transactions.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px 16px', fontSize: '0.85rem' }}>{new Date(t.created_at).toLocaleTimeString()}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
                                                {t.user?.first_name ? `${t.user.first_name} ${t.user.last_name}` : t.user?.email}
                                            </td>
                                            <td style={{ padding: '10px 16px', fontSize: '0.85rem' }}>{t.phone_number}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: 600 }}>{t.amount}</td>
                                            <td style={{ padding: '10px 16px' }}>
                                                <span className={`status-badge status-${t.status}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 16px' }}>
                                                {t.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleVerify(t.payment_reference)}
                                                        disabled={verifying[t.payment_reference]}
                                                        className="btn btn-outline"
                                                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', gap: '4px', alignItems: 'center' }}
                                                    >
                                                        {verifying[t.payment_reference] ? '...' : <CheckCircle size={12} />}
                                                        Verify
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
