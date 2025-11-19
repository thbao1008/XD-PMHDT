-- Schema cho lịch sử luyện tập và đánh giá tiến độ học viên
-- Lưu điểm số và đánh giá tổng quát (không chi tiết)

-- Bảng lưu lịch sử luyện tập theo session
CREATE TABLE IF NOT EXISTS practice_history (
  id SERIAL PRIMARY KEY,
  learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES speaking_practice_sessions(id) ON DELETE SET NULL,
  practice_type VARCHAR(50) NOT NULL, -- 'speaking_practice', 'story', 'scenario', 'topic_chat'
  level INTEGER, -- Level của practice
  topic VARCHAR(255), -- Chủ đề nếu có
  total_score FLOAT, -- Điểm tổng
  average_score FLOAT, -- Điểm trung bình
  evaluation TEXT, -- Đánh giá tổng quát (ngắn gọn)
  strengths JSONB, -- Điểm mạnh (array)
  improvements JSONB, -- Cần cải thiện (array)
  practice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_minutes INTEGER, -- Thời gian luyện tập (phút)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_practice_history_learner ON practice_history(learner_id);
CREATE INDEX IF NOT EXISTS idx_practice_history_date ON practice_history(practice_date DESC);
CREATE INDEX IF NOT EXISTS idx_practice_history_type ON practice_history(practice_type);

-- Bảng lưu tiến độ tổng hợp theo thời gian (weekly/monthly)
CREATE TABLE IF NOT EXISTS learner_progress (
  id SERIAL PRIMARY KEY,
  learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  total_score FLOAT DEFAULT 0,
  average_score FLOAT DEFAULT 0,
  level_distribution JSONB, -- {1: count, 2: count, 3: count}
  topic_distribution JSONB, -- {topic: count}
  improvement_trend FLOAT, -- Xu hướng cải thiện (so với kỳ trước)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(learner_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_learner_progress_learner ON learner_progress(learner_id, period_type, period_start DESC);

-- Bảng lưu đánh giá nhanh cho từng round (không chi tiết)
CREATE TABLE IF NOT EXISTS quick_evaluations (
  id SERIAL PRIMARY KEY,
  round_id INTEGER REFERENCES speaking_practice_rounds(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES speaking_practice_sessions(id) ON DELETE CASCADE,
  learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  score FLOAT NOT NULL, -- Điểm tổng (0-10)
  feedback TEXT, -- Đánh giá ngắn gọn
  strengths JSONB, -- Điểm mạnh
  improvements JSONB, -- Cần cải thiện
  evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quick_evaluations_learner ON quick_evaluations(learner_id, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_quick_evaluations_session ON quick_evaluations(session_id);

