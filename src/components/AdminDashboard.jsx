import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, Save, Download, Settings } from 'lucide-react';
import api, { admin, dailyLimit } from '../services/api';
import { useNavigate } from 'react-router-dom';
import DailyLimitModal from './DailyLimitModal';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [maxUploads, setMaxUploads] = useState(null);
    const [currentUsage, setCurrentUsage] = useState(0);

    // Check authentication on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (!token || !user) {
            navigate('/login');
            return;
        }

        // Verify admin status
        try {
            const userData = JSON.parse(user);
            if (!userData.is_admin) {
                navigate('/dashboard'); // Redirect non-admins to user dashboard
            }
        } catch (e) {
            navigate('/login');
        }
    }, [navigate]);

    const fetchDailyLimit = async () => {
        try {
            const response = await dailyLimit.get();
            setMaxUploads(response.data.max_uploads);
            setCurrentUsage(response.data.current_uploads);
        } catch (error) {
            console.error("Failed to fetch daily limit", error);
        }
    };

    useEffect(() => {
        fetchDailyLimit();
    }, []);

    const handleDownload = async (filename) => {
        try {
            const response = await api.get(`/download/${filename}`, { responseType: 'blob' });

            // Extract filename from Content-Disposition header
            let downloadFilename = filename;
            const contentDisposition = response.headers['content-disposition'];
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
                if (filenameMatch && filenameMatch[1]) {
                    downloadFilename = filenameMatch[1];
                }
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', downloadFilename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed", error);
            alert("Failed to download file");
        }
    };
    const [orders, setOrders] = useState([]);
    // Local state to track edits: { [orderId]: { ai_score, sim_score, report1: File, report2: File } }
    const [edits, setEdits] = useState({});

    const fetchOrders = async () => {
        try {
            const response = await admin.list();
            setOrders(response.data);
        } catch (error) {
            console.error("Failed to fetch admin orders", error);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleEditChange = (id, field, value) => {
        setEdits(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleSave = async (order) => {
        const edit = edits[order.id];
        if (!edit) return;

        // Validation: Check if all expected fields are present (Inputs OR Existing Pre-filled)
        // Note: New files are in edit.report1/2. Existing files are not in edit state but expected to be done if saved.
        // ACTUALLY, strict requirement: Must upload NEW reports or confirm existing?
        // User asked: "when admin is upload the doc all the requierment must be filled the simelarity % and Ai % please the two pdfs"
        // This implies for a NEW completion, these must be provided.

        const aiScore = edit.ai_score !== undefined ? edit.ai_score : (order.ai_score || '');
        const simScore = edit.sim_score !== undefined ? edit.sim_score : (order.sim_score || '');

        if (!aiScore || !simScore) {
            alert("Please enter both AI Score and Similarity Score.");
            return;
        }

        if (!edit.report1 && !order.report1_path) {
            alert("Please upload the Similarity Report (PDF 1).");
            return;
        }
        if (!edit.report2 && !order.report2_path) {
            alert("Please upload the AI Report (PDF 2).");
            return;
        }


        const formData = new FormData();
        // Use ?? for nullish coalescing to allow 0 values

        formData.append('ai_score', aiScore);
        formData.append('sim_score', simScore);

        if (edit.report1) formData.append('report1', edit.report1);
        if (edit.report2) formData.append('report2', edit.report2);

        try {
            await admin.complete(order.id, formData);

            // Update local state to reflect success immediately (Optimistic-ish)
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Completed', ...edit } : o));

            // Clear edits for this item
            setEdits(prev => {
                const newEdits = { ...prev };
                delete newEdits[order.id];
                return newEdits;
            });

            // Ideally refetch to confirm
            fetchOrders();
        } catch (error) {
            console.error("Failed to complete order", error);
            alert("Failed to save order");
        }
    };

    return (
        <div className="dashboard-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="dashboard-title" style={{ margin: 0 }}>Available Orders</h2>
                <button
                    onClick={() => setShowLimitModal(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    <Settings size={20} />
                    Set Daily Limit
                </button>
            </div>

            <DailyLimitModal
                isOpen={showLimitModal}
                onClose={() => {
                    setShowLimitModal(false);
                    fetchDailyLimit(); // Refresh limit after closing modal
                }}
                currentLimit={maxUploads}
                currentUsage={currentUsage}
            />

            <div className="upload-card">
                <div className="table-responsive">
                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                                <th style={{ padding: '12px' }}>Doc No</th>
                                <th style={{ padding: '12px' }}>User Name</th>
                                <th style={{ padding: '12px' }}>Doc Name</th>
                                <th style={{ padding: '12px' }}>Status</th>
                                <th style={{ padding: '12px', minWidth: '180px' }}>Similarity Check</th>
                                <th style={{ padding: '12px', minWidth: '180px' }}>AI Detection</th>
                                <th style={{ padding: '12px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => {
                                const edit = edits[order.id] || {};
                                const isDraft = edit.ai_score || edit.sim_score || edit.report1 || edit.report2;

                                return (
                                    <tr key={order.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                        <td style={{ padding: '12px' }}>#{order.id}</td>
                                        <td style={{ padding: '12px' }}>
                                            {order.user?.first_name && order.user?.last_name
                                                ? `${order.user.first_name} ${order.user.last_name}`
                                                : order.user?.email || `User ${order.user_id}`}
                                        </td>
                                        <td style={{ padding: '12px', wordBreak: 'break-all' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>{order.original_filename}</span>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ padding: '4px', border: 'none', background: 'transparent' }}
                                                    onClick={() => handleDownload(order.original_filename)}
                                                    title="Download Document"
                                                >
                                                    <Download size={16} color="#0d9488" />
                                                </button>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td style={{ padding: '12px' }}>
                                            <span className={`status-badge status-${order.status?.toLowerCase()}`}>
                                                {order.status === 'Pending' ? 'Waiting Processing' : order.status}
                                            </span>
                                        </td>

                                        {/* Similarity Check: Upload + Input */}
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <label className="btn btn-outline" style={{ padding: '4px', cursor: 'pointer' }} title="Upload Report">
                                                    <Upload size={14} />
                                                    <input
                                                        type="file"
                                                        style={{ display: 'none' }}
                                                        accept=".pdf"
                                                        onChange={(e) => handleEditChange(order.id, 'report1', e.target.files[0])}
                                                    />
                                                </label>
                                                {edit.report1 && <CheckCircle size={14} color="green" />}
                                                <input
                                                    type="number"
                                                    placeholder="%"
                                                    className="form-control"
                                                    style={{ width: '60px', padding: '4px', height: '30px' }}
                                                    value={edit.sim_score !== undefined ? edit.sim_score : order.sim_score}
                                                    onChange={(e) => handleEditChange(order.id, 'sim_score', e.target.value)}
                                                />
                                            </div>
                                        </td>

                                        {/* AI Detection: Upload + Input */}
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <label className="btn btn-outline" style={{ padding: '4px', cursor: 'pointer' }} title="Upload Report">
                                                    <Upload size={14} />
                                                    <input
                                                        type="file"
                                                        style={{ display: 'none' }}
                                                        accept=".pdf"
                                                        onChange={(e) => handleEditChange(order.id, 'report2', e.target.files[0])}
                                                    />
                                                </label>
                                                {edit.report2 && <CheckCircle size={14} color="green" />}
                                                <input
                                                    type="number"
                                                    placeholder="%"
                                                    className="form-control"
                                                    style={{ width: '60px', padding: '4px', height: '30px' }}
                                                    value={edit.ai_score !== undefined ? edit.ai_score : order.ai_score}
                                                    onChange={(e) => handleEditChange(order.id, 'ai_score', e.target.value)}
                                                />
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td style={{ padding: '12px' }}>
                                            {isDraft ? (
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '5px 10px', fontSize: '0.8rem', display: 'flex', gap: '5px' }}
                                                    onClick={() => handleSave(order)}
                                                >
                                                    <Save size={14} />
                                                    Save
                                                </button>
                                            ) : (
                                                <span style={{ color: '#ccc' }}>-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
