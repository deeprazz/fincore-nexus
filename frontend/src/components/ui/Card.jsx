import React from "react";

export function Card({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {(title || subtitle || actions) && (
        <div className="panel-header">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export default Card;
