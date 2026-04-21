/**
 * Axios API client — all backend calls go through here.
 *
 * v2 additions:
 *   - authAPI.updateProfile()
 *   - visitorAPI.register() now sends FormData (supports photo)
 *   - adminAPI.updateBranch(), adminAPI.activateUser()
 */
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally — clear session and go to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  me:             ()     => api.get('/auth/me'),
  updateProfile:  (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// ─── Visitors ─────────────────────────────────────────────────────────────────
export const visitorAPI = {
  // JSON body — photo_data is a base64 string inside the payload
  register: (data)   => api.post('/visitors/register', data),
  list:     (params) => api.get('/visitors',    { params }),
  getById:  (id)     => api.get(`/visitors/${id}`),
};

// ─── Visits (Scan / Check-in / Check-out) ─────────────────────────────────────
export const visitAPI = {
  scan: (qrToken) => api.post(`/visits/scan/${qrToken}`),
  list: (params)  => api.get('/visits', { params }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminAPI = {
  // Dashboard & reports
  dashboard: (params) => api.get('/admin/dashboard',  { params }),
  report:    (params) => api.get('/admin/report',     { params }),
  auditLogs: (params) => api.get('/admin/audit-logs', { params }),

  // Branches
  branches:     ()     => api.get('/admin/branches'),
  createBranch: (data) => api.post('/admin/branches', data),

  // Users
  users:        ()     => api.get('/admin/users'),
  createUser:   (data) => api.post('/admin/users', data),
  deleteUser:   (id)   => api.delete(`/admin/users/${id}`),
};

export default api;
