// backend/src/services/speakingPracticeDashboardService.js
import pool from "../config/db.js";

/**
 * Lấy hoạt động gần nhất của học viên cụ thể (speaking practice và scenario)
 * Group theo ngày, hiển thị số lần luyện tập và điểm cao nhất mỗi ngày
 * Hiển thị tất cả 7 ngày trong tuần (từ thứ 2 đến chủ nhật)
 * - Ngày đã qua không làm: điểm = 0
 * - Ngày chưa đến: không có điểm (null)
 */
export async function getRecentActivities(learnerId, limit = 10) {
  try {
    const weekStart = getWeekStart(); // 00:00:00 thứ 2
    const weekEnd = getWeekEnd(); // 23:59:59 chủ nhật
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);
    
    // Debug log để kiểm tra (format theo local timezone để tránh vấn đề UTC)
    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    console.log("📅 getRecentActivities - Week start:", formatLocalDate(weekStart), "Week end:", formatLocalDate(weekEnd));

    // Tính số ngày đã qua trong tuần (từ thứ 2 đến hôm nay)
    const daysPassed = Math.floor((today - weekStart) / (1000 * 60 * 60 * 24)) + 1;

    // Lấy điểm cao nhất mỗi ngày trong tuần (từ 00:00 thứ 2 đến 23:59:59 chủ nhật)
    const result = await pool.query(`
      SELECT 
        DATE(ph.practice_date) as practice_day,
        COUNT(*) as total_sessions,
        MAX(ph.average_score) as max_score_per_day,
        MIN(ph.practice_date) as first_session_time,
        MAX(ph.practice_date) as last_session_time
      FROM practice_history ph
      WHERE ph.learner_id = $1
        AND ph.practice_type IN ('speaking_practice', 'scenario')
        AND ph.average_score IS NOT NULL
        AND ph.practice_date >= $2
        AND ph.practice_date <= $3
      GROUP BY DATE(ph.practice_date)
      ORDER BY practice_day DESC
    `, [learnerId, weekStart, weekEnd]);

    // Tạo map điểm theo ngày
    const scoreMap = {};
    result.rows.forEach(row => {
      // Parse date từ database (có thể là Date object hoặc string)
      // QUAN TRỌNG: Phải dùng local date để tránh vấn đề timezone
      let dayKey;
      if (row.practice_day instanceof Date) {
        // Nếu là Date object, format theo local timezone
        const year = row.practice_day.getFullYear();
        const month = String(row.practice_day.getMonth() + 1).padStart(2, '0');
        const day = String(row.practice_day.getDate()).padStart(2, '0');
        dayKey = `${year}-${month}-${day}`;
      } else {
        // Nếu là string (từ DATE() function của PostgreSQL), dùng trực tiếp
        // PostgreSQL DATE() trả về string format 'YYYY-MM-DD'
        dayKey = row.practice_day;
      }
      scoreMap[dayKey] = {
        total_sessions: parseInt(row.total_sessions || 0),
        max_score: Math.round(row.max_score_per_day || 0)
      };
    });

    // Tạo danh sách tất cả 7 ngày trong tuần (từ thứ 2 đến chủ nhật, mới nhất trước)
    // Tuần: Thứ 2 (i=0) -> Thứ 3 (i=1) -> ... -> Chủ nhật (i=6)
    // Vòng lặp từ i=6 (chủ nhật) về i=0 (thứ 2) để hiển thị mới nhất trước
    const activities = [];
    for (let i = 6; i >= 0; i--) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(weekStart.getDate() + i);
      // Đảm bảo timezone đúng khi tạo dayKey
      // Sử dụng UTC để tránh vấn đề timezone
      const year = currentDay.getFullYear();
      const month = String(currentDay.getMonth() + 1).padStart(2, '0');
      const day = String(currentDay.getDate()).padStart(2, '0');
      const dayKey = `${year}-${month}-${day}`;
      
      // Tính số ngày từ thứ 2 đến ngày hiện tại (i=0 là thứ 2, i=6 là chủ nhật)
      // daysPassed: số ngày từ thứ 2 đến hôm nay (bao gồm cả thứ 2 và hôm nay)
      // Ví dụ: Nếu hôm nay là thứ 2, daysPassed = 1
      //        Nếu hôm nay là thứ 3, daysPassed = 2
      //        Nếu hôm nay là chủ nhật, daysPassed = 7
      // Ngày đã qua: (i + 1) <= daysPassed
      // i=0 (thứ 2): (0+1)=1 <= daysPassed → đúng nếu hôm nay >= thứ 2
      // i=1 (thứ 3): (1+1)=2 <= daysPassed → đúng nếu hôm nay >= thứ 3
      // i=6 (chủ nhật): (6+1)=7 <= daysPassed → đúng nếu hôm nay >= chủ nhật
      const isPastDay = (i + 1) <= daysPassed;
      
      if (scoreMap[dayKey]) {
        // Ngày có practice
        activities.push({
          practice_day: dayKey,
          total_sessions: scoreMap[dayKey].total_sessions,
          max_score: scoreMap[dayKey].max_score,
          is_future: false
        });
      } else if (isPastDay) {
        // Ngày đã qua nhưng không làm (điểm = 0)
        activities.push({
          practice_day: dayKey,
          total_sessions: 0,
          max_score: 0,
          is_future: false
        });
      } else {
        // Ngày chưa đến (không có điểm)
        activities.push({
          practice_day: dayKey,
          total_sessions: 0,
          max_score: null, // null để frontend biết là ngày chưa đến
          is_future: true
        });
      }
    }
    
    // Debug log để kiểm tra danh sách ngày
    console.log("📅 getRecentActivities - Activities dates:", activities.map(a => a.practice_day));

    return activities;
  } catch (err) {
    console.error("❌ getRecentActivities error:", err);
    throw err;
  }
}

