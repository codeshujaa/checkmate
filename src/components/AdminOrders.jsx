import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, Save, Download, FileText, Play } from 'lucide-react';
import api, { admin } from '../services/api';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
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
        // Poll for updates in the table view as well
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleDownload = async (filename) => {
        try {
            const response = await api.get(`/download/${filename}`, { responseType: 'blob' });
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

        const aiScore = edit.ai_score !== undefined ? edit.ai_score : (order.ai_score || '');
        const simScore = edit.sim_score !== undefined ? edit.sim_score : (order.sim_score || '');

        if (!aiScore || !simScore) {
            alert("Please enter both AI Score and Similarity Score.");
            return;
        }

        const formData = new FormData();
        formData.append('ai_score', aiScore);
        formData.append('sim_score', simScore);
        if (edit.report1) formData.append('report1', edit.report1);
        if (edit.report2) formData.append('report2', edit.report2);

        try {
            await admin.complete(order.id, formData);
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Completed', ...edit } : o));
            setEdits(prev => {
                const newEdits = { ...prev };
                delete newEdits[order.id];
                return newEdits;
            });
            fetchOrders(); // Refresh to be sure
        } catch (error) {
            console.error("Failed to complete order", error);
            alert("Failed to save order");
        }
    };

    const handleStartProcessing = async (orderId) => {
        try {
            await admin.startProcessing(orderId);
            fetchOrders(); // Refresh to show updated status
        } catch (error) {
            console.error("Failed to start processing", error);
            alert("Failed to start processing");
        }
    };

    return (
        <div className="dashboard-container">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
                <FileText size={24} color="#059669" />
                <h2 className="dashboard-title" style={{ margin: 0 }}>Document Orders</h2>
            </div>

            {/* Desktop Table View */}
            <div className="card admin-orders-table" style={{ overflow: 'hidden', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                <div className="table-responsive">
                    <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Doc No</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>User Name</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Doc Name</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Status</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', minWidth: '180px' }}>Similarity Check</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', minWidth: '180px' }}>AI Detection</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No orders found</td>
                                </tr>
                            ) : (
                                orders.map((order, index) => {
                                    const edit = edits[order.id] || {};
                                    const isDraft = edit.ai_score || edit.sim_score || edit.report1 || edit.report2;

                                    return (
                                        <tr key={order.id} style={{ borderBottom: index !== orders.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                            <td style={{ padding: '20px 24px', verticalAlign: 'middle', color: '#64748b' }}>{order.id}</td>
                                            <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontWeight: '600', color: '#0f172a' }}>
                                                    {order.user?.first_name && order.user?.last_name
                                                        ? `${order.user.first_name} ${order.user.last_name}`
                                                        : order.user?.email || `User ${order.user_id}`}
                                                </div>
                                                {(order.user?.first_name && order.user?.last_name) && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{order.user.email}</div>}
                                            </td>
                                            <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '200px' }}>
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155' }} title={order.original_filename}>{order.original_filename}</span>
                                                    <button
                                                        className="btn-icon"
                                                        style={{ padding: '4px', border: 'none', background: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                                                        onClick={() => handleDownload(order.original_filename)}
                                                        title="Download Document"
                                                    >
                                                        <Download size={14} color="#0d9488" />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                                                <span className={`status-badge status-${order.status?.toLowerCase()}`} style={{ fontWeight: 500, padding: '4px 10px', borderRadius: '20px' }}>
                                                    {order.status === 'Pending' ? 'Waiting Processing' : order.status}
                                                </span>
                                            </td>

                                            {/* Similarity Check */}
                                            <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <label className="btn btn-outline" style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: '6px' }} title="Upload Report">
                                                        <Upload size={14} />
                                                        <input
                                                            type="file"
                                                            style={{ display: 'none' }}
                                                            accept=".pdf"
                                                            onChange={(e) => handleEditChange(order.id, 'report1', e.target.files[0])}
                                                        />
                                                    </label>
                                                    {edit.report1 && <CheckCircle size={16} color="#16a34a" />}
                                                    <input
                                                        type="number"
                                                        placeholder="%"
                                                        className="form-control"
                                                        style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                        value={edit.sim_score !== undefined ? edit.sim_score : order.sim_score}
                                                        onChange={(e) => handleEditChange(order.id, 'sim_score', e.target.value)}
                                                    />
                                                </div>
                                            </td>

                                            {/* AI Detection */}
                                            <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <label className="btn btn-outline" style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: '6px' }} title="Upload Report">
                                                        <Upload size={14} />
                                                        <input
                                                            type="file"
                                                            style={{ display: 'none' }}
                                                            accept=".pdf"
                                                            onChange={(e) => handleEditChange(order.id, 'report2', e.target.files[0])}
                                                        />
                                                    </label>
                                                    {edit.report2 && <CheckCircle size={16} color="#16a34a" />}
                                                    <input
                                                        type="number"
                                                        placeholder="%"
                                                        className="form-control"
                                                        style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                        value={edit.ai_score !== undefined ? edit.ai_score : order.ai_score}
                                                        onChange={(e) => handleEditChange(order.id, 'ai_score', e.target.value)}
                                                    />
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '20px 24px', verticalAlign: 'middle', textAlign: 'right' }}>
                                                {order.status === 'Pending' ? (
                                                    <button
                                                        className="btn"
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: '0.85rem',
                                                            display: 'inline-flex',
                                                            gap: '6px',
                                                            alignItems: 'center',
                                                            borderRadius: '6px',
                                                            backgroundColor: '#dbeafe',
                                                            color: '#2563eb',
                                                            border: '1px solid #93c5fd'
                                                        }}
                                                        onClick={() => handleStartProcessing(order.id)}
                                                    >
                                                        <Play size={14} />
                                                        Start Processing
                                                    </button>
                                                ) : isDraft ? (
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'inline-flex', gap: '6px', alignItems: 'center', borderRadius: '6px' }}
                                                        onClick={() => handleSave(order)}
                                                    >
                                                        <Save size={14} />
                                                        Save
                                                    </button>
                                                ) : order.status === 'Completed' ? (
                                                    <span style={{ color: '#10b981', fontWeight: '500' }}>Done</span>
                                                ) : (
                                                    <span style={{ color: '#cbd5e1' }}>-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-order-cards">
                {orders.length === 0 ? (
                    <div className="card" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No orders found</div>
                ) : (
                    orders.map((order) => {
                        const edit = edits[order.id] || {};
                        const isDraft = edit.ai_score || edit.sim_score || edit.report1 || edit.report2;
                        const userName = order.user?.first_name && order.user?.last_name
                            ? `${order.user.first_name} ${order.user.last_name}`
                            : order.user?.email || `User ${order.user_id}`;

                        return (
                            <div key={order.id} className="order-card">
                                <div className="order-card-header">
                                    <div className="order-card-info">
                                        <h3>#{order.id} - {userName}</h3>
                                        <div className="filename">{order.original_filename}</div>
                                    </div>
                                    <div className="order-card-status">
                                        <span className={`status-badge status-${order.status?.toLowerCase()}`} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                                            {order.status === 'Pending' ? 'Waiting' : order.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Completed orders show scores */}
                                {order.status === 'Completed' && (
                                    <>
                                        <div className="order-card-scores">
                                            <span>Similarity: {order.sim_score}%</span>
                                            <span>AI: {order.ai_score}%</span>
                                        </div>
                                        <div className="order-card-done">Done</div>
                                    </>
                                )}

                                {/* Pending orders show Start button */}
                                {order.status === 'Pending' && (
                                    <div className="order-card-actions">
                                        <button className="btn btn-outline" onClick={() => handleDownload(order.original_filename)}>
                                            <Download size={16} /> Download
                                        </button>
                                        <button className="btn btn-primary" onClick={() => handleStartProcessing(order.id)}>
                                            <Play size={16} /> Start
                                        </button>
                                    </div>
                                )}

                                {/* Processing orders show upload form */}
                                {order.status === 'Processing' && (
                                    <>
                                        <div className="order-card-actions">
                                            <button className="btn btn-outline" onClick={() => handleDownload(order.original_filename)}>
                                                <Download size={16} /> Download
                                            </button>
                                        </div>
                                        <div className="order-card-form">
                                            <div className="order-card-form-row">
                                                <label>Similarity</label>
                                                <label className="btn btn-outline upload-btn" style={{ cursor: 'pointer' }}>
                                                    <Upload size={14} /> Upload
                                                    <input type="file" style={{ display: 'none' }} accept=".pdf" onChange={(e) => handleEditChange(order.id, 'report1', e.target.files[0])} />
                                                </label>
                                                {edit.report1 && <CheckCircle size={16} className="uploaded-check" />}
                                                <input type="number" placeholder="%" value={edit.sim_score !== undefined ? edit.sim_score : order.sim_score || ''} onChange={(e) => handleEditChange(order.id, 'sim_score', e.target.value)} />
                                            </div>
                                            <div className="order-card-form-row">
                                                <label>AI Score</label>
                                                <label className="btn btn-outline upload-btn" style={{ cursor: 'pointer' }}>
                                                    <Upload size={14} /> Upload
                                                    <input type="file" style={{ display: 'none' }} accept=".pdf" onChange={(e) => handleEditChange(order.id, 'report2', e.target.files[0])} />
                                                </label>
                                                {edit.report2 && <CheckCircle size={16} className="uploaded-check" />}
                                                <input type="number" placeholder="%" value={edit.ai_score !== undefined ? edit.ai_score : order.ai_score || ''} onChange={(e) => handleEditChange(order.id, 'ai_score', e.target.value)} />
                                            </div>
                                            {isDraft && (
                                                <button className="btn btn-primary order-card-save" onClick={() => handleSave(order)}>
                                                    <Save size={16} /> Save & Complete
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default AdminOrders;
