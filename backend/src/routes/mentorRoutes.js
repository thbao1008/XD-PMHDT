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

  // Resources
  getResources,
  createResource,
  updateResource,
  deleteResource,

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


// ========== Learners ==========
router.get("/:id/learners", getLearnersByMentor);
router.get("/by-user/:userId", getMentorByUserId);
router.put("/learners/:learnerId/note", updateLearnerNote);


// ========== Sessions ==========
router.get("/:id/sessions", getSessions);
router.post("/:id/sessions", addSessionController);
router.put("/:id/sessions/:sessionId", updateSessionController);
router.delete("/:id/sessions/:sessionId", deleteSessionController);
router.post("/:id/sessions/batch", addSessionsBatchController);


// ========== Resources ==========
router.get("/:id/resources", getResources);
router.post("/:id/resources", createResource);
router.put("/resources/:id", updateResource);
router.delete("/resources/:id", deleteResource);


// ========== Report ==========
router.post("/reports", mentorCreateReport);

export default router;
