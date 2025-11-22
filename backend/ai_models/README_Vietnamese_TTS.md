# Vietnamese TTS Service - Giọng Đọc AI Nữ Tiếng Việt

## Tổng quan

Service này tích hợp giọng đọc AI nữ tiếng Việt dựa trên tài liệu: [Top giọng đọc AI nữ tiếng Việt](https://news.centrix.im/top-giong-doc-ai-nu-tieng-viet-de-nghe-chuan-mien-bac-mien-nam/)

## Tính năng

- ✅ Hỗ trợ giọng nữ tiếng Việt (miền Bắc và miền Nam)
- ✅ Tích hợp với FPT.AI TTS API
- ✅ Tích hợp với Vbee TTS API
- ✅ Hỗ trợ Coqui TTS (mã nguồn mở)
- ✅ Giọng nam/nữ bản địa hoặc châu Á

## Cài đặt

### 1. Cài đặt dependencies

```bash
pip install requests
# Optional: Cho Coqui TTS
pip install TTS
```

### 2. Cấu hình API Keys

Thêm vào file `.env`:

```env
FPT_AI_API_KEY=your_fpt_api_key
VBEE_API_KEY=your_vbee_api_key
USE_COQUI_TTS=false  # true nếu muốn dùng Coqui TTS
```

## Sử dụng

### Trong Python

```python
from vietnamese_tts_service import VietnameseTTSService

service = VietnameseTTSService()

# Giọng nữ Việt Nam miền Bắc
audio = service.generate_speech(
    text="Xin chào! Tôi là bạn AI của bạn.",
    voice_type='female',
    voice_origin='asian',
    region='north'
)

# Giọng nữ Việt Nam miền Nam
audio = service.generate_speech(
    text="Xin chào! Tôi là bạn AI của bạn.",
    voice_type='female',
    voice_origin='asian',
    region='south'
)
```

### Trong Node.js (Backend)

Có thể gọi Python script từ Node.js:

```javascript
const { spawn } = require('child_process');

function generateVietnameseTTS(text, voiceType, voiceOrigin, region) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [
      'backend/ai_models/vietnamese_tts_service.py',
      text,
      voiceType,
      voiceOrigin,
      region
    ]);
    
    let audioData = Buffer.alloc(0);
    
    python.stdout.on('data', (data) => {
      audioData = Buffer.concat([audioData, data]);
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        resolve(audioData);
      } else {
        reject(new Error(`Python script exited with code ${code}`));
      }
    });
  });
}
```

## Train Model TTS (Nâng cao)

Nếu muốn train model TTS riêng với giọng Việt Nam:

### 1. Chuẩn bị dữ liệu

- Thu thập audio giọng nữ tiếng Việt (16kHz-48kHz, không nhiễu)
- Chia nhỏ thành các câu, kèm transcript
- Tối thiểu 10-20 giờ audio

### 2. Sử dụng Coqui TTS

```bash
# Cài đặt
pip install TTS

# Train model
tts train \
  --config_path config.json \
  --train_path /path/to/training/data \
  --output_path /path/to/output/model
```

### 3. Fine-tune model có sẵn

```python
from TTS.api import TTS

# Load model có sẵn
tts = TTS(model_name="tts_models/vi/css10/vits")

# Fine-tune với dữ liệu của bạn
tts.fine_tune(
    train_path="/path/to/your/data",
    output_path="/path/to/finetuned/model"
)
```

## API Endpoints (Tùy chọn)

Có thể tạo API endpoint để frontend gọi:

```javascript
// backend/src/routes/ttsRoutes.js
router.post('/tts/generate', async (req, res) => {
  const { text, voiceType, voiceOrigin, region } = req.body;
  
  // Gọi Python service
  const audio = await generateVietnameseTTS(text, voiceType, voiceOrigin, region);
  
  res.setHeader('Content-Type', 'audio/wav');
  res.send(audio);
});
```

## Lưu ý

1. **API Keys**: Cần đăng ký tài khoản với FPT.AI hoặc Vbee để lấy API key
2. **Chi phí**: Một số API có thể tính phí theo số lượng request
3. **Fallback**: Nếu API không khả dụng, frontend sẽ sử dụng SpeechSynthesis API của browser
4. **Giọng bản địa**: Giọng nam/nữ bản địa (tiếng Anh) được xử lý trực tiếp ở frontend bằng SpeechSynthesis API

## Tài liệu tham khảo

- [FPT.AI TTS Documentation](https://fpt.ai/tts)
- [Vbee TTS Documentation](https://vbee.vn)
- [Coqui TTS Documentation](https://github.com/coqui-ai/TTS)
- [Top giọng đọc AI nữ tiếng Việt](https://news.centrix.im/top-giong-doc-ai-nu-tieng-viet-de-nghe-chuan-mien-bac-mien-nam/)

