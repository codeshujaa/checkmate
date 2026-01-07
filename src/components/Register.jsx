import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { auth } from '../services/api';

const Register = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [otpCode, setOtpCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Resend Logic
    const [resendCount, setResendCount] = useState(0);
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleInitiateRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        setLoading(true);
        try {
            await auth.sendOTP(formData.email);
            setStep(2);
            setTimer(60); // Start cooldown immediately after first send
        } catch (err) {
            setError(err.response?.data?.error || "Failed to send verification code");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCount >= 3) return;

        setLoading(true);
        setError('');
        try {
            await auth.sendOTP(formData.email);
            setResendCount(prev => prev + 1);
            setTimer(60);
        } catch (err) {
            setError("Failed to resend code");
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await auth.signup({
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                password: formData.password,
                code: otpCode
            });

            const loginResponse = await auth.login(formData.email, formData.password);
            const { token, user } = loginResponse.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            if (user.is_admin) navigate('/dashboard/admin');
            else navigate('/dashboard');

        } catch (err) {
            setError(err.response?.data?.error || "Registration failed. Invalid code?");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        try {
            const response = await auth.googleLogin(credentialResponse.credential);
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            if (user.is_admin) navigate('/dashboard/admin');
            else navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || "Login Failed");
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verification Screen
    if (step === 2) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h2 className="auth-title">Check Your Email</h2>
                    <p className="auth-subtitle">
                        We sent a 6-digit code to<br />
                        <strong>{formData.email}</strong>
                    </p>

                    {error && <div className="error-message">{error}</div>}

                    <form className="auth-form" onSubmit={handleCompleteRegister}>
                        <div className="form-group">
                            <label htmlFor="otp">Verification Code</label>
                            <input
                                type="text"
                                id="otp"
                                className="form-control"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                placeholder="Enter 6-digit code"
                                style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.25rem', fontWeight: '600' }}
                                maxLength={6}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                            {loading ? 'Activating...' : 'Activate Account'}
                        </button>

                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            {timer > 0 ? (
                                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Resend code in {timer}s</span>
                            ) : resendCount < 3 ? (
                                <button
                                    type="button"
                                    className="btn-link"
                                    onClick={handleResend}
                                    disabled={loading}
                                    style={{ textDecoration: 'underline', padding: '0' }}
                                >
                                    Resend Code {resendCount > 0 && `(${3 - resendCount} attempts left)`}
                                </button>
                            ) : (
                                <span style={{ color: '#ef4444', fontSize: '0.9rem' }}>Max attempts reached. Please restart.</span>
                            )}
                        </div>

                        <button
                            type="button"
                            className="btn btn-link btn-block"
                            onClick={() => setStep(1)}
                            style={{ marginTop: '10px' }}
                        >
                            ← Back to Register
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Step 1: Registration Form
    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Create Account</h2>
                <p className="auth-subtitle">Join us today and get started</p>

                {error && <div className="error-message">{error}</div>}

                <form className="auth-form" onSubmit={handleInitiateRegister}>
                    <div className="row">
                        <div className="form-group">
                            <label htmlFor="firstName">First Name</label>
                            <input
                                type="text"
                                id="firstName"
                                className="form-control"
                                placeholder="John"
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="lastName">Last Name</label>
                            <input
                                type="text"
                                id="lastName"
                                className="form-control"
                                placeholder="Doe"
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            className="form-control"
                            placeholder="name@example.com"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="form-control"
                            placeholder="Create a strong password"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            className="form-control"
                            placeholder="Confirm your password"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-divider"><span>or continue with</span></div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Google Sign-In Failed')}
                        theme="outline"
                        size="large"
                        width="100%"
                    />
                </div>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
