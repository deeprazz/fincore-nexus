import React from "react";

export function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  className = "",
  ...props
}) {
  const variantMap = {
    primary: "primary-button btn-primary",
    secondary: "secondary-button btn-secondary",
    danger: "danger-button btn-danger",
    outline: "outline-button btn-outline",
  };

  const resolvedClass = variantMap[variant] || "primary-button btn-primary";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`btn ${resolvedClass} btn-${size} ${className}`}
      {...props}
    >
      {loading ? <span className="btn-spinner animate-spin" /> : null}
      {children}
    </button>
  );
}

export default Button;
