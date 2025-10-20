export function saveAuth({ token, user }, remember) {
  if (remember) localStorage.setItem("aesp_token", token);
  else sessionStorage.setItem("aesp_token", token);
  localStorage.setItem("aesp_user", JSON.stringify(user));
}

export function getAuth() {
  const token = localStorage.getItem("aesp_token") || sessionStorage.getItem("aesp_token");
  const user = localStorage.getItem("aesp_user");
  return { token, user: user ? JSON.parse(user) : null };
}

export function clearAuth() {
  localStorage.removeItem("aesp_token");
  sessionStorage.removeItem("aesp_token");
  localStorage.removeItem("aesp_user");
}
