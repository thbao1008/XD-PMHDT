-- init.sql
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20),
  dob DATE,
  password TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'learner' CHECK (role IN ('learner','mentor','admin')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','banned')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Nếu muốn import dữ liệu từ dump
-- COPY hoặc INSERT các dòng dữ liệu ở đây
