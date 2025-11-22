import * as dashboardService from "../services/dashboardService.js";

export async function getDashboardStats(req, res) {
  try {
    const stats = await dashboardService.getDashboardStats();
    return res.json({ success: true, stats });
  } catch (err) {
    console.error("Error getDashboardStats:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getRecentActivity(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activity = await dashboardService.getRecentActivity(limit);
    return res.json({ success: true, activity });
  } catch (err) {
    console.error("Error getRecentActivity:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getAIProgress(req, res) {
  try {
    const progress = await dashboardService.getAIProgress();
    return res.json({ success: true, progress });
  } catch (err) {
    console.error("Error getAIProgress:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getTrafficStats(req, res) {
  try {
    const stats = await dashboardService.getTrafficStats();
    return res.json({ success: true, stats });
  } catch (err) {
    console.error("Error getTrafficStats:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getChartData(req, res) {
  try {
    const revenueTimeframe = req.query.revenue || 'month';
    const usersTimeframe = req.query.users || 'month';
    const trafficTimeframe = req.query.traffic || 'week';
    const dailyTimeframe = req.query.daily || 'week';
    const revenueOffset = parseInt(req.query.revenueOffset) || 0;
    const usersOffset = parseInt(req.query.usersOffset) || 0;
    const trafficOffset = parseInt(req.query.trafficOffset) || 0;
    const dailyOffset = parseInt(req.query.dailyOffset) || 0;
    
    const chartData = await dashboardService.getChartData(
      revenueTimeframe,
      usersTimeframe,
      trafficTimeframe,
      dailyTimeframe,
      revenueOffset,
      usersOffset,
      trafficOffset,
      dailyOffset
    );
    return res.json({ success: true, chartData });
  } catch (err) {
    console.error("Error getChartData:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

