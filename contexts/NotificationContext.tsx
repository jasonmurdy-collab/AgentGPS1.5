import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getFirestoreInstance } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, getDocs, orderBy, Timestamp, DocumentSnapshot } from 'firebase/firestore';
import type { Notification } from '../types';
import { processNotificationDoc } from '../lib/firestoreUtils';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) {
            setLoading(true);
            return;
        }
        if (!user) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const notificationsRef = collection(getFirestoreInstance(), 'notifications');
        const q = query(
            notificationsRef, 
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setNotifications(snapshot.docs.map(processNotificationDoc));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notifications:", error);
            setNotifications([]);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading]);

    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    const markAsRead = useCallback(async (notificationId: string) => {
        const notificationDocRef = doc(getFirestoreInstance(), 'notifications', notificationId);
        await updateDoc(notificationDocRef, { read: true });
    }, []);

    const markAllAsRead = useCallback(async () => {
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;

        const batch = writeBatch(getFirestoreInstance());
        unread.forEach(notification => {
            const docRef = doc(getFirestoreInstance(), 'notifications', notification.id);
            batch.update(docRef, { read: true });
        });
        await batch.commit();
    }, [notifications]);
    
    const value = useMemo(() => ({ notifications, unreadCount, loading, markAsRead, markAllAsRead }), 
        [notifications, unreadCount, loading, markAsRead, markAllAsRead]
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};