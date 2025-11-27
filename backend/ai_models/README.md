# AI Models - Hướng dẫn sử dụng

Thư mục này chứa các AI models và services được sử dụng trong hệ thống.

## 📁 Cấu trúc thư mục

```
ai_models/
├── .env                    # File cấu hình (API keys, URLs)
├── comprehensiveAITrainer.py    # AI trainer chính (prompt generation, conversation, analysis)
├── transcribe_whisperx.py       # WhisperX transcription service
├── csm_service.py              # CSM Text-to-Speech service
├── assistantAI.py              # Assistant AI service
├── challengeCreatorTrainer.py   # Challenge creator trainer
├── aiespContinuousLearning.py  # Continuous learning engine
└── csm/                        # CSM library files
```

## 🔧 Cài đặt

### 1. Cài đặt Python dependencies

```bash
# Cài đặt WhisperX và dependencies
pip install whisperx torch torchaudio

# Cài đặt CSM dependencies
cd csm
pip install -r requirements.txt
cd ..

# Cài đặt các dependencies khác
pip install langdetect openai
```

### 2. Cấu hình .env

Tạo file `.env` trong thư mục `backend/ai_models/` với nội dung:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
USE_CSM_TTS=true
```

### 3. Sửa lỗi Torch/Torchvision (nếu cần)

Nếu gặp lỗi `torchvision::nms does not exist`:

```bash
python backend/scripts/fix_torchvision.py
```

Hoặc thủ công:
```bash
pip uninstall torch torchvision -y
pip install torch torchvision
```

## 🚀 Sử dụng các AI Services

### 1. Comprehensive AI Trainer

AI trainer chính cho prompt generation, conversation và analysis.

**Cách sử dụng:**
```bash
# Generate prompt cho speaking practice
python comprehensiveAITrainer.py prompt_generator <level> [used_topics] [used_prompts] [topics_json] [challenges_json]

# Conversation AI
python comprehensiveAITrainer.py conversation_ai [topic] [history_json]

# Quick analysis
python comprehensiveAITrainer.py quick_analysis <transcript> [expected] [level]
```

**Được gọi từ:**
- `speakingPracticeService.js` - Generate prompts và analyze pronunciation
- `scenarioService.js` - Generate scenarios
- `storyService.js` - Generate story responses
- `trainedAIService.js` - AI service wrapper

### 2. WhisperX Transcription

Service chuyển đổi audio thành text (speech-to-text).

**Cách sử dụng:**
```bash
python transcribe_whisperx.py <audio_path> [--model base|small|medium|large] [--device cpu|cuda]
```

**Được gọi từ:**
- `whisperxRunner.js` - Background transcription jobs
- `speakingPracticeService.js` - Transcribe speaking practice audio

**Lưu ý:**
- Model mặc định: `base` (nhanh, độ chính xác tốt)
- Hỗ trợ GPU (CUDA) nếu có NVIDIA card
- Tự động fallback về CPU nếu GPU không khả dụng

### 3. CSM Text-to-Speech

Service chuyển đổi text thành speech (text-to-speech) sử dụng CSM model.

**Cách sử dụng:**
```bash
python csm_service.py generate <text> <speaker_id> [context_json]
```

**Được gọi từ:**
- `csmTtsService.js` - Generate speech cho frontend
- `storyController.js` - TTS cho stories

**Lưu ý:**
- Speaker ID: 0 = nữ, 1 = nam
- Lần đầu load model có thể mất 60 giây
- Tự động fallback về FPT.AI nếu CSM fail

### 4. Assistant AI

AI assistant cho translation checking và các tasks khác.

**Cách sử dụng:**
```bash
python assistantAI.py check_translation <english_text> <vietnamese_translation>
```

**Được gọi từ:**
- `assistantAIService.js` - Check translations

### 5. Challenge Creator Trainer

Trainer cho challenge creation.

**Cách sử dụng:**
```bash
python challengeCreatorTrainer.py
```

**Được gọi từ:**
- `mentorAiService.js` - Generate challenges

### 6. Continuous Learning Engine

Engine tự động học từ user interactions.

**Cách sử dụng:**
```bash
# Check status
python aiespContinuousLearning.py check [task_type]

# Train specific task
python aiespContinuousLearning.py train [task_type]

# Train all tasks
python aiespContinuousLearning.py train-all

# Monitor
python aiespContinuousLearning.py monitor

# Continuous learning mode
python aiespContinuousLearning.py continuous [interval_seconds]
```

**Được gọi từ:**
- `mentorDashboardService.js` - Continuous learning automation

## 🔍 Troubleshooting

### Lỗi "OPENROUTER_API_KEY is not set"
- Kiểm tra file `.env` có tồn tại trong `backend/ai_models/`
- Đảm bảo `OPENROUTER_API_KEY` được set trong file `.env`

### Lỗi "Cannot set headers after they are sent"
- Đã được fix trong `storyController.js`
- Đảm bảo chỉ gửi response một lần

### Lỗi "TTS request timeout"
- CSM model load lần đầu mất ~60 giây
- Timeout được set là 70 giây
- Nếu vẫn timeout, kiểm tra RAM/disk space

### Lỗi "The paging file is too small"
- Tăng virtual memory (paging file) trong Windows
- Hoặc tắt CSM và dùng FPT.AI: `USE_CSM_TTS=false` trong `.env`

### Lỗi Torchvision compatibility
- Chạy: `python backend/scripts/fix_torchvision.py`
- Hoặc reinstall: `pip uninstall torch torchvision -y && pip install torch torchvision`

## 📝 Notes

- Tất cả Python scripts sử dụng UTF-8 encoding
- Windows compatibility đã được xử lý
- GPU support tự động detect và fallback về CPU nếu cần
- Tất cả services có error handling và logging

