import React from "react";

export function Tabs({ tabs = [], activeTab, onChange, className = "" }) {
  return (
    <div className={`tabs-container ${className}`}>
      {tabs.map((tab) => {
        const id = typeof tab === "string" ? tab : tab.id;
        const label = typeof tab === "string" ? tab : tab.label;
        const count = typeof tab === "object" ? tab.count : null;
        return (
          <button
            key={id}
            type="button"
            className={`tab-btn ${activeTab === id ? "active" : ""}`}
            onClick={() => onChange(id)}
          >
            {label}
            {count != null && <span className="tab-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
