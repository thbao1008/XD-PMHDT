-- Schema cho traffic tracking
CREATE TABLE IF NOT EXISTS traffic_logs (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45),
  user_agent TEXT,
  path VARCHAR(500),
  method VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traffic_logs_created_at ON traffic_logs(created_at);

-- Bảng lưu online users (session-based)
CREATE TABLE IF NOT EXISTS online_users (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_online_users_last_activity ON online_users(last_activity);
CREATE INDEX IF NOT EXISTS idx_online_users_user_id ON online_users(user_id);

-- Bảng tổng hợp traffic theo ngày (cho dashboard)
CREATE TABLE IF NOT EXISTS daily_traffic_stats (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  total_requests INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_traffic_stats_date ON daily_traffic_stats(date);

