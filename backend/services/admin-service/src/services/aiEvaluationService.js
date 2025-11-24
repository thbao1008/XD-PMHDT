/**
 * AI Evaluation Service
 * Đánh giá hệ thống và đưa ra gợi ý cải tiến
 */

import pool from "../config/db.js";

/**
 * Thu thập dữ liệu hệ thống để đánh giá
 */
async function collectSystemData() {
  try {
    // Thu thập các metrics quan trọng
    const [
      userStats,
      activityStats,
      performanceStats,
      engagementStats,
      revenueStats
    ] = await Promise.all([
      // User statistics
      // Note: last_login không tồn tại, dùng user_sessions để tính active_7d
      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE u.role = 'learner') as total_learners,
          COUNT(*) FILTER (WHERE u.role = 'mentor') as total_mentors,
          COUNT(*) FILTER (WHERE u.status = 'active') as active_users,
          COUNT(*) FILTER (WHERE u.created_at > NOW() - INTERVAL '30 days') as new_users_30d,
          COALESCE((
            SELECT COUNT(DISTINCT user_id) 
            FROM user_sessions 
            WHERE last_activity > NOW() - INTERVAL '7 days' 
              AND is_active = TRUE
          ), 0) as active_7d
        FROM users u
      `),
      
      // Activity statistics
      pool.query(`
        SELECT 
          COUNT(*) as total_challenges,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as challenges_30d,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as challenges_7d
        FROM challenges
      `),
      
      // Performance statistics
      // Lấy điểm từ ai_reports hoặc feedbacks (ưu tiên feedbacks)
      pool.query(`
        SELECT 
          AVG(COALESCE(f.final_score, ar.overall_score)) as avg_challenge_score,
          COUNT(DISTINCT s.id) as total_submissions,
          COUNT(DISTINCT s.id) FILTER (WHERE COALESCE(f.final_score, ar.overall_score) >= 80) as high_scores,
          COUNT(DISTINCT s.id) FILTER (WHERE s.created_at > NOW() - INTERVAL '30 days') as submissions_30d
        FROM submissions s
        LEFT JOIN ai_reports ar ON ar.submission_id = s.id
        LEFT JOIN feedbacks f ON f.submission_id = s.id
      `),
      
      // Engagement statistics
      pool.query(`
        SELECT 
          COUNT(DISTINCT session_id) as total_story_sessions,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as sessions_30d,
          COUNT(*) as total_messages
        FROM story_conversations
      `),
      
      // Revenue statistics
      // Tính doanh thu từ TẤT CẢ purchases khi được tạo (không phụ thuộc vào status)
      // Doanh thu = tổng giá trị gói tại thời điểm purchase được tạo
      // Join với packages để lấy price (purchases không có cột amount)
      pool.query(`
        SELECT 
          COUNT(*) as total_purchases,
          COALESCE(SUM(pkg.price), 0) as total_revenue,
          COUNT(*) FILTER (WHERE p.created_at > NOW() - INTERVAL '30 days') as purchases_30d,
          COALESCE(SUM(pkg.price) FILTER (WHERE p.created_at > NOW() - INTERVAL '30 days'), 0) as revenue_30d,
          COALESCE(AVG(pkg.price), 0) as avg_purchase_amount
        FROM purchases p
        JOIN packages pkg ON p.package_id = pkg.id
        -- Không filter theo status: tính tất cả purchases khi được tạo
      `)
    ]);

    return {
      users: userStats.rows[0] || {},
      activity: activityStats.rows[0] || {},
      performance: performanceStats.rows[0] || {},
      engagement: engagementStats.rows[0] || {},
      revenue: revenueStats.rows[0] || {}
    };
  } catch (err) {
    console.error("❌ Error collecting system data:", err);
    throw err;
  }
}

/**
 * Phân tích và đánh giá hệ thống
 */
function analyzeSystem(data) {
  const analysis = {
    overallScore: 0,
    categories: {},
    issues: [],
    strengths: [],
    suggestions: []
  };

  // Đánh giá User Growth
  const userGrowth = {
    score: 0,
    issues: [],
    strengths: [],
    suggestions: []
  };
  
  const totalUsers = parseInt(data.users.total_learners || 0) + parseInt(data.users.total_mentors || 0);
  const newUsers30d = parseInt(data.users.new_users_30d || 0);
  const active7d = parseInt(data.users.active_7d || 0);
  const activeRate = totalUsers > 0 ? (active7d / totalUsers) * 100 : 0;

  if (newUsers30d > 50) {
    userGrowth.score += 30;
    userGrowth.strengths.push("Tăng trưởng người dùng mới tốt");
  } else if (newUsers30d < 10) {
    userGrowth.score += 10;
    userGrowth.issues.push("Tăng trưởng người dùng mới thấp");
    userGrowth.suggestions.push("Tăng cường marketing và quảng cáo để thu hút người dùng mới");
  } else {
    userGrowth.score += 20;
  }

  if (activeRate > 40) {
    userGrowth.score += 30;
    userGrowth.strengths.push("Tỷ lệ người dùng hoạt động cao");
  } else if (activeRate < 20) {
    userGrowth.score += 10;
    userGrowth.issues.push("Tỷ lệ người dùng hoạt động thấp");
    userGrowth.suggestions.push("Gửi email nhắc nhở, tạo thử thách hàng tuần để tăng engagement");
  } else {
    userGrowth.score += 20;
  }

  analysis.categories.userGrowth = userGrowth;
  analysis.overallScore += userGrowth.score * 0.25;

  // Đánh giá Performance
  const performance = {
    score: 0,
    issues: [],
    strengths: [],
    suggestions: []
  };

  const avgScore = parseFloat(data.performance.avg_challenge_score || 0);
  const highScoreRate = data.performance.total_submissions > 0 
    ? (parseInt(data.performance.high_scores || 0) / parseInt(data.performance.total_submissions || 1)) * 100 
    : 0;

  if (avgScore >= 75) {
    performance.score += 30;
    performance.strengths.push("Điểm trung bình cao, người dùng học tốt");
  } else if (avgScore < 60) {
    performance.score += 10;
    performance.issues.push("Điểm trung bình thấp");
    performance.suggestions.push("Cải thiện chất lượng bài học, thêm hướng dẫn chi tiết hơn");
  } else {
    performance.score += 20;
  }

  if (highScoreRate >= 50) {
    performance.score += 20;
    performance.strengths.push("Nhiều người dùng đạt điểm cao");
  } else if (highScoreRate < 30) {
    performance.score += 10;
    performance.issues.push("Tỷ lệ điểm cao thấp");
    performance.suggestions.push("Điều chỉnh độ khó bài tập, thêm bài tập luyện tập");
  } else {
    performance.score += 15;
  }

  const submissions30d = parseInt(data.performance.submissions_30d || 0);
  if (submissions30d > 100) {
    performance.score += 20;
    performance.strengths.push("Nhiều bài nộp trong tháng");
  } else if (submissions30d < 30) {
    performance.score += 10;
    performance.issues.push("Ít bài nộp trong tháng");
    performance.suggestions.push("Tạo thử thách hàng tuần, thêm phần thưởng để khuyến khích");
  } else {
    performance.score += 15;
  }

  analysis.categories.performance = performance;
  analysis.overallScore += performance.score * 0.25;

  // Đánh giá Engagement
  const engagement = {
    score: 0,
    issues: [],
    strengths: [],
    suggestions: []
  };

  const sessions30d = parseInt(data.engagement.sessions_30d || 0);
  const totalSessions = parseInt(data.engagement.total_story_sessions || 0);
  const avgMessagesPerSession = totalSessions > 0 
    ? parseInt(data.engagement.total_messages || 0) / totalSessions 
    : 0;

  if (sessions30d > 50) {
    engagement.score += 30;
    engagement.strengths.push("Nhiều phiên tương tác với AI");
  } else if (sessions30d < 10) {
    engagement.score += 10;
    engagement.issues.push("Ít người dùng tương tác với AI");
    engagement.suggestions.push("Quảng bá tính năng 'Tell me your story', tạo hướng dẫn sử dụng");
  } else {
    engagement.score += 20;
  }

  if (avgMessagesPerSession >= 5) {
    engagement.score += 20;
    engagement.strengths.push("Người dùng tương tác sâu với AI");
  } else if (avgMessagesPerSession < 2) {
    engagement.score += 10;
    engagement.issues.push("Tương tác với AI ngắn");
    engagement.suggestions.push("Cải thiện chất lượng phản hồi AI, thêm câu hỏi gợi ý");
  } else {
    engagement.score += 15;
  }

  analysis.categories.engagement = engagement;
  analysis.overallScore += engagement.score * 0.25;

  // Đánh giá Revenue
  const revenue = {
    score: 0,
    issues: [],
    strengths: [],
    suggestions: []
  };

  const revenue30d = parseFloat(data.revenue.revenue_30d || 0);
  const purchases30d = parseInt(data.revenue.purchases_30d || 0);
  const avgPurchase = parseFloat(data.revenue.avg_purchase_amount || 0);
  const conversionRate = totalUsers > 0 
    ? (parseInt(data.revenue.total_purchases || 0) / totalUsers) * 100 
    : 0;

  if (revenue30d > 10000000) { // > 10M VND
    revenue.score += 30;
    revenue.strengths.push("Doanh thu tháng tốt");
  } else if (revenue30d < 1000000) { // < 1M VND
    revenue.score += 10;
    revenue.issues.push("Doanh thu tháng thấp");
    revenue.suggestions.push("Tạo gói ưu đãi, chạy chiến dịch khuyến mãi");
  } else {
    revenue.score += 20;
  }

  if (purchases30d > 20) {
    revenue.score += 20;
    revenue.strengths.push("Nhiều giao dịch trong tháng");
  } else if (purchases30d < 5) {
    revenue.score += 10;
    revenue.issues.push("Ít giao dịch trong tháng");
    revenue.suggestions.push("Cải thiện landing page, thêm testimonials, tạo trial miễn phí");
  } else {
    revenue.score += 15;
  }

  if (conversionRate >= 10) {
    revenue.score += 20;
    revenue.strengths.push("Tỷ lệ chuyển đổi tốt");
  } else if (conversionRate < 3) {
    revenue.score += 10;
    revenue.issues.push("Tỷ lệ chuyển đổi thấp");
    revenue.suggestions.push("Tối ưu pricing, thêm giá trị cho gói premium");
  } else {
    revenue.score += 15;
  }

  analysis.categories.revenue = revenue;
  analysis.overallScore += revenue.score * 0.25;

  // Tổng hợp issues, strengths, suggestions
  Object.values(analysis.categories).forEach(category => {
    analysis.issues.push(...category.issues);
    analysis.strengths.push(...category.strengths);
    analysis.suggestions.push(...category.suggestions);
  });

  // Đánh giá tổng thể
  if (analysis.overallScore >= 80) {
    analysis.overallStatus = "excellent";
    analysis.overallMessage = "Hệ thống đang hoạt động xuất sắc!";
  } else if (analysis.overallScore >= 60) {
    analysis.overallStatus = "good";
    analysis.overallMessage = "Hệ thống hoạt động tốt, có thể cải thiện thêm";
  } else if (analysis.overallScore >= 40) {
    analysis.overallStatus = "needs_improvement";
    analysis.overallMessage = "Hệ thống cần được cải thiện";
  } else {
    analysis.overallStatus = "critical";
    analysis.overallMessage = "Hệ thống cần được chú ý ngay lập tức";
  }

  return analysis;
}

/**
 * Tạo báo cáo đánh giá hệ thống
 */
export async function generateSystemEvaluation() {
  try {
    const systemData = await collectSystemData();
    const analysis = analyzeSystem(systemData);
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: systemData,
      analysis: analysis
    };
  } catch (err) {
    console.error("❌ Error generating system evaluation:", err);
    throw err;
  }
}

