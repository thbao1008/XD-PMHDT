-- Schema for mentor_blocklist table
-- Stores mentor-learner pairs that should not be automatically assigned

CREATE TABLE IF NOT EXISTS mentor_blocklist (
  id SERIAL PRIMARY KEY,
  mentor_id INTEGER NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  UNIQUE(mentor_id, learner_id)
);

CREATE INDEX IF NOT EXISTS idx_mentor_blocklist_learner ON mentor_blocklist(learner_id);
CREATE INDEX IF NOT EXISTS idx_mentor_blocklist_mentor ON mentor_blocklist(mentor_id);

