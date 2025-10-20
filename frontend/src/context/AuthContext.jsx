import React, { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin } from "../services/authService";
import { saveAuth, clearAuth } from "../utils/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  // Khôi phục trạng thái đăng nhập khi reload
  useEffect(() => {
    const storedToken = localStorage.getItem("aesp_token") || sessionStorage.getItem("aesp_token");
    const storedUser = localStorage.getItem("aesp_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  async function login(username, password, remember) {
    setLoading(true);
    try {
      const { token, user } = await apiLogin(username, password);
      setUser(user);
      setToken(token);
      saveAuth({ token, user }, remember);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    clearAuth();
  }

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
