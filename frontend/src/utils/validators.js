// src/utils/validators.js

export function isEmail(value) {
  if (typeof value !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isPhoneNumber(value) {
  if (typeof value !== "string") return false;
  const v = value.trim();
  // Vietnamese local 10-digit starting with 0 OR international +84...
  if (/^0\d{9}$/.test(v)) return true;          // e.g. 0123456789
  if (/^\+84\d{9}$/.test(v)) return true;       // e.g. +84912345678
  if (/^84\d{9}$/.test(v)) return true;         // e.g. 84912345678
  return false;
}
