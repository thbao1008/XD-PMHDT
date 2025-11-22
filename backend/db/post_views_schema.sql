-- Bảng để track bài đăng đã xem
CREATE TABLE IF NOT EXISTS post_views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  viewed_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_post_view UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_views_user ON post_views(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_post ON post_views(post_id);
