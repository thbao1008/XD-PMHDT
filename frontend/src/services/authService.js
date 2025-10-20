import http from "./http";

// Gọi API login qua gateway
export async function login(username, password) {
  const res = await http.post("/auth/login", { username, password });
  return res.data; // { token, user }
}
