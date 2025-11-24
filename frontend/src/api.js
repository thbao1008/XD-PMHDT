// api.js
import axios from "axios";
import { clearAuth } from "./utils/auth";

// Tạo instance Axios với baseURL chuẩn
// Dùng relative URL để đi qua Vite proxy
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api", // Relative URL - đi qua Vite proxy
  timeout: 60000, // 60 seconds timeout for file uploads
});

// Interceptor: gắn token vào header nếu có và set Content-Type
api.interceptors.request.use((config) => {
  // Set Content-Type only if not multipart/form-data (Axios will set it automatically for FormData)
  if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  
  // Remove Content-Type header for FormData - let Axios set it automatically with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
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
    // Don't crash - log error and return friendly message
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      // Xử lý lỗi session không hợp lệ (403 với requiresLogin)
      // Không tự động logout ở đây, để AuthContext xử lý và hiển thị modal
      if (status === 403 && data?.requiresLogin) {
        error.message = data.message || "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
        error.requiresLogin = true;
        // Trigger event để AuthContext biết và hiển thị modal
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
      
      // Xử lý lỗi banned user (403 với banned)
      if (status === 403 && data?.banned) {
        error.message = data.message || "Tài khoản của bạn đang bị tạm khóa. Hãy liên hệ hỗ trợ để được giải quyết.";
        error.banned = true;
        error.banReason = data.banReason;
      }
      
      console.error("API error - api.js:34", status, data);
    } else if (error.request) {
      // Backend không phản hồi - không crash, chỉ log
      console.warn("⚠️  Backend services chưa sẵn sàng. Vui lòng kiểm tra backend services đã chạy chưa.");
      // Return friendly error instead of crashing
      error.message = "Backend services chưa sẵn sàng. Vui lòng kiểm tra backend services đã chạy chưa.";
    } else {
      console.error("Axios config error - api.js:38", error.message);
    }
    // Don't crash - return error for UI to handle
    return Promise.reject(error);
  }
);

export default api;
