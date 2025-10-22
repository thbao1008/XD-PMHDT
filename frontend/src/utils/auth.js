// src/utils/auth.js
const KEY = "aesp_auth_v1";

function applyRoleTheme(role) {
  try {
    document.body.classList.remove("theme-admin", "theme-mentor", "theme-learner");
    if (role) document.body.classList.add(`theme-${role}`);
  } catch (e) {
    // silent
  }
}

export function saveAuth(payload, remember = true) {
  const data = {
    token: payload.token,
    user: payload.user,
    _ts: Date.now()
  };
  try {
    const str = JSON.stringify(data);
    if (remember) localStorage.setItem(KEY, str);
    else sessionStorage.setItem(KEY, str);
    applyRoleTheme(payload?.user?.role);
  } catch (e) {
    console.error("saveAuth error - auth.js:25", e);
  }
}

export function getAuth() {
  try {
    const str = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
    const parsed = str ? JSON.parse(str) : null;
    // ensure theme applied if auth present
    if (parsed?.user?.role) applyRoleTheme(parsed.user.role);
    return parsed;
  } catch (e) {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
  try {
    document.body.classList.remove("theme-admin", "theme-mentor", "theme-learner");
  } catch (e) {
    // silent
  }
}
