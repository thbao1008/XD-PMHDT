import express from "express";
import { authGuard } from "../middleware/authGuard.js";
import { adminGuard } from "../middleware/adminGuard.js";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  removeLearnerFromMentor,
  changeLearnerMentor,
  getAvailableMentors,
} from "../controllers/adminController.js";
import { findUserByIdentifier } from "../models/userModel.js";

const router = express.Router();

// Áp dụng middleware cho tất cả route trong nhóm này
router.use(authGuard);
router.use(adminGuard);

// Check trùng email/phone (đặt trước :id để không bị nuốt route)
router.get("/check", async (req, res) => {
  try {
    const { email, phone } = req.query;
    if (!email && !phone) {
      return res.json({ exists: false });
    }

    const identifier = email || phone;
    const user = await findUserByIdentifier(identifier);

    if (email && user && user.email === email) {
      return res.json({ exists: true });
    }
    if (phone && user && user.phone === phone) {
      return res.json({ exists: true });
    }

    return res.json({ exists: false });
  } catch (err) {
    console.error("❌ check route error - adminUsersRoutes.js:40", err);
    return res.status(500).json({ exists: false });
  }
});

// Các route quản lý người dùng
router.get("/", listUsers);
router.get("/:id", getUser);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.put("/:id/status", toggleUserStatus);

// Route quản lý mentor-learner
router.post("/learners/remove-from-mentor", removeLearnerFromMentor);
router.post("/learners/change-mentor", changeLearnerMentor);
router.get("/learners/:learnerId/available-mentors", getAvailableMentors);

export default router;
