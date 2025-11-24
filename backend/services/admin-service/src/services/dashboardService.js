import pool from "../config/db.js";

// Lấy thống kê tổng quan cho dashboard
export async function getDashboardStats() {
  try {
    // Tổng số học viên
    const learnersResult = await pool.query(`SELECT COUNT(*) as count FROM learners`);
    const totalLearners = parseInt(learnersResult.rows[0].count) || 0;

    // Tổng số giảng viên
    const mentorsResult = await pool.query(`SELECT COUNT(*) as count FROM mentors`);
    const totalMentors = parseInt(mentorsResult.rows[0].count) || 0;

    // Tổng doanh thu: tính TẤT CẢ purchases khi được tạo (không phụ thuộc vào status)
    // Doanh thu = tổng giá trị gói tại thời điểm purchase được tạo
    const revenueResult = await pool.query(`
      SELECT COALESCE(SUM(p.price), 0) as total_revenue
      FROM purchases pur
      JOIN packages p ON pur.package_id = p.id
      -- Không filter theo status: tính tất cả purchases khi được tạo
    `);
    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue) || 0;

    // Tổng số gói dịch vụ
    const packagesResult = await pool.query(`SELECT COUNT(*) as count FROM packages`);
    const totalPackages = parseInt(packagesResult.rows[0].count) || 0;

    // Tổng số challenge
    const challengesResult = await pool.query(`SELECT COUNT(*) as count FROM challenges`);
    const totalChallenges = parseInt(challengesResult.rows[0].count) || 0;

    // Tổng số người dùng (tất cả, không filter)
    const usersResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users
    `);
    const totalActiveUsers = parseInt(usersResult.rows[0].count) || 0;

    return {
      totalLearners,
      totalMentors,
      totalRevenue,
      totalPackages,
      totalChallenges,
      totalActiveUsers
    };
  } catch (err) {
    console.error("Error getDashboardStats:", err);
    throw err;
  }
}

// Lấy tần suất hoạt động của users (ai hoạt động nhiều nhất, ít nhất)
export async function getRecentActivity(limit = 10) {
  try {
    // Tần suất hoạt động của học viên (speaking practice, challenge submissions)
    const learnerActivity = await pool.query(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email,
        'learner' as actor_type,
        COUNT(DISTINCT spr.id) as practice_count,
        COUNT(DISTINCT s.id) as submission_count,
        (COUNT(DISTINCT spr.id) + COUNT(DISTINCT s.id)) as total_activities,
        MAX(GREATEST(
          COALESCE(spr.created_at, '1970-01-01'::timestamp),
          COALESCE(s.created_at, '1970-01-01'::timestamp)
        )) as last_activity
      FROM users u
      JOIN learners l ON u.id = l.user_id
      LEFT JOIN speaking_practice_sessions sps ON l.id = sps.learner_id
      LEFT JOIN speaking_practice_rounds spr ON sps.id = spr.session_id 
        AND spr.created_at >= NOW() - INTERVAL '7 days'
      LEFT JOIN submissions s ON l.id = s.learner_id 
        AND s.created_at >= NOW() - INTERVAL '7 days'
      WHERE u.role = 'learner'
      GROUP BY u.id, u.name, u.email
      HAVING (COUNT(DISTINCT spr.id) + COUNT(DISTINCT s.id)) > 0
      ORDER BY total_activities DESC, last_activity DESC
      LIMIT $1
    `, [Math.floor(limit / 2)]);

    // Tần suất hoạt động của mentor (feedbacks, schedules)
    const mentorActivity = await pool.query(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email,
        'mentor' as actor_type,
        COUNT(DISTINCT f.id) as feedback_count,
        COUNT(DISTINCT sch.id) as schedule_count,
        (COUNT(DISTINCT f.id) + COUNT(DISTINCT sch.id)) as total_activities,
        MAX(GREATEST(
          COALESCE(f.created_at, '1970-01-01'::timestamp),
          COALESCE(sch.created_at, '1970-01-01'::timestamp)
        )) as last_activity
      FROM users u
      JOIN mentors m ON u.id = m.user_id
      LEFT JOIN feedbacks f ON m.id = f.mentor_id 
        AND f.created_at >= NOW() - INTERVAL '7 days'
      LEFT JOIN schedules sch ON m.id = sch.mentor_id 
        AND sch.created_at >= NOW() - INTERVAL '7 days'
      WHERE u.role = 'mentor'
      GROUP BY u.id, u.name, u.email
      HAVING (COUNT(DISTINCT f.id) + COUNT(DISTINCT sch.id)) > 0
      ORDER BY total_activities DESC, last_activity DESC
      LIMIT $1
    `, [Math.floor(limit / 2)]);

    // Kết hợp và sắp xếp theo tần suất (nhiều nhất -> ít nhất)
    const allActivity = [
      ...learnerActivity.rows.map(r => ({
        user_id: r.user_id,
        user_name: r.user_name,
        email: r.email,
        actor_type: 'learner',
        activity_count: parseInt(r.total_activities) || 0,
        practice_count: parseInt(r.practice_count) || 0,
        submission_count: parseInt(r.submission_count) || 0,
        last_activity: r.last_activity
      })),
      ...mentorActivity.rows.map(r => ({
        user_id: r.user_id,
        user_name: r.user_name,
        email: r.email,
        actor_type: 'mentor',
        activity_count: parseInt(r.total_activities) || 0,
        feedback_count: parseInt(r.feedback_count) || 0,
        schedule_count: parseInt(r.schedule_count) || 0,
        last_activity: r.last_activity
      }))
    ].sort((a, b) => {
      // Sắp xếp theo tần suất (nhiều nhất -> ít nhất)
      if (b.activity_count !== a.activity_count) {
        return b.activity_count - a.activity_count;
      }
      // Nếu bằng nhau, sắp xếp theo thời gian hoạt động gần nhất
      return new Date(b.last_activity) - new Date(a.last_activity);
    }).slice(0, limit);

    return allActivity;
  } catch (err) {
    console.error("Error getRecentActivity:", err);
    throw err;
  }
}

// Lấy traffic stats
export async function getTrafficStats() {
  try {
    // Tổng traffic (từ daily_traffic_stats)
    const totalTrafficResult = await pool.query(`
      SELECT COALESCE(SUM(total_requests), 0) as total
      FROM daily_traffic_stats
    `);
    const totalTraffic = parseInt(totalTrafficResult.rows[0].total) || 0;

    // Số người đang online (trong 5 phút gần đây)
    // Đếm DISTINCT user_id (nếu có) + số anonymous sessions (user_id IS NULL)
    const onlineUsersResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as logged_in_users,
        COUNT(*) FILTER (WHERE user_id IS NULL) as anonymous_sessions
      FROM online_users
      WHERE last_activity > NOW() - INTERVAL '5 minutes'
    `);
    const loggedInUsers = parseInt(onlineUsersResult.rows[0].logged_in_users) || 0;
    const anonymousSessions = parseInt(onlineUsersResult.rows[0].anonymous_sessions) || 0;
    const onlineUsers = loggedInUsers + anonymousSessions;

    // Traffic hôm nay
    const today = new Date().toISOString().split('T')[0];
    const todayTrafficResult = await pool.query(`
      SELECT total_requests, unique_visitors
      FROM daily_traffic_stats
      WHERE date = $1
    `, [today]);
    const todayStats = todayTrafficResult.rows[0] || { total_requests: 0, unique_visitors: 0 };

    // Traffic 7 ngày qua (lấy dữ liệu chi tiết cho biểu đồ)
    const weekTrafficResult = await pool.query(`
      SELECT 
        date,
        unique_visitors,
        total_requests
      FROM daily_traffic_stats
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY date ASC
    `);
    const weekData = weekTrafficResult.rows || [];
    const weekTraffic = weekData.reduce((sum, day) => sum + (parseInt(day.total_requests) || 0), 0);
    const weekUniqueVisitors = weekData.reduce((sum, day) => sum + (parseInt(day.unique_visitors) || 0), 0);

    return {
      totalTraffic,
      onlineUsers,
      todayTraffic: parseInt(todayStats.total_requests) || 0,
      todayUniqueVisitors: parseInt(todayStats.unique_visitors) || 0,
      weekTraffic,
      weekUniqueVisitors,
      weekData: weekData.map(row => ({
        date: row.date,
        visitors: parseInt(row.unique_visitors) || 0,
        requests: parseInt(row.total_requests) || 0
      }))
    };
  } catch (err) {
    console.error("Error getTrafficStats:", err);
    throw err;
  }
}

