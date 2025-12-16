import React from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Reset Password</h2>
                <p className="card-text" style={{ marginBottom: '20px', textAlign: 'center' }}>
                    Enter your email address and we'll send you a link to reset your password.
                </p>
                <form className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input type="email" id="email" className="form-control" />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Send Reset Link</button>
                </form>
                <div className="auth-footer">
                    <Link to="/login">Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
