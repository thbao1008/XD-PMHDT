import express from "express";
import {
  createReport,
  getReportSummary,
  getReports,
  searchLearnerProgress,
  updateReportStatus,
  updateLearnerNote,
  checkCanReport,
  getAllLearnersWithProgress,
  getAllMentors
} from "../controllers/reportController.js";

const router = express.Router();

// Mentor/Learner tạo report
router.post("/", createReport);

// Check if can report (24h)
router.get("/can-report", checkCanReport);

// Thống kê số lượng học viên, mentor, report theo thời gian
router.get("/summary", getReportSummary);

// Admin lấy danh sách report
router.get("/", getReports);

// Tìm kiếm tiến độ đào tạo học viên
router.get("/learner-progress", searchLearnerProgress);

// Lấy danh sách tất cả learners với progress cho admin
router.get("/learners-progress", getAllLearnersWithProgress);

// Lấy danh sách tất cả mentors cho dropdown filter
router.get("/mentors", getAllMentors);

// Cập nhật trạng thái report
router.patch("/:id/status", updateReportStatus);

// Cập nhật ghi chú learner
router.put("/learner/:id/note", updateLearnerNote);

export default router;