/**
 * Lấy top rating học viên (reset theo tuần)
 * Logic: Tính từ thứ 2 đến hôm nay, ngày đã qua không làm = 0 điểm, ngày chưa đến không tính
 */
export async function getTopRatings(limit = 10) {
  try {
    const weekStart = getWeekStart(); // 00:00:00 thứ 2
    const weekEnd = getWeekEnd(); // 23:59:59 chủ nhật
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);

    // Tính số ngày đã qua trong tuần (từ thứ 2 đến hôm nay)
    const daysPassed = Math.floor((today - weekStart) / (1000 * 60 * 60 * 24)) + 1;
    const daysToCalculate = Math.min(daysPassed, 7); // Tối đa 7 ngày

    // Lấy điểm cao nhất mỗi ngày trong tuần cho mỗi học viên (từ 00:00 thứ 2 đến 23:59:59 chủ nhật)
    const dailyScores = await pool.query(`
      SELECT 
        ph.learner_id,
        DATE(ph.practice_date) as practice_day,
        MAX(ph.average_score) as max_score_per_day
      FROM practice_history ph
      WHERE ph.practice_type IN ('speaking_practice', 'scenario')
        AND ph.average_score IS NOT NULL
        AND ph.practice_date >= $1
        AND ph.practice_date <= $2
      GROUP BY ph.learner_id, DATE(ph.practice_date)
    `, [weekStart, weekEnd]);

    // Tính tổng điểm cho mỗi học viên (cả 7 ngày, ngày không làm = 0 điểm)
    const learnerScores = {};
    dailyScores.rows.forEach(row => {
      const learnerId = row.learner_id;
      if (!learnerScores[learnerId]) {
        learnerScores[learnerId] = {
          total_score: 0
        };
      }
      learnerScores[learnerId].total_score += parseFloat(row.max_score_per_day || 0);
    });

    // Lấy thông tin học viên và tính điểm trung bình
    const learnerIds = Object.keys(learnerScores).map(id => parseInt(id));
    if (learnerIds.length === 0) {
      return [];
    }

    const learnersResult = await pool.query(`
      SELECT l.id as learner_id, u.name as learner_name, u.email as learner_email
      FROM learners l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ANY($1)
    `, [learnerIds]);

    const ratings = learnersResult.rows.map(learner => {
      const scores = learnerScores[learner.learner_id];
      // Tính trung bình = tổng điểm / số ngày đã qua (ngày không làm = 0 điểm)
      const averageScore = daysToCalculate > 0 ? (scores ? scores.total_score / daysToCalculate : 0) : 0;
      return {
        learner_id: learner.learner_id,
        learner_name: learner.learner_name,
        learner_email: learner.learner_email,
        total_days: daysToCalculate, // Số ngày đã qua trong tuần
        total_score: Math.round(scores ? scores.total_score : 0),
        average_score: Math.round(averageScore)
      };
    });

    // Sắp xếp theo điểm trung bình giảm dần
    ratings.sort((a, b) => {
      if (b.average_score !== a.average_score) {
        return b.average_score - a.average_score;
      }
      return b.total_days - a.total_days;
    });

    return ratings.slice(0, limit).map((rating, index) => ({
      rank: index + 1,
      ...rating
    }));
  } catch (err) {
    console.error("❌ getTopRatings error:", err);
    throw err;
  }
}

/**
 * Lấy điểm thi đua hiện tại của học viên (reset theo tuần)
 * Logic: Tính cho cả 7 ngày trong tuần, ngày không làm mặc định 0 điểm
 */
