-- Thêm cột security_question và security_answer vào bảng users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS security_question VARCHAR(500),
ADD COLUMN IF NOT EXISTS security_answer TEXT;

-- Tạo index cho security_question để tìm kiếm nhanh hơn
CREATE INDEX IF NOT EXISTS idx_users_security_question ON users(security_question) WHERE security_question IS NOT NULL;

