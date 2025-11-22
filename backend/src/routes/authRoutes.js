import express from "express";
import {
  login,
  register,
  forgotPassword,
  verifySecurityAnswer,
  resetPassword,
  getProfile,
  changePassword,
  getSecurityQuestion,
  setSecurityQuestion,
} from "../controllers/authController.js";
import { authGuard } from "../middleware/authGuard.js";

const router = express.Router();

// Auth
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword); // Step 1: Get security question
router.post("/verify-security-answer", verifySecurityAnswer); // Step 2: Verify answer
router.post("/reset-password", resetPassword); // Step 3: Set new password

// Profile (cần authentication)
router.get("/profile", authGuard, getProfile);
router.post("/change-password", authGuard, changePassword);
router.get("/security-question", authGuard, getSecurityQuestion);
router.post("/security-question", authGuard, setSecurityQuestion);

export default router;
