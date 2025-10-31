const KEY = "aesp_auth_v1";

function applyRoleTheme(role) {
  try {
    document.body.classList.remove("theme-admin", "theme-mentor", "theme-learner");
    if (role) {
      document.body.classList.add(`theme-${role.toLowerCase()}`);
    }
  } catch (e) {
    // silent
  }
}

/**
 * Lưu thông tin đăng nhập
 * @param {{token: string, user: object}} payload
 * @param {boolean} remember - true thì lưu vào localStorage, false thì sessionStorage
 */
export function saveAuth(payload, remember = true) {
  const data = {
    token: payload?.token,
    user: payload?.user,
    _ts: Date.now()
  };
  try {
    const str = JSON.stringify(data);
    localStorage.setItem(KEY, str); // luôn lưu vào LocalStorage
    applyRoleTheme(payload?.user?.role);
  
  } catch (e) {
   
  }

}

/**
 * Lấy thông tin đăng nhập
 */
export function getAuth() {
  try {
    const str = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
    const parsed = str ? JSON.parse(str) : null;
    if (parsed?.user?.role) {
      parsed.user.role = parsed.user.role.toLowerCase();
      applyRoleTheme(parsed.user.role);
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

/**
 * Xoá thông tin đăng nhập
 */
export function clearAuth() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    document.body.classList.remove("theme-admin", "theme-mentor", "theme-learner");
  } catch (e) {
  }
}
