// src/components/common/Button.jsx
import React from "react";

export default function Button({ children, variant = "primary", size = "default", onClick, className = "", ...props }) {
  const base = "btn";
  const variants = {
    primary: "btn-primary",
    ghost: "btn-ghost"
  };
  const sizes = {
    default: "",
    small: "btn-small"
  };

  const cls = [base, variants[variant] || "", sizes[size] || "", className].filter(Boolean).join(" ");
  return (
    <button className={cls} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
