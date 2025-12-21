
import React, { useState, useEffect } from 'react';
import { auth } from '../services/api';

const Account = () => {
    const [user, setUser] = useState({ firstName: '', lastName: '', email: '', is_admin: false });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser({
            firstName: storedUser.first_name || '',
            lastName: storedUser.last_name || '',
            email: storedUser.email || '',
            is_admin: storedUser.is_admin || false
        });
    }, []);

    const handleUpdateProfile = (e) => {
        e.preventDefault();
        // Placeholder for update API call
        alert("Profile update feature coming soon!");
    };

    const handlePasswordReset = () => {
        alert("Password reset email sent!");
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div>
                    <h1>Account Settings</h1>
                    <p className="text-muted">Manage your profile and subscription</p>
                </div>
            </header>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>

                {/* Edit Profile Card */}
                <div className="stat-card" style={{ padding: '24px' }}>
                    <h3>Edit Profile</h3>
                    <form onSubmit={handleUpdateProfile} style={{ marginTop: '20px' }}>
                        <div className="form-group">
                            <label>First Name</label>
                            <input
                                type="text"
                                className="form-control"
                                value={user.firstName}
                                onChange={(e) => setUser({ ...user, firstName: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input
                                type="text"
                                className="form-control"
                                value={user.lastName}
                                onChange={(e) => setUser({ ...user, lastName: e.target.value })}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                            Update Profile
                        </button>
                    </form>
                    <button className="btn" style={{ width: '100%', marginTop: '10px', background: '#dc3545', color: 'white', border: 'none' }}>
                        Delete Account
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Change Password Card */}
                    <div className="stat-card" style={{ padding: '24px' }}>
                        <h3>Change Password</h3>
                        <p className="text-muted" style={{ marginBottom: '20px' }}>
                            Receive an email to rest your password securely.
                        </p>
                        <button onClick={handlePasswordReset} className="btn" style={{ width: '100%', background: '#6c757d', color: 'white' }}>
                            Send Password Reset Email
                        </button>
                    </div>

                    {/* Subscription Status Card */}
                    <div className="stat-card" style={{ padding: '24px' }}>
                        <h3>Subscription Status</h3>
                        <div style={{ margin: '20px 0' }}>
                            <span className="text-muted">Plan: </span>
                            <span style={{ fontWeight: 'bold', color: '#2563eb' }}>Free</span>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }}>
                            Upgrade to Pro
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Account;
