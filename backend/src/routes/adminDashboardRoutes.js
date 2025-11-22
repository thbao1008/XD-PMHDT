import express from "express";
import {
  getDashboardStats,
  getRecentActivity,
  getAIProgress,
  getTrafficStats,
  getChartData
} from "../controllers/dashboardController.js";

const router = express.Router();

// Lấy thống kê tổng quan
router.get("/stats", getDashboardStats);

// Lấy activity gần đây
router.get("/activity", getRecentActivity);

// Lấy tiến trình AI
router.get("/ai-progress", getAIProgress);

// Lấy traffic stats
router.get("/traffic", getTrafficStats);

// Lấy dữ liệu biểu đồ
router.get("/charts", getChartData);

export default router;

