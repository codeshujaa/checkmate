import React, { useState, useEffect } from 'react';
import { admin } from '../services/api';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await admin.listUsers();
                setUsers(response.data);
            } catch (error) {
                console.error("Failed to fetch users", error);
            }
        };
        fetchUsers();
    }, []);

    return (
        <div className="dashboard-container">
            <h2 className="dashboard-title">User Management</h2>
            <div className="card" style={{ overflow: 'hidden', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                <div className="table-responsive">
                    <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>ID</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>First Name</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Last Name</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Email</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Active Slots</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Total Purchased</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user, index) => (
                                <tr key={user.id} style={{ borderBottom: index !== users.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    <td style={{ padding: '20px 24px', verticalAlign: 'middle', color: '#64748b' }}>{user.id}</td>
                                    <td style={{ padding: '20px 24px', verticalAlign: 'middle', fontWeight: '600', color: '#0f172a' }}>{user.first_name}</td>
                                    <td style={{ padding: '20px 24px', verticalAlign: 'middle', fontWeight: '600', color: '#0f172a' }}>{user.last_name}</td>
                                    <td style={{ padding: '20px 24px', verticalAlign: 'middle', color: '#334155' }}>{user.email}</td>
                                    <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                                        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600' }}>
                                            {user.credits?.slots_remaining || 0}
                                        </span>
                                    </td>
                                    <td style={{ padding: '20px 24px', verticalAlign: 'middle', color: '#64748b' }}>{user.credits?.total_purchased || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
