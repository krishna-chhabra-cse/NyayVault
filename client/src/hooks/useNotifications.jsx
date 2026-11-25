import React, { createContext, useContext, useState, useEffect } from 'react';

const INITIAL_NOTIFICATIONS = [];

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('nv_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasMockData = Array.isArray(parsed) && parsed.some(n => n.id?.startsWith('notif-') && (n.caseId === 'CR-2026-0045' || n.caseId === 'CR-2026-0001'));
        if (hasMockData) {
          localStorage.removeItem('nv_notifications');
          return [];
        }
        return parsed;
      }
      return INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('nv_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications', e);
    }
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const addNotification = ({ titleEn, titleHi, messageEn, messageHi, type = 'info', caseId = null }) => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      titleEn,
      titleHi: titleHi || titleEn,
      messageEn,
      messageHi: messageHi || messageEn,
      timeEn: 'Just now',
      timeHi: 'अभी',
      type,
      read: false,
      caseId
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        addNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      notifications: [],
      unreadCount: 0,
      markAsRead: () => {},
      markAllAsRead: () => {},
      clearAll: () => {},
      addNotification: () => {}
    };
  }
  return context;
};
