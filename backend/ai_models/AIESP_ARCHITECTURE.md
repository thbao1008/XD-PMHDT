# AiESP Architecture - Kiến trúc mở rộng

## Tổng quan

AiESP là AI phụ trợ với kiến trúc mở rộng, có thể phát triển nhiều tính năng:
- **TellMeYourStory** (conversation_ai)
- **SpeakingPractice** (speaking_practice)
- **TranslationCheck** (translation_check)
- Và các tính năng mới trong tương lai

## Nguyên tắc hoạt động

### 1. AiESP là nhân tố phản hồi chính
- AiESP được gọi TRƯỚC để phản hồi user
- Nếu AiESP chưa sẵn sàng hoặc accuracy thấp, fallback về OpenRouter

### 2. OpenRouter hỗ trợ học tập
- OpenRouter được gọi SONG SONG (không block response)
- OpenRouter responses được lưu vào database để AiESP học
- AiESP tự động train mỗi 50 samples

### 3. Kiến trúc mở rộng
- Mỗi task type có logic riêng trong `AiESP.generate_response()`
- Dễ dàng thêm task types mới bằng cách:
  1. Thêm method `_generate_<task_type>_response()` trong AiESP
  2. Thêm case trong `generate_response()`
  3. Thêm training logic trong `_train_<task_type>()`

## Cấu trúc Code

### Backend Services

#### `storyService.js`
```javascript
// 1. Gọi AiESP trước (nhân tố chính)
const aiESPResponse = await assistantAIService.generateConversationResponse(...);

// 2. Nếu AiESP phản hồi, dùng nó
if (aiESPResponse) {
  // Gọi OpenRouter song song để học (không block)
  generateStoryResponseFallback(...).then(openRouterResponse => {
    // Lưu để AiESP học
    assistantAIService.learnFromOpenRouterConversation(...);
  });
  return aiESPResponse;
}

// 3. Nếu AiESP chưa sẵn sàng, dùng OpenRouter
const openRouterResponse = await generateStoryResponseFallback(...);
// Lưu để AiESP học
assistantAIService.learnFromOpenRouterConversation(...);
return openRouterResponse;
```

#### `assistantAIService.js`
- `generateConversationResponse()` - Gọi AiESP cho conversation
- `learnFromOpenRouterConversation()` - Lưu OpenRouter response để học
- `trainAssistantAI()` - Train AiESP với dữ liệu đã thu thập

### Python AI Model

#### `assistantAI.py` (AiESP)
```python
class AiESP:
    def generate_response(self, input_data):
        # Route đến method phù hợp dựa trên task_type
        if self.task_type == 'conversation_ai':
            return self._generate_conversation_response(input_data)
        elif self.task_type == 'speaking_practice':
            return self._generate_speaking_practice_response(input_data)
        # ...
    
    def train(self, task_type):
        # Train dựa trên task_type
        if task_type == 'conversation_ai':
            self._train_conversation(...)
        # ...
```

## Database Schema

### `assistant_ai_training`
Lưu training data từ OpenRouter:
- `task_type`: Loại task (conversation_ai, speaking_practice, etc.)
- `input_data`: Input từ user
- `expected_output`: Response từ OpenRouter (để AiESP học)

### `assistant_ai_models`
Lưu models đã train:
- `task_type`: Loại task
- `accuracy_score`: Độ chính xác (0-1)
- `model_state`: Patterns/parameters đã học

## Thêm tính năng mới

### Bước 1: Thêm method trong AiESP
```python
def _generate_new_feature_response(self, input_data):
    # Logic cho tính năng mới
    return "Response"
```

### Bước 2: Thêm case trong generate_response()
```python
elif self.task_type == 'new_feature':
    return self._generate_new_feature_response(input_data)
```

### Bước 3: Thêm training logic
```python
def _train_new_feature(self, cursor, training_samples):
    # Logic training cho tính năng mới
    pass
```

### Bước 4: Thêm service method
```javascript
// assistantAIService.js
export async function generateNewFeatureResponse(input) {
  // Gọi AiESP với task_type='new_feature'
}
```

## Training Process

1. **Thu thập dữ liệu**: OpenRouter responses được lưu vào `assistant_ai_training`
2. **Trigger training**: Tự động train mỗi 50 samples
3. **Lưu model**: Model được lưu vào `assistant_ai_models` với accuracy score
4. **Sử dụng**: AiESP sử dụng model đã train để phản hồi

## Accuracy Thresholds

- **< 0.5**: Dùng rule-based (đơn giản, nhanh)
- **0.5 - 0.7**: Dùng model-based nhưng vẫn fallback về rule-based
- **>= 0.7**: Dùng model-based (patterns đã học)
- **>= 0.85**: Sẵn sàng làm nhân tố chính (isAssistantAIReady)

## Lợi ích

1. **Tốc độ**: AiESP phản hồi nhanh hơn OpenRouter (local, không cần API call)
2. **Chi phí**: Giảm chi phí API calls khi AiESP đủ thông minh
3. **Mở rộng**: Dễ dàng thêm tính năng mới
4. **Học tập**: Tự động học từ OpenRouter, cải thiện liên tục
5. **Độc lập**: Có thể hoạt động độc lập khi đủ thông minh

