// api.js
import axios from "axios";

// Tạo instance Axios với baseURL chuẩn
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:4002/api",
  headers: { "Content-Type": "application/json" },
});

// Interceptor: gắn token vào header nếu có
api.interceptors.request.use((config) => {
  const data =
    localStorage.getItem("aesp_auth_v1") ||
    sessionStorage.getItem("aesp_auth_v1");

  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    } catch (e) {
      console.error("Parse token error - api.js:23", e);
    }
  }
  return config;
});

// Interceptor: xử lý lỗi response chung
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API error - api.js:34", error.response.status, error.response.data);
    } else if (error.request) {
      console.error("No response from server - api.js:36", error.request);
    } else {
      console.error("Axios config error - api.js:38", error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
