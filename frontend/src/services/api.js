import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor – attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tneb_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLogoutRequest = error.config?.url?.includes('/auth/logout');
      if (!isLogoutRequest) {
        localStorage.removeItem('tneb_token');
        localStorage.removeItem('tneb_user');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const loginAdmin = (data) => api.post('/auth/admin/login', data);
export const loginManager = (data) => api.post('/auth/manager/login', data);
export const loginUser = (data) => api.post('/auth/user/login', data);
export const logoutUser = (token) => {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  return api.post('/auth/logout', {}, config);
};
export const getProfile = () => api.get('/auth/profile');
export const forgotPasswordRequest = (email) => api.post('/auth/forgot-password/request', { email });
export const forgotPasswordVerifyOtp = (email, otp) => api.post('/auth/forgot-password/verify-otp', { email, otp });
export const forgotPasswordReset = (email, newPassword, confirmPassword) => api.post('/auth/forgot-password/reset', { email, newPassword, confirmPassword });

// ── Employees ─────────────────────────────────────────────────────────────────
export const getEmployees = (params) => api.get('/employees', { params });
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);
export const getDashboardStats = () => api.get('/employees/stats/dashboard');

// ── Requests ──────────────────────────────────────────────────────────────────
export const getRequests = (params) => api.get('/requests', { params });
export const getMyRequests = (params) => api.get('/requests/my', { params });
export const createRequest = (data) => api.post('/requests', data);
export const approveRequest = (id, data) => api.put(`/requests/${id}/approve`, data);
export const rejectRequest = (id, data) => api.put(`/requests/${id}/reject`, data);

// ── Managers ──────────────────────────────────────────────────────────────────
export const getManagers = (params) => api.get('/managers', { params });
export const createManager = (data) => api.post('/managers', data);
export const updateManager = (id, data) => api.put(`/managers/${id}`, data);
export const deactivateManager = (id) => api.put(`/managers/${id}/deactivate`);
export const unfreezeManager = (id) => api.put(`/managers/${id}/unfreeze`);

// ── Admins ────────────────────────────────────────────────────────────────────
export const getAdmins = (params) => api.get('/admins', { params });
export const createAdmin = (data) => api.post('/admins', data);
export const updateAdmin = (id, data) => api.put(`/admins/${id}`, data);
export const deactivateAdmin = (id) => api.put(`/admins/${id}/deactivate`);
export const getDbTables = () => api.get('/admins/db/tables');
export const getDbTableData = (tableName) => api.get(`/admins/db/tables/${tableName}`);
export const updateDbTableRow = (tableName, data) => api.put(`/admins/db/tables/${tableName}/row`, data);
export const sendBirthdayEmail = (employeeId) => api.post(`/admins/employees/${employeeId}/birthday-email`);
export const sendAwarenessEmail = (formData) => api.post('/admins/send-awareness-email', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getCyberCampaignSettings = () => api.get('/admins/settings/cyber-campaign');
export const updateCyberCampaignSettings = (data) => api.put('/admins/settings/cyber-campaign', data);

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications = () => api.get('/notifications');
export const markRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllRead = () => api.put('/notifications/read-all');

// ── Audit ─────────────────────────────────────────────────────────────────────
export const getAuditLogs = (params) => api.get('/audit', { params });

// ── Retirement ────────────────────────────────────────────────────────────────
export const getUpcomingRetirements = (params) => api.get('/retirement/upcoming', { params });
export const getRetirementArchive = (params) => api.get('/retirement/archive', { params });

// ── Export ────────────────────────────────────────────────────────────────────
export const exportData = (type, format) =>
  api.get(`/export/${type}?format=${format}`, { responseType: 'blob' });

export default api;
