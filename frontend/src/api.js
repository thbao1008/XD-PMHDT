import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:4002/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  // Lấy token từ localStorage trước, nếu không có thì lấy từ sessionStorage
  const data =
    localStorage.getItem("aesp_auth_v1") || sessionStorage.getItem("aesp_auth_v1");

  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    } catch (e) {
      console.error("Parse token error: - api.js:20", e);
    }
  }

  return config;
});

export default api;
