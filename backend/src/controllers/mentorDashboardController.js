// backend/src/controllers/mentorDashboardController.js
import * as mentorDashboardService from "../services/mentorDashboardService.js";

/**
 * Lấy thống kê tổng quan cho mentor dashboard
 */
export async function getDashboardStats(req, res) {
  try {
    const { mentorId } = req.params;
    
    if (!mentorId) {
      return res.status(400).json({ 
        success: false, 
        message: "Mentor ID is required" 
      });
    }

    const stats = await mentorDashboardService.getMentorDashboardStats(mentorId);
    return res.json({ success: true, stats });
  } catch (err) {
    console.error("Error getDashboardStats:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
}

/**
 * Lấy danh sách bài challenge mới cần chấm
 */
export async function getPendingSubmissions(req, res) {
  try {
    const { mentorId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!mentorId) {
      return res.status(400).json({ 
        success: false, 
        message: "Mentor ID is required" 
      });
    }

    const submissions = await mentorDashboardService.getPendingSubmissions(mentorId, limit);
    return res.json({ success: true, submissions });
  } catch (err) {
    console.error("Error getPendingSubmissions:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
}

/**
 * Lấy lịch dạy của mentor
 */
export async function getSchedules(req, res) {
  try {
    const { mentorId } = req.params;
    const startDate = req.query.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const endDate = req.query.endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    if (!mentorId) {
      return res.status(400).json({ 
        success: false, 
        message: "Mentor ID is required" 
      });
    }

    const schedules = await mentorDashboardService.getMentorSchedules(mentorId, startDate, endDate);
    return res.json({ success: true, schedules });
  } catch (err) {
    console.error("Error getSchedules:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
}

