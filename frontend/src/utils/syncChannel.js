// Cross-tab real-time event synchronization channel using BroadcastChannel + Storage events fallback
const CHANNEL_NAME = "fincore_nexus_sync";
const LOCAL_STORAGE_KEY = "fincore_last_sync_event";

let channel = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  channel = null;
}

/**
 * Broadcast an account status change (FREEZE, UNFREEZE, CLOSE, BALANCE) across all open browser tabs
 */
export function broadcastAccountChange(accountId, status, extra = {}) {
  const payload = {
    type: "ACCOUNT_STATUS_CHANGED",
    accountId: String(accountId),
    status: status ? String(status).toUpperCase() : "ACTIVE",
    timestamp: Date.now(),
    ...extra,
  };

  if (channel) {
    try {
      channel.postMessage(payload);
    } catch {
      // ignore
    }
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/**
 * Subscribe to account status changes from any other tab or process
 * @param {Function} callback - called immediately with event payload
 * @returns {Function} cleanup function to unsubscribe
 */
export function subscribeToAccountChanges(callback) {
  if (typeof window === "undefined") return () => {};

  const cleanups = [];

  if (channel) {
    const handleBroadcast = (e) => {
      if (e.data && e.data.type === "ACCOUNT_STATUS_CHANGED") {
        callback(e.data);
      }
    };
    channel.addEventListener("message", handleBroadcast);
    cleanups.push(() => channel.removeEventListener("message", handleBroadcast));
  }

  const handleStorage = (e) => {
    if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data && data.type === "ACCOUNT_STATUS_CHANGED") {
          callback(data);
        }
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener("storage", handleStorage);
  cleanups.push(() => window.removeEventListener("storage", handleStorage));

  return () => {
    cleanups.forEach((c) => c());
  };
}
