import React from "react";

export function Metric({ icon: Icon, label, value, hint }) {
  return (
    <section className="metric-card">
      {Icon && (
        <div className="metric-icon">
          <Icon size={19} />
        </div>
      )}
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {hint && <div className="metric-hint">{hint}</div>}
    </section>
  );
}

export default Metric;
