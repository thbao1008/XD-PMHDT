-- Notifications Schema
-- Bảng lưu thông báo cho người dùng

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL, -- Người nhận thông báo
  type VARCHAR(50) NOT NULL, -- 'post_approved', 'post_rejected', 'post_liked', 'comment_added', 'comment_replied'
  title VARCHAR(255) NOT NULL, -- Tiêu đề thông báo
  message TEXT NOT NULL, -- Nội dung thông báo
  related_post_id INTEGER, -- ID bài post liên quan (nếu có)
  related_comment_id INTEGER, -- ID comment liên quan (nếu có)
  related_user_id INTEGER, -- ID người dùng liên quan (người like, comment, etc.)
  is_read BOOLEAN DEFAULT false, -- Đã đọc chưa
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_related_post FOREIGN KEY (related_post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_related_comment FOREIGN KEY (related_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_related_user FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT check_notification_type CHECK (type IN (
    'post_approved', 
    'post_rejected', 
    'post_liked', 
    'comment_added', 
    'comment_replied'
  ))
);

-- Indexes để tối ưu query
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_related_post ON notifications(related_post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_comment ON notifications(related_comment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

