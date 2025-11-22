-- Schema for "Tell me your story" mode

-- Bảng story_sessions: Lưu session của học viên trong story mode
CREATE TABLE IF NOT EXISTS story_sessions (
  id SERIAL PRIMARY KEY,
  learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, abandoned
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng story_conversations: Lưu các tin nhắn trong conversation
CREATE TABLE IF NOT EXISTS story_conversations (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES story_sessions(id) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL, -- 'user' or 'ai'
  text_content TEXT,
  audio_url VARCHAR(500),
  transcript JSONB, -- Full transcript từ WhisperX
  ai_response TEXT, -- AI response cho message này
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_story_sessions_learner ON story_sessions(learner_id);
CREATE INDEX IF NOT EXISTS idx_story_sessions_status ON story_sessions(status);
CREATE INDEX IF NOT EXISTS idx_story_conversations_session ON story_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_story_conversations_created ON story_conversations(created_at DESC);

