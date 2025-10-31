// src/routes/adminUsersRoutes.js
import express from "express";
import { authGuard } from "../middleware/authGuard.js";
import { adminGuard } from "../middleware/adminGuard.js";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
} from "../controllers/adminController.js";

const router = express.Router();

// Áp dụng middleware cho tất cả route
router.use(authGuard);
router.use(adminGuard);

// Định nghĩa các route quản lý người dùng
router.get("/", listUsers);
router.get("/:id", getUser);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.patch("/:id/status", toggleUserStatus);

// Export duy nhất
export default router;
