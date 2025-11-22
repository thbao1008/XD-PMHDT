-- Schema for Assistant AI training data (PostgreSQL)
-- AI phụ trợ học từ OpenRouter responses

CREATE TABLE IF NOT EXISTS assistant_ai_training (
  id SERIAL PRIMARY KEY,
  task_type VARCHAR(50) NOT NULL, -- 'translation_check', 'pronunciation_analysis', etc.
  input_data JSONB NOT NULL,
  expected_output JSONB NOT NULL, -- Response từ OpenRouter
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint trên task_type và input_data (text representation)
-- Sử dụng hash để tạo unique index trên JSONB
CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_ai_training_unique 
ON assistant_ai_training(task_type, md5(input_data::text));

CREATE INDEX IF NOT EXISTS idx_assistant_ai_training_task ON assistant_ai_training(task_type, created_at);

-- Bảng lưu models đã train
CREATE TABLE IF NOT EXISTS assistant_ai_models (
  id SERIAL PRIMARY KEY,
  task_type VARCHAR(50) NOT NULL,
  accuracy_score FLOAT, -- Accuracy của model (0-1)
  model_state JSONB, -- Model parameters/patterns
  trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assistant_ai_models_task ON assistant_ai_models(task_type, trained_at DESC);

