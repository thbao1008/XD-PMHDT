import express from "express";
import multer from "multer";
import * as learnerCtrl from "../controllers/learnerController.js";
import * as speakingPracticeCtrl from "../controllers/speakingPracticeController.js";
import * as dictionaryCtrl from "../controllers/dictionaryController.js";
import * as scenarioCtrl from "../controllers/scenarioController.js";

const router = express.Router();

/**
 * NOTE: đặt các route có path tĩnh / nhiều segment trước route động "/:id"
 * để tránh bị bắt nhầm bởi route param "/:id".
 */

/* ===== Multer config để nhận file ===== */
const upload = multer({ dest: "uploads/" }); // lưu file vào thư mục uploads/

/* ===== Lookup by user / resource download (static-like) ===== */
router.get("/by-user/:userId", learnerCtrl.getLearnerByUserId);
router.get("/:learnerId/resource/:resourceId/download", learnerCtrl.downloadLearnerResource);

/* ===== Purchases / Mentor (specific before generic :id) ===== */
router.get("/:id/purchases", learnerCtrl.getPurchases);
router.get("/:id/latest-purchase", learnerCtrl.getLatestPurchase);
router.get("/:id/mentor", learnerCtrl.getMentorByLearnerId);

/* ===== Learners CRUD ===== */
router.get("/", learnerCtrl.getAll);        // Lấy danh sách learners
router.post("/", learnerCtrl.create);      // Tạo learner mới

router.get("/:id", learnerCtrl.getById);   // Lấy learner theo ID
router.put("/:id", learnerCtrl.update);    // Cập nhật learner
router.delete("/:id", learnerCtrl.remove); // Xóa learner

/* ===== Challenges & Submissions ===== */
router.get("/:learnerId/challenges", learnerCtrl.getLearnerChallenges);          
router.get("/:learnerId/submissions", learnerCtrl.listSubmissionsForLearner);
router.post("/submissions/:id/analyze", learnerCtrl.analyzeSubmission);
// ✅ dùng upload.single("file") để parse form-data có file + field text
router.post("/submissions", upload.single("file"), learnerCtrl.createSubmission);
router.get("/submissions/:id/analysis", learnerCtrl.getSubmissionAnalysis);

router.get("/submissions/:id", learnerCtrl.getSubmissionById);

/* ===== Learner Feedback & Reports ===== */
router.get("/:learnerId/mentor/feedback-status", learnerCtrl.getMentorFeedbackStatus);
router.get("/:learnerId/mentor/feedbacks", learnerCtrl.getLearnerFeedbacksForMentor);
router.post("/:learnerId/mentor/feedback", learnerCtrl.createLearnerFeedbackForMentor);
router.post("/:learnerId/mentor/report", upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), learnerCtrl.reportMentor);

/* ===== Speaking Practice ===== */
// Practice mode routes
router.post("/speaking-practice/sessions", speakingPracticeCtrl.createPracticeSession);
router.get("/speaking-practice/sessions/:sessionId/prompt", speakingPracticeCtrl.getPrompt);
router.post("/speaking-practice/sessions/:sessionId/rounds", upload.single("audio"), speakingPracticeCtrl.saveRound);
router.get("/speaking-practice/sessions/:sessionId/rounds/:roundId/analysis", speakingPracticeCtrl.getRoundAnalysis);
router.post("/speaking-practice/sessions/:sessionId/rounds/:roundId/translation", speakingPracticeCtrl.checkTranslation);
router.get("/speaking-practice/sessions/:sessionId/summary", speakingPracticeCtrl.getSummary);

// Story mode routes
router.post("/speaking-practice/story/sessions", speakingPracticeCtrl.createStorySession);
router.post("/speaking-practice/story/message", upload.single("audio"), speakingPracticeCtrl.processStoryMessage);

// Dictionary route
router.get("/dictionary/:word", dictionaryCtrl.getWordDefinition);

// Scenario-based speaking practice routes
router.get("/speaking-practice/scenarios", scenarioCtrl.getScenarios);
router.post("/speaking-practice/scenario/sessions", scenarioCtrl.createScenarioSession);
router.post("/speaking-practice/scenario/sessions/:sessionId/start", scenarioCtrl.startConversation);
router.post("/speaking-practice/scenario/sessions/:sessionId/message", upload.single("audio"), scenarioCtrl.sendMessage);

export default router;
