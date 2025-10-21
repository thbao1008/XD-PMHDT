// src/utils/auth.js
const KEY = "aesp_auth_v1";

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
  } catch (e) {
    console.error("saveAuth error - auth.js:15", e);
  }
}

export function getAuth() {
  try {
    const str = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
    return str ? JSON.parse(str) : null;
  } catch (e) {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}
