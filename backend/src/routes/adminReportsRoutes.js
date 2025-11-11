import express from "express";
import {
  createReport,         
  getReportSummary,   
  getReports,
  searchLearnerProgress,
  updateReportStatus
} from "../controllers/reportController.js";

const router = express.Router();

// Mentor/Learner tạo report
router.post("/reports", createReport);

// Thống kê số lượng học viên, mentor, report theo thời gian
router.get("/reports/summary", getReportSummary);

// Admin lấy danh sách report
router.get("/reports", getReports);

// Tìm kiếm tiến độ đào tạo học viên
router.get("/reports/learner-progress", searchLearnerProgress);

// PUT /api/reports/:id/status
router.put("/reports/:id/status", updateReportStatus);

export default router;
