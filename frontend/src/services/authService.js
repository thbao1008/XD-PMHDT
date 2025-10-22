// src/services/authService.js
import { isEmail, isPhoneNumber } from "../utils/validators";

/**
 * Mock login: accepts identifier (email or phone) + password
 * For production replace with real API call.
 */
export async function login(identifier, password) {
  await new Promise((r) => setTimeout(r, 400));

  const accounts = [
    { id: 1, name: "Admin", role: "admin", email: "admin@example.com", phone: "0123456789" },
    { id: 2, name: "Mentor", role: "mentor", email: "mentor@example.com", phone: "0987654321" },
    { id: 3, name: "Learner", role: "learner", email: "user@example.com", phone: "0909090909" }
  ];

  if (!identifier || !password) {
    throw new Error("Vui lòng nhập đầy đủ thông tin");
  }

  // simple password check for mock
  if (password !== "password") {
    throw new Error("Sai thông tin đăng nhập hoặc mật khẩu");
  }

  let user = null;
  if (isEmail(identifier)) {
    user = accounts.find((u) => u.email.toLowerCase() === identifier.toLowerCase());
  } else if (isPhoneNumber(identifier)) {
    user = accounts.find((u) => u.phone === identifier);
  } else {
    // try match by email fallback (if user typed full email-like string)
    user = accounts.find((u) => u.email.toLowerCase() === identifier.toLowerCase());
  }

  if (!user) {
    throw new Error("Tài khoản không tồn tại");
  }

  return {
    token: "fake-token-" + Math.random().toString(36).slice(2, 9),
    user
  };
}
