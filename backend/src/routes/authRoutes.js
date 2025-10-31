import express from "express";
import {
  login,
  register,
  forgotPassword,
  resetPassword,
  getProfile,
  changePassword,
} from "../controllers/authController.js";

const router = express.Router();

// Auth
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Admin profile
router.get("/profile", getProfile);          // lấy thông tin admin
router.post("/change-password", changePassword); // đổi mật khẩu

export default router;
