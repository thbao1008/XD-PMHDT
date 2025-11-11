import express from "express";
import {
  createMentor,
  getAllMentors,
  getMentorById,   
  updateMentor,
  removeMentor,
  getLearnersByMentor,
  getMentorByUserId,
  updateLearnerNote
} from "../controllers/mentorController.js";

import { createReport } from "../controllers/reportController.js"; 

const router = express.Router();

router.post("/", createMentor);
router.get("/", getAllMentors);
router.get("/:id", getMentorById);
router.put("/:id", updateMentor);
router.delete("/:id", removeMentor);
router.get("/:id/learners", getLearnersByMentor);
router.get("/by-user/:userId", getMentorByUserId);

// Mentor cập nhật ghi chú cho learner
router.put("/learners/:learnerId/note", updateLearnerNote);

// Mentor gửi report về learner
router.post("/", createReport);
export default router;

  