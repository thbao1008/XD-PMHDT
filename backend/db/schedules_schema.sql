-- Schema for schedules (lịch học với mentor)

-- Bảng schedules: Lưu lịch học được mentor xếp cho learner
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  mentor_id INTEGER NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL, -- Tiêu đề buổi học
  description TEXT, -- Mô tả nội dung buổi học
  start_time TIMESTAMP NOT NULL, -- Thời gian bắt đầu
  end_time TIMESTAMP NOT NULL, -- Thời gian kết thúc
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled, in_progress, paused
  type VARCHAR(20) DEFAULT 'online', -- online, offline
  meeting_link VARCHAR(500), -- Link meeting (Zoom, Google Meet, etc.) - chỉ khi type = 'online'
  is_exam BOOLEAN DEFAULT FALSE, -- Lịch thi định kỳ
  notes TEXT, -- Ghi chú từ mentor
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_type CHECK (type IN ('online', 'offline'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedules_learner ON schedules(learner_id);
CREATE INDEX IF NOT EXISTS idx_schedules_mentor ON schedules(mentor_id);
CREATE INDEX IF NOT EXISTS idx_schedules_start_time ON schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_date_range ON schedules(start_time, end_time);

