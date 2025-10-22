// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App.jsx";
import "./styles/theme.css";
import "./styles/base.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { getAuth } from "./utils/auth";

const auth = getAuth();
if (auth?.user?.role) {
  // getAuth already applies theme, but ensure class is set before render
  try {
    document.body.classList.add(`theme-${auth.user.role}`);
  } catch (e) {}
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
