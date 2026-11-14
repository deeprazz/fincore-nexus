import React from "react";

export function FormField({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helpText,
  children,
  className = "",
  ...props
}) {
  return (
    <div className={`form-field ${className}`}>
      {label && <label htmlFor={id}>{label}</label>}
      {children ? (
        children
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          {...props}
        />
      )}
      {error && <span className="field-error">{error}</span>}
      {helpText && <span className="field-help">{helpText}</span>}
    </div>
  );
}

export default FormField;
