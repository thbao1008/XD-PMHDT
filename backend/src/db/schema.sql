CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  dob DATE,
  role VARCHAR(50) NOT NULL DEFAULT 'learner',
  password TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active / banned
  package_id VARCHAR(50), -- basic / pro / vip
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
