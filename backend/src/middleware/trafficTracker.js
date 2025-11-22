import pool from "../config/db.js";

// Cleanup online users sau 5 phút không hoạt động
const ONLINE_TIMEOUT = 5 * 60 * 1000; // 5 phút

// Cleanup old traffic logs (giữ 30 ngày)
async function cleanupOldLogs() {
  try {
    await pool.query(`
      DELETE FROM traffic_logs 
      WHERE created_at < NOW() - INTERVAL '30 days'
    `);
  } catch (err) {
    console.error("Error cleaning up old traffic logs:", err);
  }
}

// Cleanup offline users
async function cleanupOfflineUsers() {
  try {
    await pool.query(`
      DELETE FROM online_users 
      WHERE last_activity < NOW() - INTERVAL '5 minutes'
    `);
  } catch (err) {
    console.error("Error cleaning up offline users:", err);
  }
}

// Track traffic và online users
export async function trackTraffic(req, res, next) {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    const path = req.path || req.url;
    const method = req.method;
    const userId = req.user?.id || null;
    const today = new Date().toISOString().split('T')[0];
    
    // Tạo unique visitor identifier (user_id nếu có, nếu không thì IP+User-Agent)
    const visitorId = userId ? `user_${userId}` : `ip_${ip}_${userAgent.substring(0, 30)}`.replace(/[^a-zA-Z0-9-]/g, '-');
    
    // Tạo session ID cho online tracking
    const sessionId = req.session?.id || `${visitorId}_${Date.now()}`;
    
    // Lưu traffic log (chỉ log, không tăng counter)
    pool.query(`
      INSERT INTO traffic_logs (ip_address, user_agent, path, method, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [ip, userAgent, path, method]).catch(err => {
      console.error("Error logging traffic:", err);
    });

    // Update hoặc insert online user (theo user_id nếu có, nếu không thì session_id)
    if (userId) {
      // Nếu có user_id, track theo user_id (1 user = 1 online, dù nhiều session)
      pool.query(`
        INSERT INTO online_users (session_id, user_id, ip_address, user_agent, last_activity)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (session_id) 
        DO UPDATE SET 
          last_activity = NOW(),
          user_id = $2,
          ip_address = $3
      `, [sessionId, userId, ip, userAgent]).catch(err => {
        console.error("Error updating online users:", err);
      });
    } else {
      // Nếu không có user_id, track theo session_id (anonymous)
      pool.query(`
        INSERT INTO online_users (session_id, user_id, ip_address, user_agent, last_activity)
        VALUES ($1, NULL, $2, $3, NOW())
        ON CONFLICT (session_id) 
        DO UPDATE SET 
          last_activity = NOW(),
          ip_address = $2
      `, [sessionId, ip, userAgent]).catch(err => {
        console.error("Error updating online users:", err);
      });
    }

    // Update daily stats - chỉ tính lại unique visitors từ traffic_logs (không tăng counter)
    // Chạy async để không block request
    pool.query(`
      INSERT INTO daily_traffic_stats (date, unique_visitors, updated_at)
      VALUES ($1, 0, NOW())
      ON CONFLICT (date) DO NOTHING
    `, [today]).catch(() => {});
    
    // Tính lại unique visitors từ traffic_logs (đếm DISTINCT IP hoặc user_id)
    pool.query(`
      UPDATE daily_traffic_stats
      SET unique_visitors = (
        SELECT COUNT(DISTINCT ip_address)
        FROM traffic_logs
        WHERE DATE(created_at) = daily_traffic_stats.date
      ),
      updated_at = NOW()
      WHERE date = $1
    `, [today]).catch(err => {
      console.error("Error updating unique visitors:", err);
    });

  } catch (err) {
    console.error("Error in trackTraffic middleware:", err);
  }
  
  next();
}

// Cleanup job (chạy mỗi 10 phút)
setInterval(() => {
  cleanupOfflineUsers();
  cleanupOldLogs();
}, 10 * 60 * 1000);

// Chạy cleanup ngay khi start
cleanupOfflineUsers();
cleanupOldLogs();

