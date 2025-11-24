// backend/src/routes/mentorRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as mentorCtrl from "../controllers/mentorController.js";
import * as scheduleCtrl from "../controllers/scheduleController.js";
import * as dashboardCtrl from "../controllers/mentorDashboardController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

/* -----------------------
   Specific routes first
   ----------------------- */

// Dashboard endpoints (specific paths before generic /:id)
router.get("/:mentorId/dashboard/stats", dashboardCtrl.getDashboardStats);
router.get("/:mentorId/dashboard/pending-submissions", dashboardCtrl.getPendingSubmissions);
router.get("/:mentorId/dashboard/schedules", dashboardCtrl.getSchedules);

// AI endpoints and topic/challenge specific (specific paths before generic /:id)
router.post("/topics/:topicId/challenges/ai", mentorCtrl.createChallengeAI);
router.put("/challenges/:id/ai", mentorCtrl.editChallengeAI);
router.post("/challenges/ai-chat", mentorCtrl.chatWithAI);
router.post("/challenges/ai-improve", mentorCtrl.improveChallengeDraft);

// Topics & Challenges
router.get("/:id/topics", mentorCtrl.getTopicsByMentor);
router.post("/:id/topics", mentorCtrl.createTopic);
router.delete("/topics/:topicId", mentorCtrl.deleteTopic);
router.get("/topics/:topicId/challenges", mentorCtrl.getChallengesByTopic);
router.post("/topics/:topicId/challenges", mentorCtrl.createChallenge);
// New endpoints for Challenge Creator (without topic)
router.get("/:mentorId/challenges", mentorCtrl.getChallengesByMentor);
router.post("/:mentorId/challenges", mentorCtrl.createChallenge);
router.delete("/challenges/:id", mentorCtrl.deleteChallenge);
router.put("/challenges/:id", mentorCtrl.updateChallenge);

// Resources
router.get("/:id/resources/published", mentorCtrl.getPublishedResources);
router.get("/:id/resources", mentorCtrl.getResources);
router.post("/:id/resources", upload.single("file"), mentorCtrl.createResource);
router.put("/resources/:id", upload.single("file"), mentorCtrl.updateResource);
router.patch("/resources/:id/visibility", mentorCtrl.toggleResourceVisibility);
router.delete("/resources/:id", mentorCtrl.deleteResource);

// Reports
router.post("/reports", upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), mentorCtrl.mentorCreateReport);

// Mentor by user and learners
router.get("/by-user/:userId", mentorCtrl.getMentorByUserId);
router.get("/:id/learners", mentorCtrl.getLearnersByMentor);
router.put("/learners/:learnerId/note", mentorCtrl.updateLearnerNote);

// Schedules (Lịch học mới - thay thế sessions cũ)
router.get("/:mentorId/schedules", scheduleCtrl.getMentorSchedules);
router.post("/:mentorId/schedules", scheduleCtrl.createSchedule);
router.put("/schedules/:scheduleId", scheduleCtrl.updateSchedule);
router.delete("/schedules/:scheduleId", scheduleCtrl.deleteSchedule);
router.get("/schedules/:scheduleId", scheduleCtrl.getScheduleById);

// Mentor CRUD (generic id route placed after specific ones)
router.post("/", mentorCtrl.createMentor);
router.get("/", mentorCtrl.getAllMentors);
router.get("/:id", mentorCtrl.getMentorById);
router.put("/:id", mentorCtrl.updateMentor);
router.delete("/:id", mentorCtrl.removeMentor);

/* -----------------------
   Mentor-specific submission/review endpoints
   ----------------------- */
// List submissions for a mentor
router.get("/:mentorId/submissions", mentorCtrl.listSubmissions);

// Get single submission (only if learner.mentor_id === mentorId)
router.get("/:mentorId/submissions/:id", mentorCtrl.getSubmission);

// Mentor save review for submission (accepts audio_url in body)
router.post("/:mentorId/submissions/:id/review", mentorCtrl.postReview);

// List reviews by mentor
router.get("/:mentorId/reviews", mentorCtrl.listReviews);

export default router;
