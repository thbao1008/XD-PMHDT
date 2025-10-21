// src/components/common/Input.jsx
import React from "react";

export default function Input({ value, onChange, placeholder = "", type = "text", className = "", ...props }) {
  return (
    <input
      className={["input", className].filter(Boolean).join(" ")}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      type={type}
      {...props}
    />
  );
}
