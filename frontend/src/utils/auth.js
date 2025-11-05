// src/utils/auth.js
const KEY = "aesp_auth_v1";

// Áp dụng theme theo role
function applyRoleTheme(role) {
  document.body.classList.remove("theme-admin", "theme-mentor", "theme-learner");
  if (role) {
    document.body.classList.add(`theme-${role.toLowerCase()}`);
  }
}

// Lưu thông tin auth
export function saveAuth(payload, remember = true) {
  const data = {
    token: payload?.token,
    user: payload?.user,
    _ts: Date.now(),
  };
  const str = JSON.stringify(data);
  if (remember) {
    localStorage.setItem(KEY, str);
    sessionStorage.removeItem(KEY);
  } else {
    sessionStorage.setItem(KEY, str);
    localStorage.removeItem(KEY);
  }
  applyRoleTheme(payload?.user?.role);
}

// Lấy thông tin auth
export function getAuth() {
  const str = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
  const parsed = str ? JSON.parse(str) : null;
  if (parsed?.user?.role) {
    parsed.user.role = parsed.user.role.toLowerCase();
    applyRoleTheme(parsed.user.role);
  }
  return parsed;
}

// Xóa thông tin auth (logout)
export function clearAuth() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
  document.body.classList.remove("theme-admin", "theme-mentor", "theme-learner");
}
