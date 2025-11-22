-- Schema for dictionary cache to speed up word definition lookups

CREATE TABLE IF NOT EXISTS dictionary_cache (
  word VARCHAR(255) PRIMARY KEY,
  definition_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dictionary_cache_updated ON dictionary_cache(updated_at);

-- Clean up old entries (older than 30 days) periodically
-- This can be done via a cron job or scheduled task

