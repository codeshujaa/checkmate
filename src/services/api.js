import axios from 'axios';

// API URL determination:
// - In Production (vite build): Use relative path (empty string) so requests go to same domain/port
// - In Development: Use localhost:8080
const API_URL = import.meta.env.PROD ? '' : 'http://localhost:8080';

const api = axios.create({
    baseURL: API_URL,
});

// Add a request interceptor to add the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const auth = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    signup: (userData) => api.post('/auth/signup', userData),
    sendOTP: (email) => api.post('/auth/otp', { email }),
    googleLogin: (credential) => api.post('/auth/google', { credential }),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, new_password: newPassword }),
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};

export const orders = {
    upload: (formData) => api.post('/upload', formData),
    list: () => api.get('/user/orders'),
    delete: (id) => api.delete(`/user/orders/${id}`),
    download: (filename) => `${API_URL}/download/${filename}`,
};

export const admin = {
    list: () => api.get('/admin/orders'),
    listUsers: () => api.get('/admin/users'),
    transactions: () => api.get('/admin/transactions'),
    complete: (id, formData) => api.post(`/admin/complete/${id}`, formData),
    verifyTransaction: (reference) => api.post(`/admin/transactions/${reference}/verify`),
};

export const packages = {
    getAll: () => api.get('/packages'),
    create: (data) => api.post('/admin/packages', data),
    update: (id, data) => api.put(`/admin/packages/${id}`, data),
    delete: (id) => api.delete(`/admin/packages/${id}`)
};



export const payment = {
    initiate: (slots, phoneNumber) => api.post('/payment/initiate', { slots, phone_number: phoneNumber }),
    checkStatus: (invoiceId) => api.get(`/payment/status/${invoiceId}`),
};

export const userCredits = {
    get: () => api.get('/user/credits'),
};

export default api;