export async function getCurrentCompetitionScore(learnerId) {
  try {
    const weekStart = getWeekStart();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);

    // Tính số ngày đã qua trong tuần (từ thứ 2 đến hôm nay)
    const daysPassed = Math.floor((today - weekStart) / (1000 * 60 * 60 * 24)) + 1;
    const daysToCalculate = Math.min(daysPassed, 7); // Tối đa 7 ngày

    // Lấy điểm cao nhất mỗi ngày trong tuần (từ 00:00 thứ 2 đến 23:59:59 chủ nhật)
    const weekEnd = getWeekEnd(); // 23:59:59 chủ nhật
    const result = await pool.query(`
      SELECT 
        DATE(ph.practice_date) as practice_day,
        MAX(ph.average_score) as max_score_per_day
      FROM practice_history ph
      WHERE ph.learner_id = $1
        AND ph.practice_type IN ('speaking_practice', 'scenario')
        AND ph.average_score IS NOT NULL
        AND ph.practice_date >= $2
        AND ph.practice_date <= $3
      GROUP BY DATE(ph.practice_date)
      ORDER BY practice_day
    `, [learnerId, weekStart, weekEnd]);

    // Tạo map điểm theo ngày
    const scoreMap = {};
    result.rows.forEach(row => {
      const dayKey = row.practice_day.toISOString().split('T')[0];
      scoreMap[dayKey] = parseFloat(row.max_score_per_day || 0);
    });

    // Tính tổng điểm cho các ngày đã qua (ngày không làm = 0 điểm)
    let totalScore = 0;
    const dailyScores = [];
    
    for (let i = 0; i < daysToCalculate; i++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(weekStart.getDate() + i);
      const dayKey = currentDay.toISOString().split('T')[0];
      const dayScore = scoreMap[dayKey] || 0; // Ngày không làm = 0 điểm
      totalScore += dayScore;
      dailyScores.push({
        day: dayKey,
        max_score: Math.round(dayScore)
      });
    }

    // Chia cho số ngày đã qua (không phải chia cho 7)
    const averageScore = daysToCalculate > 0 ? totalScore / daysToCalculate : 0;

    // Lấy thứ hạng hiện tại (tính từ thứ 2 đến hôm nay, ngày không làm = 0 điểm)
    const rankResult = await pool.query(`
      WITH daily_scores AS (
        SELECT 
          ph.learner_id,
          DATE(ph.practice_date) as practice_day,
          MAX(ph.average_score) as max_score_per_day
        FROM practice_history ph
        WHERE ph.practice_type IN ('speaking_practice', 'scenario')
          AND ph.average_score IS NOT NULL
          AND ph.practice_date >= $1
          AND ph.practice_date < $2
        GROUP BY ph.learner_id, DATE(ph.practice_date)
      ),
      learner_totals AS (
        SELECT 
          learner_id,
          SUM(COALESCE(max_score_per_day, 0)) as total_score,
          $3::INTEGER as days_count,
          -- Tính cho số ngày đã qua (ngày không làm = 0 điểm)
          CASE 
            WHEN $3::INTEGER > 0 
            THEN (SUM(COALESCE(max_score_per_day, 0))::FLOAT / $3::INTEGER)
            ELSE 0
          END as average_score
        FROM (
          SELECT DISTINCT learner_id FROM daily_scores
          UNION
          SELECT DISTINCT learner_id FROM practice_history 
          WHERE practice_type IN ('speaking_practice', 'scenario')
            AND practice_date >= $1
            AND practice_date < $2
        ) all_learners
        LEFT JOIN daily_scores USING (learner_id)
        GROUP BY learner_id
      )
      SELECT 
        COUNT(*) + 1 as rank
      FROM learner_totals
      WHERE average_score > $4
    `, [weekStart, new Date(today.getTime() + 24 * 60 * 60 * 1000), daysToCalculate, averageScore]);

    const rank = parseInt(rankResult.rows[0]?.rank || 0);

    return {
      total_days: daysToCalculate, // Số ngày đã qua trong tuần
      total_score: Math.round(totalScore),
      average_score: Math.round(averageScore),
      rank: rank,
      daily_scores: dailyScores
    };
  } catch (err) {
    console.error("❌ getCurrentCompetitionScore error:", err);
    throw err;
  }
}

/**
 * Lấy lịch sử luyện tập theo tuần cho học viên
 * @param {number} learnerId - ID của học viên
 * @param {number} offsetWeeks - Số tuần lùi lại (0 = tuần hiện tại, 1 = tuần trước, ...)
 * @param {number} limitWeeks - Số tuần cần lấy
 */
