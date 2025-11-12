import express from "express";
import {
  // Mentor CRUD
  createMentor,
  getAllMentors,
  getMentorById,
  updateMentor,
  removeMentor,
  // Learners
  getLearnersByMentor,
  getMentorByUserId,
  updateLearnerNote,
  // Sessions
  getSessions,
  addSessionController,
  updateSessionController,
  deleteSessionController,
  addSessionsBatchController,
  // Report
  mentorCreateReport
} from "../controllers/mentorController.js";

const router = express.Router();

// ========== Mentor CRUD ==========
router.post("/", createMentor);
router.get("/", getAllMentors);
router.get("/:id", getMentorById);
router.put("/:id", updateMentor);
router.delete("/:id", removeMentor);
router.get("/:id/learners", getLearnersByMentor);
router.get("/by-user/:userId", getMentorByUserId);

// ========== Sessions ==========
router.get("/:id/sessions", getSessions);                       // lấy toàn bộ lịch
router.post("/:id/sessions", addSessionController);             // thêm buổi
router.put("/:id/sessions/:sessionId", updateSessionController); // cập nhật buổi
router.delete("/:id/sessions/:sessionId", deleteSessionController); // xóa buổi


router.post("/:id/sessions/batch", addSessionsBatchController);
// ========== Note ==========
router.put("/learners/:learnerId/note", updateLearnerNote);

// ========== Report ==========
router.post("/reports", mentorCreateReport);

export default router;
