import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { Bell, CheckCheck } from 'lucide-react';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { useNavigate } from 'react-router-dom';

function timeAgo(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

export const NotificationBell: React.FC = React.memo(() => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationClick = useCallback((notification: typeof notifications[0]) => {
        markAsRead(notification.id);
        if (notification.link) {
            navigate(notification.link);
        }
        setIsOpen(false);
    }, [markAsRead, navigate]);

    const handleMarkAllAsRead = useCallback(() => {
        markAllAsRead();
    }, [markAllAsRead]);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="relative p-2 rounded-full hover:bg-primary/10 text-text-secondary hover:text-text-primary transition-colors"
                aria-label={`View notifications (${unreadCount} unread)`}
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-destructive text-white text-xs items-center justify-center">{unreadCount}</span>
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96">
                    <Card className="shadow-2xl !p-0">
                        <div className="flex justify-between items-center p-3 border-b border-border">
                            <h3 className="font-bold text-lg">Notifications</h3>
                            <button
                                onClick={handleMarkAllAsRead}
                                disabled={unreadCount === 0}
                                className="flex items-center gap-1 text-xs font-semibold text-primary disabled:text-text-secondary disabled:cursor-not-allowed hover:underline"
                            >
                                <CheckCheck size={14} /> Mark all as read
                            </button>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center items-center p-8"><Spinner /></div>
                            ) : notifications.length > 0 ? (
                                <ul>
                                    {notifications.map(n => (
                                        <li key={n.id}>
                                            <button
                                                onClick={() => handleNotificationClick(n)}
                                                className="w-full text-left p-3 flex gap-3 items-start hover:bg-primary/5 transition-colors border-b border-border last:border-b-0"
                                            >
                                                {!n.read && <div className="w-2.5 h-2.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>}
                                                <div className={n.read ? 'pl-5' : ''}>
                                                    <p className="text-sm text-text-primary">{n.message}</p>
                                                    <p className="text-xs text-text-secondary mt-1">{timeAgo(n.createdAt)}</p>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-sm text-text-secondary p-8">You have no notifications yet.</p>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
});