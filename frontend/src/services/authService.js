// src/services/authService.js
// Mock simple: trả về token + user theo username/password để test
export async function login(username, password) {
  // small delay giả lập network
  await new Promise((r) => setTimeout(r, 400));

  // account mẫu để test
  const accounts = {
    admin: { id: 1, name: "Admin", role: "admin", email: "admin@example.com" },
    mentor: { id: 2, name: "Mentor", role: "mentor", email: "mentor@example.com" },
    learner: { id: 3, name: "Learner", role: "learner", email: "user@example.com" }
  };

  // credential đơn giản: username === one of keys, password === "password"
  if (!username || password !== "password") {
    throw new Error("Sai tên đăng nhập hoặc mật khẩu");
  }
  const key = username.toLowerCase();
  const user = accounts[key];
  if (!user) {
    throw new Error("Tài khoản không tồn tại");
  }

  // trả về giống backend: { token, user }
  return {
    token: "fake-token-" + Math.random().toString(36).slice(2, 9),
    user
  };
}
