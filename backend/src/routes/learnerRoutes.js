import express from "express";
import {
  getAll,
  getById,
  getPurchases,
  create,
  update,
  remove,
  getLatestPurchase,
  getMentorByLearnerId,
  getLearnerByUserId,
  downloadLearnerResource
} from "../controllers/learnerController.js";

const router = express.Router();

// ========== Learners CRUD ==========
router.get("/", getAll);                // Lấy danh sách learners
router.get("/:id", getById);            // Lấy learner theo ID
router.post("/", create);               // Tạo learner mới
router.put("/:id", update);             // Cập nhật learner
router.delete("/:id", remove);          // Xóa learner

// ========== Purchases ==========
router.get("/:id/purchases", getPurchases);       // Lấy toàn bộ purchases của learner
router.get("/:id/latest-purchase", getLatestPurchase); // Lấy purchase mới nhất

// ========== Mentor ==========
router.get("/:id/mentor", getMentorByLearnerId);  // Lấy mentor của learner
router.get("/by-user/:userId", getLearnerByUserId); // Lấy learner theo userId

router.get("/:learnerId/resource/:resourceId/download", downloadLearnerResource);
export default router;
