import React from "react";

export default function Button({ children, variant = "primary", size = "default", onClick, className = "", type = "button", loading = false, leftIcon = null, rightIcon = null, ...props }) {
  const base = "btn";
  const variants = { primary: "btn-primary", ghost: "btn-ghost" };
  const sizes = { default: "", small: "btn-small" };

  const cls = [base, variants[variant] || "", sizes[size] || "", className].filter(Boolean).join(" ");

  return (
    <button type={type} className={cls} onClick={onClick} disabled={loading || props.disabled} aria-busy={loading} {...props}>
      {loading && <span className="btn-spinner" aria-hidden>⏳</span>}
      {leftIcon && <span className="btn-icon btn-icon-left">{leftIcon}</span>}
      <span className="btn-label">{children}</span>
      {rightIcon && <span className="btn-icon btn-icon-right">{rightIcon}</span>}
    </button>
  );
}