// Lấy tiến trình AI hiện tại
export async function getAIProgress() {
  try {
    // Số lượng training samples
    const trainingSamplesResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM challenge_creator_training
    `);
    const trainingSamples = parseInt(trainingSamplesResult.rows[0].count) || 0;

    // Số lượng AI reports đã tạo
    const aiReportsResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM ai_reports
    `);
    const aiReports = parseInt(aiReportsResult.rows[0].count) || 0;

    // Accuracy/Performance (giả sử có bảng lưu kết quả training)
    // Nếu không có, trả về null
    let accuracy = null;
    try {
      const accuracyResult = await pool.query(`
        SELECT accuracy 
        FROM ai_model_performance 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      if (accuracyResult.rows.length > 0) {
        accuracy = parseFloat(accuracyResult.rows[0].accuracy);
      }
    } catch (e) {
      // Bảng không tồn tại, bỏ qua
    }

    return {
      trainingSamples,
      aiReports,
      accuracy,
      status: accuracy ? (accuracy >= 0.8 ? 'excellent' : accuracy >= 0.6 ? 'good' : 'training') : 'initializing'
    };
  } catch (err) {
    console.error("Error getAIProgress:", err);
    throw err;
  }
}

// Lấy dữ liệu biểu đồ cho Dashboard với timeframe và period offset
export async function getChartData(
  revenueTimeframe = 'month', 
  usersTimeframe = 'month', 
  trafficTimeframe = 'week', 
  dailyTimeframe = 'week',
  revenueOffset = 0,
  usersOffset = 0,
  trafficOffset = 0,
  dailyOffset = 0
) {
  try {
    // Helper function để xác định interval và trunc với offset
    const getTimeframeConfig = (tf, offset = 0) => {
      let baseInterval = '';
      let trunc = '';
      
      switch(tf) {
        case 'year':
          trunc = 'year';
          baseInterval = '2 years';
          break;
        case 'month':
          trunc = 'month';
          baseInterval = '12 months';
          break;
        case 'week':
          trunc = 'week';
          baseInterval = '12 weeks';
          break;
        default:
          trunc = 'month';
          baseInterval = '6 months';
      }
      
      // Tính toán date range dựa trên offset
      // offset = 0: period hiện tại
      // offset < 0: lùi về quá khứ
      // offset > 0: tiến tới tương lai
      let startDate = '';
      let endDate = '';
      
      if (tf === 'week') {
        // Tính thứ 2 của tuần hiện tại, sau đó áp dụng offset
        // DATE_TRUNC('week', date) trả về thứ 2 của tuần đó
        startDate = `(DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '${offset} weeks')::date`;
        endDate = `((DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '${offset} weeks') + INTERVAL '6 days')::date`;
      } else if (tf === 'month') {
        // Tính tháng hiện tại (hoặc tháng offset)
        startDate = `(DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '${offset} months')::date`;
        endDate = `((DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '${offset} months') + INTERVAL '1 month' - INTERVAL '1 day')::date`;
      } else if (tf === 'year') {
        // Tính năm hiện tại (hoặc năm offset)
        startDate = `(DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '${offset} years')::date`;
        endDate = `((DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '${offset} years') + INTERVAL '1 year' - INTERVAL '1 day')::date`;
      } else {
        // Fallback: dùng baseInterval
        startDate = `(CURRENT_DATE - INTERVAL '${baseInterval}')::date`;
        endDate = `CURRENT_DATE`;
      }
      
      return { 
        trunc, 
        interval: baseInterval, 
        startDate, 
        endDate,
        label: tf === 'year' ? 'năm' : tf === 'month' ? 'tháng' : 'tuần' 
      };
    };

    const revenueConfig = getTimeframeConfig(revenueTimeframe, revenueOffset);
    const usersConfig = getTimeframeConfig(usersTimeframe, usersOffset);
    const trafficConfig = getTimeframeConfig(trafficTimeframe, trafficOffset);
    const dailyConfig = getTimeframeConfig(dailyTimeframe, dailyOffset);

    // Traffic theo timeframe với offset
    let trafficQuery = '';
    if (trafficTimeframe === 'week') {
      trafficQuery = `
        SELECT 
          date,
          COALESCE(unique_visitors, 0) as visitors,
          COALESCE(total_requests, 0) as requests
        FROM daily_traffic_stats
        WHERE date >= ${trafficConfig.startDate}
          AND date <= ${trafficConfig.endDate}
        ORDER BY date ASC
      `;
    } else {
      trafficQuery = `
        SELECT 
          DATE_TRUNC('${trafficConfig.trunc}', date) as period,
          SUM(COALESCE(unique_visitors, 0)) as visitors,
          SUM(COALESCE(total_requests, 0)) as requests
        FROM daily_traffic_stats
        WHERE date >= ${trafficConfig.startDate}
          AND date <= ${trafficConfig.endDate}
        GROUP BY DATE_TRUNC('${trafficConfig.trunc}', date)
        ORDER BY period ASC
      `;
    }
    const traffic7Days = await pool.query(trafficQuery);

    // Revenue theo timeframe với offset
    // Tính tất cả purchases khi được tạo (không filter theo status)
    const revenue6Months = await pool.query(`
      SELECT 
        DATE_TRUNC('${revenueConfig.trunc}', pur.created_at) as period,
        COALESCE(SUM(p.price), 0) as revenue
      FROM purchases pur
      JOIN packages p ON pur.package_id = p.id
      WHERE pur.created_at >= ${revenueConfig.startDate}::timestamp
        AND pur.created_at < (${revenueConfig.endDate} + INTERVAL '1 day')::timestamp
      GROUP BY DATE_TRUNC('${revenueConfig.trunc}', pur.created_at)
      ORDER BY period ASC
    `);

    // User growth theo timeframe với offset
    const userGrowth = await pool.query(`
      SELECT 
        DATE_TRUNC('${usersConfig.trunc}', created_at) as period,
        COUNT(*) FILTER (WHERE role = 'learner') as learners,
        COUNT(*) FILTER (WHERE role = 'mentor') as mentors
      FROM users
      WHERE created_at >= ${usersConfig.startDate}::timestamp
        AND created_at < (${usersConfig.endDate} + INTERVAL '1 day')::timestamp
      GROUP BY DATE_TRUNC('${usersConfig.trunc}', created_at)
      ORDER BY period ASC
    `);

    // Daily Revenue theo timeframe với offset
    // Tính tất cả purchases khi được tạo (không filter theo status)
    let dailyRevenueQuery = '';
    if (dailyTimeframe === 'week') {
      dailyRevenueQuery = `
        SELECT 
          DATE(pur.created_at) as period,
          COALESCE(SUM(p.price), 0) as revenue
        FROM purchases pur
        JOIN packages p ON pur.package_id = p.id
        WHERE pur.created_at >= ${dailyConfig.startDate}::timestamp
          AND pur.created_at < (${dailyConfig.endDate} + INTERVAL '1 day')::timestamp
        GROUP BY DATE(pur.created_at)
        ORDER BY period ASC
      `;
    } else {
      dailyRevenueQuery = `
        SELECT 
          DATE_TRUNC('${dailyConfig.trunc}', pur.created_at) as period,
          COALESCE(SUM(p.price), 0) as revenue
        FROM purchases pur
        JOIN packages p ON pur.package_id = p.id
        WHERE pur.created_at >= ${dailyConfig.startDate}::timestamp
          AND pur.created_at < (${dailyConfig.endDate} + INTERVAL '1 day')::timestamp
        GROUP BY DATE_TRUNC('${dailyConfig.trunc}', pur.created_at)
        ORDER BY period ASC
      `;
    }
    const dailyRevenue = await pool.query(dailyRevenueQuery);

    // Package Distribution (Donut chart) - số lượng purchase theo package
    const packageDistribution = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.price,
        COUNT(pur.id) as purchase_count,
        COALESCE(SUM(p.price), 0) as total_revenue
      FROM packages p
      LEFT JOIN purchases pur ON p.id = pur.package_id 
        AND pur.status IN ('active', 'expired')
      GROUP BY p.id, p.name, p.price
      ORDER BY purchase_count DESC
    `);

    // Revenue by Package (Horizontal Bar chart) - Top 10 packages
    const revenueByPackage = await pool.query(`
      SELECT 
        p.id,
        p.name,
        COALESCE(SUM(p.price), 0) as total_revenue,
        COUNT(pur.id) as purchase_count
      FROM packages p
      LEFT JOIN purchases pur ON p.id = pur.package_id 
        AND pur.status IN ('active', 'expired')
      GROUP BY p.id, p.name
      HAVING COUNT(pur.id) > 0
      ORDER BY total_revenue DESC
      LIMIT 10
    `);

    // User Status Breakdown (Stacked Bar chart)
    const userStatusBreakdown = await pool.query(`
      SELECT 
        role,
        status,
        COUNT(*) as count
      FROM users
      GROUP BY role, status
      ORDER BY role, status
    `);

    // Purchase Status Distribution (Pie chart)
    const purchaseStatusDistribution = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(p.price), 0) as revenue
      FROM purchases pur
      JOIN packages p ON pur.package_id = p.id
      GROUP BY status
      ORDER BY count DESC
    `);

    // Growth Metrics (Month-over-month)
    const growthMetrics = await pool.query(`
      WITH monthly_stats AS (
        SELECT 
          DATE_TRUNC('month', pur.created_at) as month,
          COALESCE(SUM(p.price), 0) as revenue,
          COUNT(DISTINCT l.user_id) as new_customers
        FROM purchases pur
        JOIN packages p ON pur.package_id = p.id
        JOIN learners l ON pur.learner_id = l.id
        WHERE pur.created_at >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', pur.created_at)
      ),
      monthly_users AS (
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) FILTER (WHERE role = 'learner') as new_learners,
          COUNT(*) FILTER (WHERE role = 'mentor') as new_mentors
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
      )
      SELECT 
        COALESCE(ms.month, mu.month) as month,
        COALESCE(ms.revenue, 0) as revenue,
        COALESCE(ms.new_customers, 0) as new_customers,
        COALESCE(mu.new_learners, 0) as new_learners,
        COALESCE(mu.new_mentors, 0) as new_mentors
      FROM monthly_stats ms
      FULL OUTER JOIN monthly_users mu ON ms.month = mu.month
      ORDER BY month ASC
    `);

    return {
      traffic7Days: traffic7Days.rows.map(row => ({
        date: row.date || row.period,
        period: row.period || row.date,
        visitors: parseInt(row.visitors) || 0,
        requests: parseInt(row.requests) || 0
      })),
      revenue6Months: revenue6Months.rows.map(row => ({
        period: row.period,
        revenue: parseFloat(row.revenue) || 0
      })),
      userGrowth: userGrowth.rows.map(row => ({
        period: row.period,
        learners: parseInt(row.learners) || 0,
        mentors: parseInt(row.mentors) || 0
      })),
      dailyRevenue: dailyRevenue.rows.map(row => ({
        date: row.period,
        period: row.period,
        revenue: parseFloat(row.revenue) || 0
      })),
      packageDistribution: packageDistribution.rows.map(row => ({
        id: row.id,
        name: row.name,
        price: parseFloat(row.price) || 0,
        purchaseCount: parseInt(row.purchase_count) || 0,
        totalRevenue: parseFloat(row.total_revenue) || 0
      })),
      revenueByPackage: revenueByPackage.rows.map(row => ({
        id: row.id,
        name: row.name,
        totalRevenue: parseFloat(row.total_revenue) || 0,
        purchaseCount: parseInt(row.purchase_count) || 0
      })),
      userStatusBreakdown: userStatusBreakdown.rows.map(row => ({
        role: row.role,
        status: row.status,
        count: parseInt(row.count) || 0
      })),
      purchaseStatusDistribution: purchaseStatusDistribution.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count) || 0,
        revenue: parseFloat(row.revenue) || 0
      })),
      growthMetrics: growthMetrics.rows.map(row => ({
        month: row.month,
        revenue: parseFloat(row.revenue) || 0,
        newCustomers: parseInt(row.new_customers) || 0,
        newLearners: parseInt(row.new_learners) || 0,
        newMentors: parseInt(row.new_mentors) || 0
      }))
    };
  } catch (err) {
    console.error("Error getChartData:", err);
    throw err;
  }
}

