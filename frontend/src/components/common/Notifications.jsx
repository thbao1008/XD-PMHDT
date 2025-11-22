// frontend/src/components/common/Notifications.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiX, FiCheck } from 'react-icons/fi';
import api from '../../api';
import '../../styles/notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadUnreadCount();
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadUnreadCount() {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.count || 0);
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  }

  async function loadNotifications() {
    setLoading(true);
    try {
      const response = await api.get('/notifications?limit=20');
      setNotifications(response.data.notifications || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId) {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }

  async function markAllAsRead() {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }

  function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  }

  function handleNotificationClick(notification) {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    // TODO: Navigate to related post/comment
    setIsOpen(false);
  }

  return (
    <div className="notifications-container" ref={dropdownRef}>
      <button
        className="notifications-bell"
        onClick={() => setIsOpen(!isOpen)}
        title="Thông báo"
      >
        <FiBell />
        {unreadCount > 0 && (
          <span className="notifications-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Thông báo</h3>
            {unreadCount > 0 && (
              <button
                className="btn-mark-all-read"
                onClick={markAllAsRead}
                title="Đánh dấu tất cả đã đọc"
              >
                <FiCheck /> Đánh dấu tất cả đã đọc
              </button>
            )}
            <button
              className="btn-close-dropdown"
              onClick={() => setIsOpen(false)}
            >
              <FiX />
            </button>
          </div>

          <div className="notifications-list">
            {loading ? (
              <div className="notifications-loading">Đang tải...</div>
            ) : notifications.length === 0 ? (
              <div className="notifications-empty">Chưa có thông báo nào</div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatTime(notification.created_at)}</div>
                  </div>
                  {!notification.is_read && (
                    <div className="notification-unread-dot"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

