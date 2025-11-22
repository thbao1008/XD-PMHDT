-- Schema for Challenge Creator AI Training
-- Lưu training data để AI học cách tạo challenge tốt hơn

CREATE TABLE IF NOT EXISTS challenge_creator_training (
  id SERIAL PRIMARY KEY,
  training_type VARCHAR(50) NOT NULL, -- 'challenge_creation', 'learner_submission', 'mentor_feedback'
  input_data JSONB NOT NULL, -- Input data (challenge info, submission info, etc.)
  expected_output JSONB NOT NULL, -- Expected output (challenge created, submission analysis, feedback analysis)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index để tìm kiếm nhanh
CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_creator_training_unique 
ON challenge_creator_training(training_type, md5(input_data::text));

CREATE INDEX IF NOT EXISTS idx_challenge_creator_training_type 
ON challenge_creator_training(training_type, created_at);

CREATE INDEX IF NOT EXISTS idx_challenge_creator_training_created 
ON challenge_creator_training(created_at DESC);

-- Comment
COMMENT ON TABLE challenge_creator_training IS 'Training data for Challenge Creator AI to learn from challenges, submissions, and feedbacks';
COMMENT ON COLUMN challenge_creator_training.training_type IS 'Type of training: challenge_creation, learner_submission, mentor_feedback';
COMMENT ON COLUMN challenge_creator_training.input_data IS 'Input data (challenge info, submission context, etc.)';
COMMENT ON COLUMN challenge_creator_training.expected_output IS 'Expected output (created challenge, submission analysis, feedback analysis)';

