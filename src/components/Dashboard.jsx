import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, ShoppingCart, Download, Trash2, CreditCard } from 'lucide-react';
import api, { orders, dailyLimit, userCredits } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [files, setFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [slotsRemaining, setSlotsRemaining] = useState(null);
    const [maxUploads, setMaxUploads] = useState(null);
    const [userSlots, setUserSlots] = useState(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // Check authentication on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    const fetchOrders = async () => {
        try {
            const response = await orders.list();
            setFiles(response.data);
        } catch (error) {
            console.error("Failed to fetch orders", error);
        }
    };

    const fetchDailyLimit = async () => {
        try {
            const response = await dailyLimit.get();
            setSlotsRemaining(response.data.remaining);
            setMaxUploads(response.data.max_uploads);
        } catch (error) {
            console.error("Failed to fetch daily limit", error);
        }
    };

    const fetchUserCredits = async () => {
        try {
            const response = await userCredits.get();
            setUserSlots(response.data.slots_remaining);
        } catch (error) {
            console.error("Failed to fetch user credits", error);
        }
    };

    // Poll for updates every 5 seconds
    useEffect(() => {
        fetchOrders();
        fetchDailyLimit();
        fetchUserCredits();

        const interval = setInterval(() => {
            fetchOrders();
            fetchDailyLimit();
            fetchUserCredits();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const handleFileChange = async (event) => {
        const selectedFiles = Array.from(event.target.files);
        if (selectedFiles.length === 0) return;

        setIsUploading(true);

        // Optimistic Update
        const newTempFiles = selectedFiles.map((file, index) => ({
            id: `temp-${Date.now()}-${index}`, // Temp ID
            original_filename: file.name,
            status: 'Processing',
            ai_score: 0,
            sim_score: 0,
            created_at: new Date().toISOString(),
            isTemp: true
        }));

        setFiles(prev => [...newTempFiles, ...prev]);

        try {
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('payment_ref', 'TEST_REF');

                await orders.upload(formData);
            }
            // Refresh list to get real IDs and status
            fetchOrders();
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed. Please try again.");
            // Remove temp files on failure (optional, but good UX)
            setFiles(prev => prev.filter(f => !f.isTemp));
        } finally {
            setIsUploading(false);
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleUploadClick = () => {
        if (userSlots === 0) {
            const confirmBuy = window.confirm("You have 0 slots remaining. Would you like to buy more credits?");
            if (confirmBuy) {
                navigate('/pricing');
            }
            return;
        }
        if (slotsRemaining === 0) {
            alert("System daily upload limit reached. Please try again tomorrow.");
            return;
        }
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Helper to format score
    const formatScore = (status, score) => {
        return status === 'Completed' ? `${score}%` : '-';
    };

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
            alert("Failed to download file. Please ensure you are logged in.");
        }
    };

    const handleDelete = async (fileId, filename) => {
        try {
            await orders.delete(fileId);
            await fetchOrders(); // Refresh the list
        } catch (error) {
            console.error("[DELETE] Failed:", error);
        }
    };

    return (
        <div className="dashboard-container">
            {/* User Personal Slots Banner */}
            <div style={{
                backgroundColor: '#d1fae5',
                border: '1px solid #6ee7b7',
                borderRadius: '8px',
                padding: '16px 20px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ color: '#047857', fontWeight: '600', fontSize: '16px' }}>
                    My Slots: {userSlots !== null ? userSlots : '...'}
                </div>
                <button
                    onClick={() => navigate('/pricing')}
                    disabled={slotsRemaining === 0}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: slotsRemaining === 0 ? '#9ca3af' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: slotsRemaining === 0 ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: slotsRemaining === 0 ? 0.7 : 1
                    }}
                    title={slotsRemaining === 0 ? "System daily limit reached" : "Buy more credits"}
                >
                    <CreditCard size={16} />
                    {slotsRemaining === 0 ? 'System Limit Reached' : 'Buy Slots'}
                </button>
            </div>

            {/* System Daily Slots Banner */}
            <div style={{
                backgroundColor: '#dbeafe',
                border: '1px solid #93c5fd',
                borderRadius: '8px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start'
            }}>
                <div style={{
                    color: '#1e40af',
                    fontWeight: '600',
                    fontSize: '16px'
                }}>
                    {slotsRemaining !== null
                        ? `${slotsRemaining} system slot${slotsRemaining !== 1 ? 's' : ''} remaining today`
                        : 'Loading...'}
                </div>
            </div>

            {/* Header with Title and Upload Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="dashboard-title" style={{ margin: 0 }}>Document Upload</h2>
                <button
                    onClick={handleUploadClick}
                    className="btn btn-primary"
                    disabled={isUploading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: isUploading ? 0.5 : 1,
                        cursor: isUploading ? 'not-allowed' : 'pointer'
                    }}
                >
                    <UploadCloud size={20} />
                    {isUploading ? 'Uploading...' : 'Upload Document'}
                </button>
                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx"
                />
            </div>

            {/* Upload Card containing ONLY the table now */}
            <div className="upload-card">

                {/* Data Table */}
                <div className="table-responsive">
                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                                <th style={{ padding: '12px' }}>No.</th>
                                <th style={{ padding: '12px' }}>Document Name</th>
                                <th style={{ padding: '12px' }}>Similarity Score</th>
                                <th style={{ padding: '12px' }}>AI Detection Score</th>
                                <th style={{ padding: '12px' }}>Status</th>
                                <th style={{ padding: '12px' }}>Original Doc</th>
                                <th style={{ padding: '12px' }}>AI Report</th>
                                <th style={{ padding: '12px' }}>Plagiarism Report</th>
                                <th style={{ padding: '12px' }}>Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                                        No documents uploaded yet.
                                    </td>
                                </tr>
                            ) : (
                                files.map((file, index) => (
                                    <tr key={file.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                        <td style={{ padding: '12px' }}>{index + 1}</td>
                                        <td style={{ padding: '12px', fontWeight: 500 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FileText size={16} />
                                                {file.original_filename}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px' }}>{formatScore(file.status, file.sim_score)}</td>
                                        <td style={{ padding: '12px' }}>{formatScore(file.status, file.ai_score)}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span className={`status-badge status-${file.status?.toLowerCase() || 'pending'}`}>
                                                {file.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {file.status === 'Completed' ? (
                                                <button
                                                    onClick={() => handleDownload(file.original_filename)}
                                                    className="btn btn-outline"
                                                    style={{ padding: '4px 10px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                                                >
                                                    <Download size={14} /> Download
                                                </button>
                                            ) : (
                                                <button disabled className="btn btn-disabled" style={{ opacity: 0.5, cursor: 'not-allowed', padding: '4px 10px', fontSize: '0.85rem' }}>
                                                    Download
                                                </button>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {file.status === 'Completed' && file.report2_path ? (
                                                <button
                                                    onClick={() => handleDownload(file.report2_path.split(/[/\\]/).pop())}
                                                    className="btn btn-outline"
                                                    style={{ padding: '4px 10px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', backgroundColor: '#f0fdf4' }}
                                                >
                                                    <Download size={14} /> AI Report
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: '#888' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {file.status === 'Completed' && file.report1_path ? (
                                                <button
                                                    onClick={() => handleDownload(file.report1_path.split(/[/\\]/).pop())}
                                                    className="btn btn-outline"
                                                    style={{ padding: '4px 10px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', backgroundColor: '#fef3f2' }}
                                                >
                                                    <Download size={14} /> Plag Report
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: '#888' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <button
                                                onClick={() => handleDelete(file.id, file.original_filename)}
                                                className="btn btn-outline"
                                                style={{ padding: '4px 10px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                                                title="Delete this file"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
