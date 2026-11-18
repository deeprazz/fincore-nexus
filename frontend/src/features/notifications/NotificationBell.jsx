import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { getNotifications } from "../../api/notifications";
import { useAuth } from "../../context/AuthContext";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const { auth } = useAuth();

  const fetchNotes = useCallback(async () => {
    if (!auth) return;
    try {
      const data = await getNotifications(null, auth);
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(Math.min(data.length, 9));
      }
    } catch {
      // Graceful fallback if notification microservice is not reachable
    }
  }, [auth]);

  useEffect(() => {
    fetchNotes();
    const interval = setInterval(fetchNotes, 15000);
    return () => clearInterval(interval);
  }, [fetchNotes]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setUnreadCount(0);
        }}
        className="notification-bell-btn"
        aria-label="Notifications"
        type="button"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span>Live Alerts &amp; Events</span>
            <button
              onClick={fetchNotes}
              className="text-button"
              type="button"
            >
              Refresh
            </button>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                No active notifications. Events emitted by payments, loans, and KYC will appear here.
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div key={n.id} className="notification-item">
                  <div className="notification-item-top">
                    <strong>[{n.channel}] {n.subject || n.eventType}</strong>
                    <small>
                      {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </small>
                  </div>
                  <p>{n.content}</p>
                  <div className="notification-item-footer">
                    <span>To: {n.recipient}</span>
                    <span className="status-badge verified">{n.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
