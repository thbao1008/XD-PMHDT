# AI Flow - Luồng hoạt động từ Frontend đến OpenRouter

## Tổng quan

Hệ thống AI được thiết kế với luồng: **Frontend → Backend → AI Models Training → OpenRouter → Response**

## Luồng hoạt động

```
┌─────────────┐
│  Frontend   │
│  (React)    │
└──────┬──────┘
       │
       │ API Request
       ▼
┌─────────────────────┐
│   Backend Service   │
│ speakingPractice    │
│ Service.js          │
└──────┬──────────────┘
       │
       │ Call trainedAIService
       ▼
┌─────────────────────┐
│  trainedAIService   │
│  .js                │
│  (Wrapper Layer)    │
└──────┬──────────────┘
       │
       │ Call Python Trainer
       ▼
┌─────────────────────┐
│  comprehensiveAI    │
│  Trainer.py         │
│  (Training Layer)   │
└──────┬──────────────┘
       │
       │ Generate System Prompt
       ▼
┌─────────────────────┐
│  trainedAIService   │
│  .js                │
│  (Wrapper Layer)    │
└──────┬──────────────┘
       │
       │ Call OpenRouter
       ▼
┌─────────────────────┐
│   OpenRouter API    │
│   (AI Provider)     │
└──────┬──────────────┘
       │
       │ AI Response
       ▼
┌─────────────────────┐
│   Backend Service   │
│   (Process & Save)  │
└──────┬──────────────┘
       │
       │ JSON Response
       ▼
┌─────────────┐
│  Frontend   │
│  (Display)  │
└─────────────┘
```

## Chi tiết từng bước

### 1. Frontend Request
```javascript
// Frontend gọi API
const response = await api.post('/learners/speaking-practice/prompt', {
  sessionId: '123',
  round: 1,
  level: 2
});
```

### 2. Backend Controller
```javascript
// backend/src/controllers/speakingPracticeController.js
export async function getPrompt(req, res) {
  const { sessionId } = req.params;
  const { round, level } = req.query;
  
  // Gọi service
  const prompt = await speakingPracticeService.getPromptForRound(
    level, round, learnerId, sessionId
  );
  
  res.json({ prompt, time_limit: timeLimit });
}
```

### 3. Backend Service
```javascript
// backend/src/services/speakingPracticeService.js
export async function getPromptForRound(level, roundNumber, learnerId, sessionId) {
  // Lấy personalization context từ continuous learning
  const personalizationContext = await getPersonalizationContext(learnerId, sessionId);
  
  // Gọi trained AI service
  const trainingData = await getTrainingDataFromPython('prompt_generator', {
    level, usedTopics, usedPrompts, learnerId, sessionId, personalizationContext
  });
  
  // Gọi OpenRouter qua trainedAIService
  const response = await trainedAIService.callTrainedAI(
    'prompt_generator', options, messages, aiOpts
  );
}
```

### 4. Trained AI Service (Wrapper)
```javascript
// backend/src/services/trainedAIService.js
export async function callTrainedAI(trainingType, options, messages, aiOpts) {
  // 1. Gọi Python trainer để tạo training data
  const trainingData = await getTrainingDataFromPython(trainingType, options);
  
  // 2. Tạo messages với system prompt từ training
  const trainedMessages = [
    { role: 'system', content: trainingData.system_prompt },
    ...userMessages
  ];
  
  // 3. Gọi OpenRouter với trained messages
  const response = await aiService.callOpenRouter(trainedMessages, aiOpts);
  
  return response;
}
```

### 5. Python Trainer
```python
# backend/ai_models/comprehensiveAITrainer.py
def train_prompt_generator(level, used_topics, used_prompts, 
                           learner_id, personalization_context):
    # Tạo system prompt với cường độ tư duy cao
    system_prompt = f"""You are an expert AI trained on IDLE principles...
    
    PERSONALIZATION CONTEXT:
    - Recommended Level: {personalization_context.recommended_level}
    - Preferred Topics: {personalization_context.preferred_topics}
    - Focus Areas: {personalization_context.focus_areas}
    
    ADAPTIVE THINKING:
    - Analyze learner's past performance patterns
    - Adjust difficulty dynamically
    - Personalize content to match learning style
    """
    
    return {
        'system_prompt': system_prompt,
        'config': { 'temperature': 0.95, 'max_tokens': 250 }
    }
```

