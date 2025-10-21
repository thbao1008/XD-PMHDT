// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin } from "../services/authService";
import { saveAuth, clearAuth, getAuth } from "../utils/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  // Khôi phục trạng thái đăng nhập khi reload
  useEffect(() => {
    const stored = getAuth();
    if (stored) {
      setToken(stored.token);
      setUser(stored.user);
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
