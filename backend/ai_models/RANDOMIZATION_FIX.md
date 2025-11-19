# Randomization Fix - Đảm bảo Chủ đề Đa dạng

## Vấn đề
Chủ đề luyện nói theo level không thay đổi, AI không tạo ra topics đa dạng.

## Giải pháp Đã Áp dụng

### 1. Random Seed & Timestamp
- **Mỗi request** tạo random seed duy nhất: `Math.random() * 1000000 + Date.now()`
- **Timestamp** được thêm vào prompt để đảm bảo uniqueness
- **Request ID** ngẫu nhiên để phân biệt mỗi lần gọi

### 2. Enhanced Temperature & Sampling
- **Temperature**: Tăng từ 0.95 → **1.1** (max 1.2)
- **Top-p (Nucleus)**: 0.95 để sampling đa dạng
- **Frequency Penalty**: 0.5 để tránh lặp từ
- **Presence Penalty**: 0.5 để tránh lặp chủ đề

### 3. Randomized User Messages
- 4 variations khác nhau của user message
- Chọn variation dựa trên random seed
- Mỗi message có seed và timestamp riêng

### 4. Enhanced System Prompt
- Thêm section **RANDOMIZATION & DIVERSITY**
- Nhấn mạnh: "COMPLETELY DIFFERENT from any previous generation"
- Yêu cầu: "Use stochastic sampling with maximum creativity"
- Hướng dẫn: "Vary sentence structures, vocabulary, topic perspectives"

### 5. Python Trainer Improvements
- **Shuffle topics 3 lần** trước khi chọn
- **Random số lượng topics** (3-7 topics) thay vì cố định 5
- **Random seed** trong Python: `random.randint(1000, 999999)`
- **Timestamp** trong Python: `int(time.time() * 1000)`

### 6. Topic Selection Randomization
```python
# Shuffle nhiều lần để tăng randomness
shuffled = list(available_topics)
for _ in range(3):
    random.shuffle(shuffled)
# Chọn số lượng topics ngẫu nhiên (3-7 topics)
num_topics = random.randint(3, min(7, len(shuffled)))
selected_topics = shuffled[:num_topics]
```

## Các Nguồn Ngẫu nhiên

### 1. LLM Sampling
- **Temperature**: 1.1 (high creativity)
- **Top-p**: 0.95 (nucleus sampling)
- **Frequency/Presence Penalty**: 0.5 (avoid repetition)

### 2. Software RNG
- **JavaScript**: `Math.random() + Date.now()`
- **Python**: `random.randint()` với seed khác nhau mỗi lần
- **Database**: `ORDER BY RANDOM()` cho topics/challenges

### 3. Prompt Variability
- **Random seed** trong prompt
- **Timestamp** trong prompt
- **Request ID** trong prompt
- **4 variations** của user message

### 4. Topic Selection
- **Shuffle 3 lần** trước khi chọn
- **Random số lượng** (3-7 topics)
- **Random từ database** (`ORDER BY RANDOM()`)

## Code Changes

### trainedAIService.js
```javascript
// Random seed cho mỗi request
const randomSeed = generateRandomSeed();
const timestamp = Date.now();

// Enhanced temperature
const enhancedTemperature = Math.min(1.2, baseTemperature + 0.1);

// Sampling parameters
{
  temperature: enhancedTemperature,
  top_p: 0.95,
  frequency_penalty: 0.5,
  presence_penalty: 0.5
}
```

### comprehensiveAITrainer.py
```python
# Random seed và timestamp
random_seed = random.randint(1000, 999999)
timestamp = int(time.time() * 1000)

# Shuffle topics nhiều lần
for _ in range(3):
    random.shuffle(shuffled)

# Random số lượng topics
num_topics = random.randint(3, min(7, len(shuffled)))
```

### aiService.js
```javascript
// Support thêm sampling parameters
{
  ...(opts.top_p !== undefined && { top_p: opts.top_p }),
  ...(opts.frequency_penalty !== undefined && { frequency_penalty: opts.frequency_penalty }),
  ...(opts.presence_penalty !== undefined && { presence_penalty: opts.presence_penalty })
}
```

## Logging & Debugging

### Console Logs
```javascript
console.log(`🎲 Generated topic with seed: ${randomSeed}, temperature: ${enhancedTemperature}`);
```

### Response Metadata
```json
{
  "topic": "...",
  "random_seed": 123456,
  "timestamp": 1234567890
}
```

## Testing

### Kiểm tra Randomization
1. Gọi API nhiều lần với cùng level
2. Kiểm tra topics có khác nhau không
3. Kiểm tra logs để xem seed và temperature
4. Verify prompts không lặp lại

### Expected Behavior
- Mỗi lần gọi tạo topic **KHÁC NHAU**
- Temperature **>= 1.0** để đảm bảo creativity
- Random seed **khác nhau** mỗi lần
- Topics được **shuffle** và chọn ngẫu nhiên

## Monitoring

### Metrics to Track
- **Topic diversity rate**: % topics unique trong 10 requests
- **Temperature usage**: Average temperature per request
- **Seed uniqueness**: % requests với unique seed
- **Repetition rate**: % topics bị lặp lại

## Kết luận

Với các cải tiến này:
- ✅ **Random seed** cho mỗi request
- ✅ **High temperature** (1.1) cho creativity
- ✅ **Sampling parameters** (top_p, penalties) để tránh repetition
- ✅ **Shuffled topic selection** trong Python
- ✅ **Randomized user messages** với variations
- ✅ **Enhanced system prompts** nhấn mạnh diversity

Hệ thống giờ sẽ tạo ra **chủ đề đa dạng** mỗi lần, không còn lặp lại.

