// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { login as apiLogin } from "../services/authService";
import { saveAuth, clearAuth, getAuth } from "../utils/auth";
import Modal from "../components/common/Modal";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const sessionCheckIntervalRef = useRef(null);

  // Hàm logout và redirect
  const handleLogoutAndRedirect = useCallback(() => {
    setUser(null);
    setToken(null);
    clearAuth();
    // Clear interval
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }
    // Redirect về login nếu không phải đang ở trang login
    if (window.location.pathname !== "/login") {
      window.location.href = "/login?session=expired";
    }
  }, []);

  // Kiểm tra session có hợp lệ không
  const checkSession = useCallback(async () => {
    const stored = getAuth();
    if (!stored?.token) {
      return;
    }

    try {
      const { default: api } = await import("../api");
      // Gọi API nhẹ để kiểm tra session (sử dụng endpoint /users/me)
      await api.get("/users/me");
    } catch (err) {
      // Nếu nhận được 403 với requiresLogin, session đã bị invalidate (đăng nhập từ nguồn khác)
      if (err.response?.status === 403 && err.response?.data?.requiresLogin) {
        console.log("Session đã bị invalidate, hiển thị thông báo...");
        // Hiển thị modal thông báo
        setShowSessionExpiredModal(true);
      }
    }
  }, []);

  // Lắng nghe event session-expired từ API interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      if (!showSessionExpiredModal) {
        setShowSessionExpiredModal(true);
      }
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, [showSessionExpiredModal]);

  // Khôi phục trạng thái đăng nhập khi reload và kiểm tra session
  useEffect(() => {
    const stored = getAuth();
    if (stored) {
      setToken(stored.token);
      setUser(stored.user);
      // Kiểm tra session ngay khi load
      checkSession();
      // Kiểm tra session định kỳ mỗi 2 giây để phát hiện ngay lập tức
      sessionCheckIntervalRef.current = setInterval(checkSession, 2000);
    }

    // Cleanup interval khi unmount
    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    };
  }, [checkSession]);

  // Kiểm tra session ngay khi window/tab được focus hoặc có user interaction
  useEffect(() => {
    const handleFocus = () => {
      const stored = getAuth();
      if (stored?.token && !showSessionExpiredModal) {
        checkSession();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const stored = getAuth();
        if (stored?.token && !showSessionExpiredModal) {
          checkSession();
        }
      }
    };

    // Kiểm tra khi có user interaction (click, keypress) để phát hiện ngay
    const handleUserInteraction = () => {
      const stored = getAuth();
      if (stored?.token && !showSessionExpiredModal) {
        checkSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Throttle để tránh gọi quá nhiều
    let lastCheck = 0;
    const throttledCheck = () => {
      const now = Date.now();
      if (now - lastCheck > 1000) { // Chỉ check mỗi 1 giây
        lastCheck = now;
        handleUserInteraction();
      }
    };
    document.addEventListener('click', throttledCheck);
    document.addEventListener('keydown', throttledCheck);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', throttledCheck);
      document.removeEventListener('keydown', throttledCheck);
    };
  }, [checkSession, showSessionExpiredModal]);

  async function login(username, password, remember) {
    setLoading(true);
    try {
      const { token, user } = await apiLogin(username, password);
      setUser(user);
      setToken(token);
      saveAuth({ token, user }, remember);
      // Bắt đầu kiểm tra session định kỳ sau khi login (mỗi 2 giây)
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
      sessionCheckIntervalRef.current = setInterval(checkSession, 2000);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      // Gọi API logout để xóa session trên server
      const { default: api } = await import("../api");
      const auth = getAuth();
      if (auth?.token) {
        try {
          await api.post("/auth/logout");
        } catch (err) {
          // Ignore logout errors - session might already be invalid
          console.warn("Logout API error (ignored):", err);
        }
      }
    } catch (err) {
      console.warn("Logout error (ignored):", err);
    } finally {
      setUser(null);
      setToken(null);
      clearAuth();
      // Clear interval khi logout
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    }
  }

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, loading }}>
      {children}
      
      {/* Modal thông báo khi đăng nhập từ nguồn khác */}
      {showSessionExpiredModal && (
        <Modal
          title="Phiên đăng nhập đã hết hạn"
          onClose={() => {
            setShowSessionExpiredModal(false);
            handleLogoutAndRedirect();
          }}
        >
          <div style={{ padding: "20px", textAlign: "center" }}>
            <div style={{ 
              fontSize: "48px", 
              marginBottom: "16px",
              color: "#ef4444"
            }}>
              ⚠️
            </div>
            <h3 style={{ 
              marginBottom: "16px", 
              color: "#1f2937",
              fontSize: "20px",
              fontWeight: "600"
            }}>
              Bạn đã đăng nhập trên thiết bị khác
            </h3>
            <p style={{ 
              marginBottom: "24px", 
              color: "#6b7280",
              fontSize: "16px",
              lineHeight: "1.6"
            }}>
              Nếu không phải bạn, hãy liên hệ hỗ trợ ngay!
            </p>
            <button
              onClick={() => {
                setShowSessionExpiredModal(false);
                handleLogoutAndRedirect();
              }}
              style={{
                padding: "12px 24px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
                width: "100%"
              }}
            >
              Đăng nhập lại
            </button>
          </div>
        </Modal>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
