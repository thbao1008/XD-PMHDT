import express from "express";
import multer from "multer";
import * as learnerCtrl from "../controllers/learnerController.js";

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

export default router;
