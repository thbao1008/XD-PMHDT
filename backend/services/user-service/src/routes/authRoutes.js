import express from "express";
import {
  login,
  register,
  requestPasswordReset,
  verifySecurityAnswer,
  resetPassword,
  getProfile,
  changePassword,
  getSecurityQuestion,
  setSecurityQuestion,
} from "../controllers/authController.js";
import { authGuard } from "../middleware/authGuard.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", requestPasswordReset);
router.post("/verify-security-answer", verifySecurityAnswer);
router.post("/reset-password", resetPassword);

router.get("/profile", authGuard, getProfile);
router.post("/change-password", authGuard, changePassword);
router.get("/security-question", authGuard, getSecurityQuestion);
router.post("/security-question", authGuard, setSecurityQuestion);

export default router;

