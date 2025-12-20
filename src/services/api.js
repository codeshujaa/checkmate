import axios from 'axios';

// API URL from environment variable (set VITE_API_URL in .env)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
    complete: (id, formData) => api.post(`/admin/complete/${id}`, formData),
    setDailyLimit: (maxUploads) => api.put('/admin/daily-limit', { max_uploads: maxUploads }),
};

export const dailyLimit = {
    get: () => api.get('/daily-limit'),
};

export const payment = {
    initiate: (slots, phoneNumber) => api.post('/payment/initiate', { slots, phone_number: phoneNumber }),
    checkStatus: (invoiceId) => api.get(`/payment/status/${invoiceId}`),
};

export const userCredits = {
    get: () => api.get('/user/credits'),
};

export default api;
