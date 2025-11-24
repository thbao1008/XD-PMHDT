-- Migration: Add ban_reason to users and create ban_history table
-- Run this migration to add ban functionality with reason tracking

-- Add ban_reason column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Create ban_history table to track ban/unban history
CREATE TABLE IF NOT EXISTS ban_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('banned', 'unbanned')),
  reason TEXT,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ban_history_user_id ON ban_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ban_history_created_at ON ban_history(created_at);

