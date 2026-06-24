import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginAdmin as apiLoginAdmin, loginManager as apiLoginManager, loginUser as apiLoginUser, logoutUser as apiLogoutUser } from '../services/api';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('tneb_token'));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('tneb_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        localStorage.removeItem('tneb_token');
        localStorage.removeItem('tneb_user');
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  // Synchronize Axios default Authorization header with active token state
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);



  const loginAdmin = useCallback(async (userId, password) => {
    const res = await apiLoginAdmin({ userId, password });
    const { token: t, user: u } = res.data;
    setToken(t);
    setUser(u);
    localStorage.setItem('tneb_token', t);
    localStorage.setItem('tneb_user', JSON.stringify(u));
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    return u;
  }, []);

  const loginManager = useCallback(async (userId, password) => {
    const res = await apiLoginManager({ userId, password });
    const { token: t, user: u } = res.data;
    setToken(t);
    setUser(u);
    localStorage.setItem('tneb_token', t);
    localStorage.setItem('tneb_user', JSON.stringify(u));
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    return u;
  }, []);

  const loginUser = useCallback(async (userId) => {
    const res = await apiLoginUser({ userId });
    const { token: t, user: u } = res.data;
    setToken(t);
    setUser(u);
    localStorage.setItem('tneb_token', t);
    localStorage.setItem('tneb_user', JSON.stringify(u));
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    return u;
  }, []);

  const logout = useCallback(() => {
    const activeToken = localStorage.getItem('tneb_token');

    // Immediately clear local state to ensure instant UI response
    setUser(null);
    setToken(null);
    localStorage.removeItem('tneb_token');
    localStorage.removeItem('tneb_user');
    delete axios.defaults.headers.common['Authorization'];

    // Send background request to clear session in database (only if not already cleared)
    if (activeToken) {
      apiLogoutUser(activeToken).catch((err) => {
        console.error('Background logout error:', err);
      });
    }
  }, []);

  // Global 30-minute inactivity timer
  useEffect(() => {
    if (!token || !user) return;

    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        toast.error('Session expired due to 30 minutes of inactivity. Please log in again.');
      }, 30 * 60 * 1000); // 30 minutes in milliseconds
    };

    // Initialize timer
    resetTimer();

    // Event listeners to detect user interaction
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'click'];
    const handleActivity = () => resetTimer();

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [token, user, logout]);

  const isAuthenticated = useCallback(() => !!token && !!user, [token, user]);

  return (
    <AuthContext.Provider value={{ user, token, loading, loginAdmin, loginManager, loginUser, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
