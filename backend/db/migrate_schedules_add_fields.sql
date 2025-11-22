-- Migration: Thêm các trường type, is_exam vào bảng schedules
-- Chạy migration này nếu bảng schedules đã tồn tại

ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'online',
ADD COLUMN IF NOT EXISTS is_exam BOOLEAN DEFAULT FALSE;

-- Cập nhật constraint
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS valid_type;
ALTER TABLE schedules ADD CONSTRAINT valid_type CHECK (type IN ('online', 'offline'));

-- Cập nhật status để thêm 'paused'
-- (PostgreSQL không hỗ trợ ALTER TYPE enum, nên chỉ cần đảm bảo application code xử lý đúng)

