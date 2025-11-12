import express from "express";
import {
  createMentor,
  getAllMentors,
  getMentorById,
  updateMentor,
  removeMentor,
  getLearnersByMentor,
  getMentorByUserId,
  updateLearnerNote,
  getSessions,
  upsertDraftSessions,
  deleteDraftSession,
  finalizeSchedule,
  mentorCreateReport
} from "../controllers/mentorController.js";

const router = express.Router();

// Mentor CRUD
router.post("/", createMentor);
router.get("/", getAllMentors);
router.get("/:id", getMentorById);
router.put("/:id", updateMentor);
router.delete("/:id", removeMentor);
router.get("/:id/learners", getLearnersByMentor);
router.get("/by-user/:userId", getMentorByUserId);

// Sessions
router.get("/:id/sessions", getSessions); // ?status=draft|final
router.post("/:id/sessions/draft", upsertDraftSessions); // ghi đè toàn bộ draft
router.delete("/:id/sessions/draft/:sessionId", deleteDraftSession); // xóa draft theo id
router.post("/:id/sessions/finalize", finalizeSchedule); // chốt lịch

// Note
router.put("/learners/:learnerId/note", updateLearnerNote);

// Report
router.post("/reports", mentorCreateReport);

export default router;
