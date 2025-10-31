const BASE_URL = "/api/auth";

export async function login(identifier, password) {
  if (!identifier || !password) {
    throw new Error("Vui lòng nhập đầy đủ thông tin");
  }

  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  const data = await res.json();
  console.log("🔎 API /login response: - authService.js:15", data);

  if (!res.ok) {
    throw new Error(data.message || "Đăng nhập thất bại");
  }

  const token = data.token || data.data?.token;
  const user = data.user || data.data?.user;

  if (!token || !user) {
    throw new Error("Phản hồi đăng nhập không hợp lệ");
  }
  return { token, user };
}
