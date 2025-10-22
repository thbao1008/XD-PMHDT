// src/config/menu.jsx
export const MENU = [
  // Admin
  { id: "dashboard", label: "Dashboard", path: "/admin", role: ["admin"], icon: "🏠" },
  { id: "users", label: "Users", path: "/admin/users", role: ["admin"], icon: "👥" },
  { id: "mentors", label: "Mentors", path: "/admin/mentors", role: ["admin"], icon: "🧑‍🏫" },
  { id: "packages", label: "Packages", path: "/admin/packages", role: ["admin"], icon: "📦" },
  { id: "purchases", label: "Purchases", path: "/admin/purchases", role: ["admin"], icon: "🧾" },
  { id: "reports", label: "Reports", path: "/admin/reports", role: ["admin"], icon: "📊" },
  { id: "support", label: "Support", path: "/admin/support", role: ["admin"], icon: "🛟" },

  // Mentor
  { id: "assessment", label: "Assessment Panel", path: "/mentor/assessment", role: ["mentor"], icon: "📝" },
  { id: "feedback", label: "Feedback Panel", path: "/mentor/feedback", role: ["mentor"], icon: "💬" },
  { id: "topics", label: "Topic Manager", path: "/mentor/topics", role: ["mentor"], icon: "📚" },

  // Learner
  { id: "catalog", label: "Package Catalog", path: "/learn/catalog", role: ["learner"], icon: "🛍️" },
  { id: "practice", label: "Speaking Practice", path: "/learn/practice", role: ["learner"], icon: "🎙️" },
  { id: "challenges", label: "Challenges", path: "/learn/challenges", role: ["learner"], icon: "🏆" },
  { id: "progress", label: "Progress Analytics", path: "/learn/progress", role: ["learner"], icon: "📈" },
];

export function getMenuForRole(role) {
  return MENU.filter(m => Array.isArray(m.role) ? m.role.includes(role) : String(m.role) === String(role));
}
