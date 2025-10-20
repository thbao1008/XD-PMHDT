export const MENU = [
  // Admin
  { id: "dashboard", label: "Dashboard", path: "/admin", role: ["admin"] },
  { id: "users", label: "Users", path: "/admin/users", role: ["admin"] },
  { id: "mentors", label: "Mentors", path: "/admin/mentors", role: ["admin"] },
  { id: "packages", label: "Packages", path: "/admin/packages", role: ["admin"] },
  { id: "purchases", label: "Purchases", path: "/admin/purchases", role: ["admin"] },
  { id: "reports", label: "Reports", path: "/admin/reports", role: ["admin"] },
  { id: "support", label: "Support", path: "/admin/support", role: ["admin"] },

  // Mentor
  { id: "assessment", label: "Assessment Panel", path: "/mentor/assessment", role: ["mentor"] },
  { id: "feedback", label: "Feedback Panel", path: "/mentor/feedback", role: ["mentor"] },
  { id: "topics", label: "Topic Manager", path: "/mentor/topics", role: ["mentor"] },

  // Learner
  { id: "catalog", label: "Package Catalog", path: "/learn/catalog", role: ["learner"] },
  { id: "practice", label: "Speaking Practice", path: "/learn/practice", role: ["learner"] },
  { id: "challenges", label: "Challenges", path: "/learn/challenges", role: ["learner"] },
  { id: "progress", label: "Progress Analytics", path: "/learn/progress", role: ["learner"] }
];

export function getMenuForRole(role) {
  return MENU.filter(m => m.role.includes(role));
}
