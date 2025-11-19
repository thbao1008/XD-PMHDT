-- Schema for scenario-based speaking practice

-- Bảng scenarios: Lưu các tình huống
CREATE TABLE IF NOT EXISTS speaking_scenarios (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  task TEXT NOT NULL,
  character_name VARCHAR(100),
  character_role TEXT,1
  vocabulary JSONB, -- [{word, pronunciation, meaning}, ...]
  initial_prompt TEXT, -- Câu đầu tiên AI sẽ nói
  completion_criteria TEXT, -- Điều kiện để hoàn thành nhiệm vụ
  difficulty_level INTEGER DEFAULT 1, -- 1: Easy, 2: Medium, 3: Hard
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng scenario_sessions: Lưu session của học viên với scenario
CREATE TABLE IF NOT EXISTS scenario_sessions (
  id SERIAL PRIMARY KEY,
  learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  scenario_id INTEGER NOT NULL REFERENCES speaking_scenarios(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, completed, abandoned
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng scenario_conversations: Lưu các tin nhắn trong conversation
CREATE TABLE IF NOT EXISTS scenario_conversations (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES scenario_sessions(id) ON DELETE CASCADE,
  speaker VARCHAR(20) NOT NULL, -- 'learner' or 'ai'
  text_content TEXT,
  audio_url VARCHAR(500),
  turn_number INTEGER NOT NULL, -- Số thứ tự trong conversation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scenario_sessions_learner ON scenario_sessions(learner_id);
CREATE INDEX IF NOT EXISTS idx_scenario_sessions_scenario ON scenario_sessions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_conversations_session ON scenario_conversations(session_id);

-- Insert sample scenarios
INSERT INTO speaking_scenarios (title, description, task, character_name, character_role, vocabulary, initial_prompt, completion_criteria, difficulty_level) VALUES
(
  'Tìm chìa khóa cho bố',
  'Bạn đang ở nhà và bố bạn cần chìa khóa xe. Bạn phải tìm chìa khóa và đưa cho bố.',
  'Tìm chìa khóa xe và đưa cho bố',
  'Bố',
  'father',
  '[
    {"word": "key", "pronunciation": "kiː", "meaning": "chìa khóa"},
    {"word": "car", "pronunciation": "kɑːr", "meaning": "xe hơi"},
    {"word": "where", "pronunciation": "wer", "meaning": "ở đâu"},
    {"word": "find", "pronunciation": "faɪnd", "meaning": "tìm"},
    {"word": "give", "pronunciation": "ɡɪv", "meaning": "đưa"}
  ]'::jsonb,
  'Hi, I need the car keys. Can you help me find them?',
  'Learner successfully finds and gives the keys to the father',
  1
),
(
  'Đi chơi với bạn bè',
  'Bạn và bạn bè đang lên kế hoạch đi chơi cuối tuần. Bạn cần thảo luận về địa điểm và thời gian.',
  'Thỏa thuận với bạn về địa điểm và thời gian đi chơi',
  'Friend',
  'friend',
  '[
    {"word": "weekend", "pronunciation": "ˈwiːkend", "meaning": "cuối tuần"},
    {"word": "plan", "pronunciation": "plæn", "meaning": "kế hoạch"},
    {"word": "place", "pronunciation": "pleɪs", "meaning": "địa điểm"},
    {"word": "time", "pronunciation": "taɪm", "meaning": "thời gian"},
    {"word": "agree", "pronunciation": "əˈɡriː", "meaning": "đồng ý"}
  ]'::jsonb,
  'Hey! Do you want to hang out this weekend? Where should we go?',
  'Learner agrees on a place and time with the friend',
  2
),
(
  'Mua sắm tại cửa hàng',
  'Bạn đang ở cửa hàng và cần mua một số đồ. Bạn phải hỏi nhân viên về sản phẩm và giá cả.',
  'Hỏi về sản phẩm, giá cả và mua được đồ cần thiết',
  'Shop Assistant',
  'shop_assistant',
  '[
    {"word": "price", "pronunciation": "praɪs", "meaning": "giá"},
    {"word": "available", "pronunciation": "əˈveɪləbl", "meaning": "có sẵn"},
    {"word": "size", "pronunciation": "saɪz", "meaning": "kích cỡ"},
    {"word": "buy", "pronunciation": "baɪ", "meaning": "mua"},
    {"word": "pay", "pronunciation": "peɪ", "meaning": "trả tiền"}
  ]'::jsonb,
  'Hello! Welcome to our store. How can I help you today?',
  'Learner successfully asks about products and completes a purchase',
  2
);

