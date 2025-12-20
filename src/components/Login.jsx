import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../services/api';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await auth.login(email, password);
            const { token, user } = response.data;

            // Store auth data
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Redirect based on role
            if (user.is_admin) {
                navigate('/dashboard/admin');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            const serverError = err.response?.data?.error || err.message || 'Login failed';
            setError(serverError);
            console.error('Login error:', err);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Login</h2>
                <form className="auth-form" onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <div className="label-row">
                            <label htmlFor="password">Password</label>
                            <Link to="/forgot-password" className="forgot-password">Forgot Password?</Link>
                        </div>
                        <input
                            type="password"
                            id="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group checkbox-group">
                        <input type="checkbox" id="remember" />
                        <label htmlFor="remember">Remember Me</label>
                    </div>
                    {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
                    <button type="submit" className="btn btn-primary btn-block">Login</button>
                </form>
                <div className="auth-footer">
                    Don't have an account? <Link to="/register">Create One</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
