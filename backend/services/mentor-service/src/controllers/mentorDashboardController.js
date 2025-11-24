// Mentor Dashboard Controller
import * as mentorDashboardService from "../services/mentorDashboardService.js";

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

export async function initializeAILearning(req, res) {
  try {
    const { mentorId } = req.params;
    
    if (!mentorId) {
      return res.status(400).json({ 
        success: false, 
        message: "Mentor ID is required" 
      });
    }

    const result = await mentorDashboardService.initializeAILearning(mentorId);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("Error initializeAILearning:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
}

export async function getAIProgress(req, res) {
  try {
    const { mentorId } = req.params;
    
    if (!mentorId) {
      return res.status(400).json({ 
        success: false, 
        message: "Mentor ID is required" 
      });
    }

    const progress = await mentorDashboardService.getAIProgress(mentorId);
    return res.json({ success: true, progress });
  } catch (err) {
    console.error("Error getAIProgress:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
}

export async function getAIActivities(req, res) {
  try {
    const { mentorId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!mentorId) {
      return res.status(400).json({ 
        success: false, 
        message: "Mentor ID is required" 
      });
    }

    const activities = await mentorDashboardService.getAIActivities(mentorId, limit);
    return res.json({ success: true, activities });
  } catch (err) {
    console.error("Error getAIActivities:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
}

