# CSM Integration Setup Guide

## 📋 Tổng Quan

CSM (Conversational Speech Model) đã được tích hợp vào "Tell Me Your Story" để cải thiện chất lượng giọng nói AI.

## 🚀 Setup

### 1. Prerequisites

- **CUDA-compatible GPU** (bắt buộc)
- **Python 3.10+** (recommended)
- **CUDA 12.4+** (tested)
- **Hugging Face account** với access to:
  - [CSM-1B](https://huggingface.co/sesame/csm-1b)
  - [Llama-3.2-1B](https://huggingface.co/meta-llama/Llama-3.2-1B)

### 2. Install Dependencies

#### Windows (PowerShell):
```powershell
cd backend/ai_models
.\setup_csm.ps1
```

#### Linux/Mac:
```bash
cd backend/ai_models
chmod +x setup_csm.sh
./setup_csm.sh
```

#### Manual:
```bash
cd backend/ai_models/csm
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Windows only:
pip install triton-windows

# Set environment variable
export NO_TORCH_COMPILE=1  # Windows: $env:NO_TORCH_COMPILE="1"
```

### 3. Login to Hugging Face

```bash
huggingface-cli login
```

Nhập token từ [Hugging Face Settings](https://huggingface.co/settings/tokens)

### 4. Test CSM

```bash
cd backend/ai_models
python csm_service.py check
```

Kết quả mong đợi:
```json
{
  "success": true,
  "available": true,
  "device": "cuda",
  "sample_rate": 24000
}
```

### 5. Enable CSM in Application

Thêm vào `.env`:
```env
USE_CSM_TTS=true
```

## 🎯 Usage

### Automatic (Recommended)

CSM sẽ tự động được sử dụng khi:
- `USE_CSM_TTS=true` trong `.env`
- GPU available
- CSM service hoạt động

Nếu CSM fail, sẽ tự động fallback về FPT.AI TTS.

### Manual Control

Frontend có thể control CSM usage:
```javascript
// Enable CSM
await api.post('/learners/tts/generate', {
  text: "Hello",
  useCSM: true,
  context: [] // Optional conversation context
});

// Disable CSM (use FPT.AI)
await api.post('/learners/tts/generate', {
  text: "Hello",
  useCSM: false
});
```

## 🔧 Configuration

### Environment Variables

- `USE_CSM_TTS`: Enable/disable CSM (default: `true` if GPU available)
- `NO_TORCH_COMPILE`: Disable lazy compilation in Mimi (set to `1`)

### CSM Parameters

- `speaker`: Speaker ID (0 = first speaker, 1 = second speaker)
- `max_audio_length_ms`: Max audio length (default: 10000ms = 10s)
- `context`: Conversation history for context-aware generation

## 📊 Performance

### Latency
- **CSM**: ~2-5 seconds (depends on GPU)
- **FPT.AI**: ~1-2 seconds
- **Browser TTS**: <100ms

### Quality
- **CSM**: ⭐⭐⭐⭐⭐ (Best - neural generation, context-aware)
- **FPT.AI**: ⭐⭐⭐⭐ (Good - natural Vietnamese)
- **Browser TTS**: ⭐⭐ (Basic - no context)

## 🐛 Troubleshooting

### CSM not loading

1. **Check GPU**:
   ```bash
   python -c "import torch; print(torch.cuda.is_available())"
   ```

2. **Check Hugging Face access**:
   ```bash
   huggingface-cli whoami
   ```

3. **Check CSM service**:
   ```bash
   python backend/ai_models/csm_service.py check
   ```

### Out of Memory

- Reduce `max_audio_length_ms` (default: 10000)
- Use smaller batch size
- Check GPU memory: `nvidia-smi`

### Slow Generation

- Ensure GPU is being used (check `device: "cuda"` in check output)
- Reduce `max_audio_length_ms`
- Check GPU utilization: `nvidia-smi`

### Windows Issues

- Use `triton-windows` instead of `triton`
- Ensure CUDA toolkit is installed
- Check Python version (3.10+ recommended)

## 📝 Files Created

- `backend/ai_models/csm/` - CSM repository (cloned)
- `backend/ai_models/csm_service.py` - Python service wrapper
- `backend/services/learner-service/src/services/csmTtsService.js` - Node.js wrapper
- `backend/ai_models/setup_csm.sh` - Linux/Mac setup script
- `backend/ai_models/setup_csm.ps1` - Windows setup script

## 🔗 References

- [CSM GitHub](https://github.com/SesameAILabs/csm)
- [CSM Hugging Face](https://huggingface.co/sesame/csm-1b)
- [CSM Integration Analysis](./CSM_INTEGRATION_ANALYSIS.md)

## ✅ Next Steps

1. ✅ Clone CSM repository
2. ✅ Setup Python environment
3. ✅ Install dependencies
4. ✅ Login to Hugging Face
5. ✅ Test CSM service
6. ✅ Enable in application
7. ✅ Test in "Tell Me Your Story"

## 🎉 Success!

Nếu tất cả steps thành công, CSM sẽ tự động được sử dụng trong "Tell Me Your Story" với chất lượng giọng nói tốt hơn!

