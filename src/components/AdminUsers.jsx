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
            <div className="upload-card">
                <div className="table-responsive">
                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                                <th style={{ padding: '12px' }}>ID</th>
                                <th style={{ padding: '12px' }}>First Name</th>
                                <th style={{ padding: '12px' }}>Last Name</th>
                                <th style={{ padding: '12px' }}>Email</th>
                                <th style={{ padding: '12px' }}>Active Slots</th>
                                <th style={{ padding: '12px' }}>Completed Slots</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                    <td style={{ padding: '12px' }}>#{user.id}</td>
                                    <td style={{ padding: '12px' }}>{user.first_name}</td>
                                    <td style={{ padding: '12px' }}>{user.last_name}</td>
                                    <td style={{ padding: '12px' }}>{user.email}</td>
                                    <td style={{ padding: '12px' }}>{user.credits?.slots_remaining || 0}</td>
                                    <td style={{ padding: '12px' }}>{user.credits?.total_purchased || 0}</td>
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
