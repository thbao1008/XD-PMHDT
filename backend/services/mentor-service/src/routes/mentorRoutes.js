// Mentor Routes
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

/**
 * Tìm backend directory (đi lên từ mentor-service/src/routes đến backend)
 */
function getProjectRoot() {
  // __dirname = backend/services/mentor-service/src/routes
  // Đi lên 3 cấp: routes -> src -> mentor-service -> services -> backend
  return path.resolve(__dirname, "..", "..", "..");
}

const router = express.Router();

// Ensure uploads directory exists at backend/uploads
const backendDir = getProjectRoot();
const uploadsDir = path.resolve(backendDir, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(`[Multer] Destination: ${uploadsDir}`);
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + "-" + uniqueSuffix + ext;
    console.log(`[Multer] Filename: ${filename} (original: ${file.originalname}, ext: ${ext})`);
    cb(null, filename);
  }
});

const upload = multer({ storage: storage });

/* -----------------------
   Specific routes first
   ----------------------- */

// Dashboard endpoints
router.get("/:mentorId/dashboard/stats", dashboardCtrl.getDashboardStats);
router.get("/:mentorId/dashboard/pending-submissions", dashboardCtrl.getPendingSubmissions);
router.get("/:mentorId/dashboard/schedules", dashboardCtrl.getSchedules);

// AI endpoints
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

// Schedules
router.get("/:mentorId/schedules", scheduleCtrl.getMentorSchedules);
router.post("/:mentorId/schedules", scheduleCtrl.createSchedule);
router.put("/schedules/:scheduleId", scheduleCtrl.updateSchedule);
router.delete("/schedules/:scheduleId", scheduleCtrl.deleteSchedule);
router.get("/schedules/:scheduleId", scheduleCtrl.getScheduleById);

// Mentor CRUD
router.post("/", mentorCtrl.createMentor);
router.get("/", mentorCtrl.getAllMentors);
router.get("/:id", mentorCtrl.getMentorById);
router.put("/:id", mentorCtrl.updateMentor);
router.delete("/:id", mentorCtrl.removeMentor);

// Submissions & Reviews
router.get("/:mentorId/submissions", mentorCtrl.listSubmissions);
router.get("/:mentorId/submissions/:id", mentorCtrl.getSubmission);
router.post("/:mentorId/submissions/:id/review", mentorCtrl.postReview);
router.get("/:mentorId/reviews", mentorCtrl.listReviews);

export default router;