### 6. OpenRouter API
```javascript
// backend/src/services/aiService.js
export async function callOpenRouter(messages, opts) {
  const response = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OR_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: trainedMessages,  // Với system prompt từ training
      temperature: 0.95,
      max_tokens: 250
    })
  });
  
  return response.json();
}
```

### 7. Response Flow
```javascript
// OpenRouter response
{
  choices: [{
    message: {
      content: '{"topic": "Travel", "suggested_prompt": "I love traveling..."}'
    }
  }]
}

// Backend process
const result = JSON.parse(response.choices[0].message.content);
// Lưu vào database
await pool.query('INSERT INTO ai_generated_prompts...');

// Return to frontend
res.json({ prompt: result.suggested_prompt });
```

## 3 Loại Training

### 1. Prompt Generator
- **Input:** level, usedTopics, usedPrompts, learnerId, personalizationContext
- **Training:** comprehensiveAITrainer.py → train_prompt_generator()
- **Output:** System prompt với IDLE principles, TPACK model, personalization
- **Use Case:** Tạo topics và prompts đa dạng cho speaking practice

### 2. Conversation AI
- **Input:** topic, conversation_history
- **Training:** comprehensiveAITrainer.py → train_conversation_ai()
- **Output:** System prompt với Social Cognitive Theory, IDLE framework
- **Use Case:** "Tell me your story" - trò chuyện tự nhiên như Gemini

### 3. Quick Analysis
- **Input:** transcript, expected_text, level
- **Training:** comprehensiveAITrainer.py → train_quick_analysis()
- **Output:** System prompt với TPACK model, motivation-focused feedback
- **Use Case:** Phân tích nhanh pronunciation, fluency, completeness

## Continuous Learning Integration

### Personalization Flow
```
1. Learner completes session
   ↓
2. Continuous Learning Engine analyzes performance
   ↓
3. Creates adaptive strategy & personalization context
   ↓
4. Next session uses personalization context
   ↓
5. AI generates personalized prompts
```

### Data Flow
```
Session Data → Continuous Learning Engine
  ↓
Performance Analysis
  ↓
Pattern Recognition
  ↓
Trend Analysis
  ↓
Adaptive Strategy
  ↓
Personalization Context
  ↓
Next Training Session
```

## Error Handling & Fallback

### Fallback Strategy
1. **Python Trainer fails** → Use direct OpenRouter call
2. **OpenRouter fails** → Use hardcoded prompts
3. **Personalization fails** → Use default level-based prompts

### Error Logging
- All errors logged with context
- Fallback actions logged
- Performance metrics tracked

## Configuration

### Environment Variables
```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_API_BASE=https://openrouter.ai/api/v1
```

### Python Dependencies
- No external dependencies needed (uses standard library)
- Optional: numpy, scikit-learn for advanced features

## Testing

### Test Python Trainer
```bash
python backend/ai_models/comprehensiveAITrainer.py prompt_generator 2 "" "" "[]" "[]" 0 "{}"
```

### Test Continuous Learning
```bash
python backend/ai_models/continuousLearningEngine.py analyze 1 '{"scores": [5,6,7], "topics": ["Travel"]}'
```

## Performance Optimization

### Caching
- Training data cached for same parameters
- Personalization context cached per learner
- System prompts cached per training type

### Parallel Processing
- Multiple rounds analyzed in parallel (batch size: 3)
- Async Python calls
- Non-blocking OpenRouter requests

## Monitoring

### Metrics to Track
- Training data generation time
- OpenRouter API response time
- Personalization accuracy
- Fallback rate
- Error rate

## Kết luận

Hệ thống AI được thiết kế với:
- ✅ **Training Layer:** Python trainers với cường độ tư duy cao
- ✅ **Wrapper Layer:** trainedAIService.js để tích hợp
- ✅ **Continuous Learning:** Adaptive và personalization
- ✅ **Error Handling:** Robust fallback mechanisms
- ✅ **Performance:** Optimized với caching và parallel processing

Tất cả AI calls đi qua training layer để đảm bảo chất lượng và cá nhân hóa cao.

