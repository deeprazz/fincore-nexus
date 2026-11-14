import React from "react";

export function EmptyState({ message = "No data found", icon: Icon, children }) {
  return (
    <div className="empty-state-card">
      {Icon && (
        <div className="empty-state-icon">
          <Icon size={32} />
        </div>
      )}
      <p className="empty-state-text">{message}</p>
      {children}
    </div>
  );
}

export default EmptyState;
