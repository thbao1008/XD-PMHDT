-- Schema for AI-generated speaking practice prompts
-- AI sẽ tự học và tạo prompts mới dựa trên level và context

CREATE TABLE IF NOT EXISTS ai_generated_prompts (
  id SERIAL PRIMARY KEY,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  prompt_text TEXT NOT NULL UNIQUE, -- Unique để tránh duplicate
  topic VARCHAR(255), -- Chủ đề của prompt (tự động detect)
  vocabulary JSONB, -- Từ vựng được sử dụng trong prompt
  word_count INTEGER, -- Số từ trong prompt
  difficulty_score FLOAT, -- Độ khó (0-1)
  source VARCHAR(50) DEFAULT 'ai_generated', -- 'ai_generated', 'scenario', 'topic', 'manual'
  source_id INTEGER, -- ID của nguồn (scenario_id, topic_id, etc.)
  usage_count INTEGER DEFAULT 0, -- Số lần đã sử dụng
  success_rate FLOAT DEFAULT 0, -- Tỷ lệ thành công (dựa trên scores)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

-- Indexes để tìm nhanh prompts theo level
CREATE INDEX IF NOT EXISTS idx_ai_prompts_level ON ai_generated_prompts(level);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_topic ON ai_generated_prompts(topic);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_usage ON ai_generated_prompts(usage_count DESC, success_rate DESC);

-- Bảng lưu learning context từ các nguồn
CREATE TABLE IF NOT EXISTS ai_learning_context (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL, -- 'scenario', 'topic', 'challenge', 'user_submission', 'manual'
  source_id INTEGER,
  content TEXT NOT NULL, -- Nội dung học được
  vocabulary JSONB, -- Từ vựng extract được
  level INTEGER, -- Level tương ứng
  metadata JSONB, -- Thông tin bổ sung
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_type, source_id, content) -- Tránh duplicate
);

CREATE INDEX IF NOT EXISTS idx_learning_context_source ON ai_learning_context(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_learning_context_level ON ai_learning_context(level);

