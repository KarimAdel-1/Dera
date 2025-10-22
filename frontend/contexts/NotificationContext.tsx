import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useWallet } from './WalletContext';

export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { activeWallet } = useWallet();

  // Load saved notifications
  useEffect(() => {
    loadNotifications();
  }, [activeWallet]);

  // Monitor loan health (example - would be connected to backend)
  useEffect(() => {
    if (!activeWallet) return;

    // Simulate checking loan health
    const interval = setInterval(() => {
      checkLoanHealth();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [activeWallet]);

  const loadNotifications = () => {
    try {
      if (!activeWallet) return;
      const saved = localStorage.getItem(`dera_notifications_${activeWallet.accountId}`);
      if (saved) {
        const parsedNotifications = JSON.parse(saved).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
        setNotifications(parsedNotifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const saveNotifications = (notifs: Notification[]) => {
    try {
      if (!activeWallet) return;
      localStorage.setItem(`dera_notifications_${activeWallet.accountId}`, JSON.stringify(notifs));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);
    saveNotifications([newNotification, ...notifications]);

    // Show toast based on type
    const toastMessage = `${notification.title}: ${notification.message}`;
    switch (notification.type) {
      case 'success':
        toast.success(toastMessage);
        break;
      case 'error':
      case 'critical':
        toast.error(toastMessage);
        break;
      case 'warning':
        toast(toastMessage, { icon: '⚠️' });
        break;
      case 'info':
        toast(toastMessage, { icon: 'ℹ️' });
        break;
    }
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const clearAll = () => {
    setNotifications([]);
    saveNotifications([]);
  };

  const checkLoanHealth = async () => {
    // This would call the backend API to check loan health
    // Example simulation:
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/loans/health/${activeWallet.accountId}`);
      // const data = await response.json();

      // Simulate health factor warning
      const simulatedHealthFactor = 1.15; // Would come from API

      if (simulatedHealthFactor < 1.2 && simulatedHealthFactor >= 1.0) {
        addNotification({
          type: 'warning',
          title: 'Low Health Factor',
          message: `Your loan health factor is ${simulatedHealthFactor.toFixed(2)}. Consider adding collateral or repaying to avoid liquidation.`,
          action: {
            label: 'Manage Loan',
            onClick: () => {
              window.location.href = '/borrow';
            },
          },
        });
      } else if (simulatedHealthFactor < 1.0) {
        addNotification({
          type: 'critical',
          title: 'Liquidation Risk!',
          message: `URGENT: Your loan health factor is ${simulatedHealthFactor.toFixed(2)}. Liquidation is imminent!`,
          action: {
            label: 'Repay Now',
            onClick: () => {
              window.location.href = '/borrow?action=repay';
            },
          },
        });
      }
    } catch (error) {
      console.error('Failed to check loan health:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