export async function getWeeklyHistory(learnerId, offsetWeeks = 0, limitWeeks = 1) {
  try {
    // Tính tuần bắt đầu và kết thúc (sử dụng helper functions để nhất quán)
    const currentWeekStart = getWeekStart(); // 00:00:00 thứ 2 tuần hiện tại
    
    // Tính tuần bắt đầu dựa trên offset (lùi về tuần trước)
    const targetWeekStart = new Date(currentWeekStart);
    targetWeekStart.setDate(currentWeekStart.getDate() - (offsetWeeks * 7));
    targetWeekStart.setHours(0, 0, 0, 0); // Đảm bảo là 00:00:00 thứ 2
    
    // Tuần kết thúc vào 23:59:59 chủ nhật (thứ 2 + 6 ngày)
    const targetWeekEnd = new Date(targetWeekStart);
    targetWeekEnd.setDate(targetWeekStart.getDate() + 6);
    targetWeekEnd.setHours(23, 59, 59, 999); // 23:59:59.999 chủ nhật

    // Lấy tất cả activities trong khoảng thời gian
    const result = await pool.query(`
      SELECT 
        ph.id,
        ph.practice_type,
        ph.average_score,
        ph.total_score,
        ph.practice_date,
        ph.duration_minutes,
        CASE 
          WHEN ph.practice_type = 'speaking_practice' THEN 'Luyện phát âm'
          WHEN ph.practice_type = 'scenario' THEN 'Luyện nói theo tình huống'
          ELSE ph.practice_type
        END as activity_type,
        DATE_TRUNC('week', ph.practice_date) as week_start
      FROM practice_history ph
      WHERE ph.learner_id = $1
        AND ph.practice_type IN ('speaking_practice', 'scenario')
        AND ph.average_score IS NOT NULL
        AND ph.practice_date >= $2
        AND ph.practice_date <= $3
      ORDER BY ph.practice_date DESC
    `, [learnerId, targetWeekStart, targetWeekEnd]);

    // Group theo tuần và tính điểm trung bình
    const weeklyData = {};
    result.rows.forEach(row => {
      const weekKey = row.week_start.toISOString().split('T')[0];
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week_start: weekKey,
          activities: [],
          total_sessions: 0,
          average_score: 0
        };
      }
      weeklyData[weekKey].activities.push({
        id: row.id,
        practice_type: row.practice_type,
        activity_type: row.activity_type,
        average_score: Math.round(row.average_score || 0),
        total_score: Math.round(row.total_score || 0),
        practice_date: row.practice_date,
        duration_minutes: row.duration_minutes
      });
      weeklyData[weekKey].total_sessions += 1;
    });

    // Tính điểm trung bình mỗi tuần
    Object.keys(weeklyData).forEach(weekKey => {
      const week = weeklyData[weekKey];
      if (week.activities.length > 0) {
        const totalScore = week.activities.reduce((sum, act) => sum + act.average_score, 0);
        week.average_score = Math.round(totalScore / week.activities.length);
      }
    });

    // Convert to array và sort theo tuần (mới nhất trước)
    return Object.values(weeklyData)
      .sort((a, b) => new Date(b.week_start) - new Date(a.week_start))
      .slice(0, limitWeeks);
  } catch (err) {
    console.error("❌ getWeeklyHistory error:", err);
    throw err;
  }
}

/**
 * Helper: Tính thứ 2 đầu tuần (reset vào 00:00 thứ 2)
 * Tuần tính từ thứ 2 (00:00:00) đến chủ nhật (23:59:59)
 */
function getWeekStart() {
  const now = new Date();
  // Lấy ngày hiện tại theo local timezone (bỏ qua giờ) để tính tuần chính xác
  // Sử dụng local date để tránh vấn đề timezone khi convert sang UTC
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const today = new Date(year, month, date, 0, 0, 0, 0); // Local time 00:00:00
  const dayOfWeek = today.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
  
  // Tính số ngày cần lùi về thứ 2
  // Nếu hôm nay là chủ nhật (0), lùi 6 ngày về thứ 2 tuần trước
  // Nếu hôm nay là thứ 2 (1), lùi 0 ngày (đã là thứ 2)
  // Nếu hôm nay là thứ 3 (2), lùi 1 ngày về thứ 2
  // ...
  // Nếu hôm nay là thứ 7 (6), lùi 5 ngày về thứ 2
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const weekStart = new Date(year, month, date - daysToMonday, 0, 0, 0, 0); // Local time 00:00:00 thứ 2
  
  // Đảm bảo weekStart là thứ 2 (getDay() = 1)
  if (weekStart.getDay() !== 1) {
    console.error("⚠️ getWeekStart: weekStart is not Monday! dayOfWeek:", weekStart.getDay(), "weekStart:", weekStart.toLocaleDateString('vi-VN'));
  }
  
  return weekStart;
}

/**
 * Helper: Tính chủ nhật cuối tuần (23:59:59 chủ nhật)
 * Tuần kết thúc vào 23:59:59 chủ nhật, reset vào 00:00:00 thứ 2 tuần tiếp theo
 */
function getWeekEnd() {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Thứ 2 + 6 ngày = Chủ nhật
  weekEnd.setHours(23, 59, 59, 999); // 23:59:59.999 chủ nhật
  return weekEnd;
}

