import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getNotifications, markRead as apiMarkRead, markAllRead as apiMarkAllRead } from '../services/api';

const SocketContext = createContext(null);

export function SocketProvider({ children, token, user }) {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notifications initially when user log in
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Connect socket.io
  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const s = io('http://localhost:5000', {
      query: { 
        userId: user.unique_id,
        role: user.role
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    s.on('connect', () => console.log('[Socket] Connected:', s.id));
    s.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
    s.on('connect_error', (err) => console.warn('[Socket] Error:', err.message));

    // Handle new notifications in real-time
    const handleNewNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    s.on('notification:new', handleNewNotification);
    s.on('notification:new_role', (notifData) => {
      // Re-fetch notifications to get full object with ID
      fetchNotifications();
    });
    s.on('dashboard:updated', () => {
      fetchNotifications();
    });

    setSocket(s);

    return () => {
      s.off('notification:new', handleNewNotification);
      s.off('notification:new_role');
      s.off('dashboard:updated');
      s.disconnect();
      setSocket(null);
    };
  }, [token, user, fetchNotifications]);

  const markRead = useCallback(async (id) => {
    try {
      await apiMarkRead(id);
      setNotifications((prev) => 
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiMarkAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, notifications, unreadCount, loading, markRead, markAllRead, refetchNotifications: fetchNotifications }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

export default SocketContext;
