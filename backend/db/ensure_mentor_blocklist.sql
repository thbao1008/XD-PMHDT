-- Đảm bảo bảng mentor_blocklist có UNIQUE constraint
-- Chạy script này nếu bảng chưa có constraint

-- Tạo bảng nếu chưa có
CREATE TABLE IF NOT EXISTS mentor_blocklist (
  id SERIAL PRIMARY KEY,
  mentor_id INTEGER NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Tạo UNIQUE constraint nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'mentor_blocklist_mentor_id_learner_id_key'
  ) THEN
    ALTER TABLE mentor_blocklist 
    ADD CONSTRAINT mentor_blocklist_mentor_id_learner_id_key 
    UNIQUE (mentor_id, learner_id);
  END IF;
END $$;

-- Tạo indexes nếu chưa có
CREATE INDEX IF NOT EXISTS idx_mentor_blocklist_learner ON mentor_blocklist(learner_id);
CREATE INDEX IF NOT EXISTS idx_mentor_blocklist_mentor ON mentor_blocklist(mentor_id);

