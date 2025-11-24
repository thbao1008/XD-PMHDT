-- Migration: Add avatar_url column to users table
-- Avatar được lưu dưới dạng base64 trong database, không lưu file trong thư mục upload

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Index không cần thiết cho TEXT column, nhưng có thể thêm comment
COMMENT ON COLUMN users.avatar_url IS 'Avatar URL dạng base64 (data:image/...) hoặc URL tuyệt đối';

