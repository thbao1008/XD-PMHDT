# Training AiESP cho 3 Mục tiêu của Learner

## Tổng quan

AiESP được train để hỗ trợ 3 mục tiêu chính của learner:

1. **Practice (Luyện tập)** - `speaking_practice`
2. **Kể chuyện và Lắng nghe** - `conversation_ai`
3. **Game trò chuyện với nhiều đối tượng** - `game_conversation`

## 1. Practice (Speaking Practice)

### Mục tiêu
- Hỗ trợ learner luyện tập phát âm
- Khuyến khích và động viên
- Hướng dẫn cách practice hiệu quả

### Training Samples
- 5 samples cơ bản về practice
- Các tình huống: practice pronunciation, improve skills, nervous about speaking

### Train Model
```bash
python backend/ai_models/assistantAI.py train speaking_practice
```

## 2. Kể chuyện và Lắng nghe (Story/Conversation)

### Mục tiêu
- Lắng nghe learner kể chuyện
- Đồng cảm và phản hồi tự nhiên
- Khuyến khích chia sẻ

### Training Samples
- 9 samples về story/conversation
- Các tình huống: share story, listen, emotional support

### Train Model
```bash
python backend/ai_models/assistantAI.py train conversation_ai
```

## 3. Game trò chuyện với nhiều đối tượng (Game Conversation)

### Mục tiêu
- Hỗ trợ learner trong game-based learning
- Hướng dẫn tương tác với nhiều NPCs (Non-Player Characters)
- Giúp hoàn thành quests và missions

### Training Samples
- 10 samples về game conversation
- Các tình huống: find items, complete quests, talk to NPCs, collect items

### Train Model
```bash
python backend/ai_models/assistantAI.py train game_conversation
```

## Quick Start

### 1. Generate Training Samples
```bash
npm run aiesp:train:goals
```

### 2. Train All Models
```bash
# Train speaking practice
python backend/ai_models/assistantAI.py train speaking_practice

# Train conversation (nếu chưa train)
python backend/ai_models/assistantAI.py train conversation_ai

# Train game conversation
python backend/ai_models/assistantAI.py train game_conversation
```

### 3. Check Status
```bash
npm run check:current-ai
```

## Task Types trong AiESP

1. **speaking_practice**: Practice và luyện tập
2. **conversation_ai**: Kể chuyện và lắng nghe
3. **game_conversation**: Game trò chuyện với NPCs
4. **translation_check**: Kiểm tra translation (existing)

## Continuous Learning

Hệ thống continuous learning tự động train cho cả 3 task types:
- `speaking_practice`
- `conversation_ai`
- `game_conversation`
- `translation_check`

Chạy continuous learning:
```bash
npm run aiesp:learn
```

## Game Conversation Features

### NPCs (Non-Player Characters)
- Shopkeeper
- Librarian
- Mayor
- Village Elder
- Merchant
- Guard
- Guide
- Helper
- Advisor
- Collector
- Trader
- Artisan
- Farmer
- Blacksmith
- Scholar

### Game Scenarios
- Finding keys/items
- Completing quests
- Talking to multiple NPCs
- Collecting items
- Getting permissions
- Following quest chains

## Next Steps

1. **Generate more samples**: Sử dụng Gemini để generate thêm samples
2. **Train on Colab**: Export và train trên Google Colab với GPU
3. **Monitor performance**: Sử dụng continuous learning để monitor
4. **Improve accuracy**: Thêm training data để cải thiện accuracy

