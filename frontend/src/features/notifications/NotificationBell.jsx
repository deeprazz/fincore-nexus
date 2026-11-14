import React, { useState, useEffect, useRef } from "react";
import { getNotifications } from "../../api/notifications";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotes = async () => {
    try {
      const data = await getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(Math.min(data.length, 9));
      }
    } catch {
      // Graceful fallback if notification service is not reachable
    }
  };

  useEffect(() => {
    fetchNotes();
    const interval = setInterval(fetchNotes, 15000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setUnreadCount(0);
        }}
        className="relative p-2 rounded-full hover:bg-surface-alt text-muted hover:text-foreground transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-3xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-lg shadow-xl bg-surface border border-border z-50 overflow-hidden">
          <div className="p-3 border-b bg-surface-alt flex justify-between items-center">
            <span className="font-bold text-xs uppercase tracking-wider text-muted">
              Live Notifications (Simulated)
            </span>
            <button
              onClick={fetchNotes}
              className="text-2xs text-primary hover:underline font-semibold"
            >
              Refresh
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">
                No new alerts. Notifications emitted by payment, loan, and KYC events will appear here.
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div key={n.id} className="p-3 hover:bg-surface-alt transition-colors text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary">
                      [{n.channel}] {n.subject || n.eventType}
                    </span>
                    <span className="text-3xs text-muted">
                      {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                  <p className="text-foreground">{n.content}</p>
                  <div className="text-3xs text-muted flex gap-2">
                    <span>To: {n.recipient}</span>
                    <span>•</span>
                    <span className="text-green-600 font-semibold">{n.status}</span>
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
