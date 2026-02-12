import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, Clock, AlertTriangle, FileText, Send, ListChecks } from 'lucide-react';
import { apiFetchJson } from '../lib/api';

const NOTIFICATION_ICONS = {
  task: ListChecks,
  rfc: Send,
  mas: FileText,
  dds: Clock,
  alert: AlertTriangle,
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiFetchJson('/api/notifications');
      const notifs = Array.isArray(data) ? data : data.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (err) {
      // Notifications API may not be available yet
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await apiFetchJson(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await Promise.all(
        notifications.filter(n => !n.is_read).map(n =>
          apiFetchJson(`/api/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {})
        )
      );
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-lodha-grey hover:bg-lodha-sand rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-jost font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-lodha-steel rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-lodha-cream border-b border-lodha-muted-gold/30">
            <h3 className="font-garamond text-lg font-bold text-lodha-grey">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-lodha-gold hover:text-lodha-grey font-jost font-semibold">
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-lodha-grey/30 mx-auto mb-2" />
                <p className="text-sm text-lodha-grey/60 font-jost">No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(notif => {
                const Icon = NOTIFICATION_ICONS[notif.type] || Bell;
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-lodha-steel/10 hover:bg-lodha-sand/30 transition-colors cursor-pointer ${!notif.is_read ? 'bg-lodha-gold/5' : ''}`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${!notif.is_read ? 'bg-lodha-gold/10' : 'bg-lodha-steel/10'}`}>
                      <Icon className={`w-4 h-4 ${!notif.is_read ? 'text-lodha-gold' : 'text-lodha-grey/40'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-jost ${!notif.is_read ? 'font-semibold text-lodha-grey' : 'text-lodha-grey/70'}`}>
                        {notif.message || notif.title}
                      </p>
                      <p className="text-xs text-lodha-grey/50 font-jost mt-0.5">{getTimeAgo(notif.created_at)}</p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 bg-lodha-gold rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
