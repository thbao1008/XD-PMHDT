-- init.sql
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role VARCHAR(20) CHECK (role IN ('learner','mentor')),
  status VARCHAR(20) CHECK (status IN ('active','banned')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Nếu muốn import dữ liệu từ dump
-- COPY hoặc INSERT các dòng dữ liệu ở đây
