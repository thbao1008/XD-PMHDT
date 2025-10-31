﻿export function adminGuard(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Không có quyền admin" });
  }
  next();
}
