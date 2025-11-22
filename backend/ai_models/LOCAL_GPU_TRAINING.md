# 🚀 Local GPU Training - Training với GPU trên Máy Tính

## Tổng quan

Hệ thống training AiESP trực tiếp trên GPU của máy tính local, tận dụng full hiệu suất GPU:
- ✅ **Tự động detect GPU** và sử dụng nếu có
- ✅ **Full GPU performance** với PyTorch CUDA
- ✅ **Tự động tìm tài liệu** từ internet để học hỏi
- ✅ **Tích hợp continuous learning** - tự động chạy khi cần
- ✅ **Web learning** - tự động thu thập samples từ web

## Yêu cầu

### 1. Cài đặt Dependencies

```bash
pip install -r backend/ai_models/requirements_assistant_ai.txt
```

Hoặc cài đặt thủ công:
```bash
pip install torch psycopg2-binary python-dotenv requests beautifulsoup4 numpy scikit-learn
```

### 2. Kiểm tra GPU

```bash
npm run aiesp:gpu:check
```

Hoặc:
```bash
python backend/ai_models/localGPUTraining.py check-gpu
```

**Output (có NVIDIA GPU):**
```json
{
  "cuda_available": true,
  "nvidia_gpu_available": true,
  "nvidia_gpu_index": 0,
  "nvidia_gpu_name": "NVIDIA GeForce RTX 3060",
  "device": "cuda:0",
  "torch_available": true,
  "total_gpus": 2,
  "all_gpus": ["NVIDIA GeForce RTX 3060", "AMD Radeon Graphics"]
}
```

**Lưu ý:** Hệ thống tự động ưu tiên **NVIDIA GPU (rời)** và bỏ qua GPU tích hợp AMD.

## Sử dụng

### 1. Train một Task Type

```bash
npm run aiesp:gpu:train conversation_ai
```

Hoặc:
```bash
python backend/ai_models/localGPUTraining.py train conversation_ai
```

### 2. Train tất cả Task Types

```bash
npm run aiesp:gpu:train
```

Hoặc:
```bash
python backend/ai_models/localGPUTraining.py train-all
```

### 3. Train với Web Learning

Tự động tìm thêm training data từ internet:

```bash
npm run aiesp:gpu:train:web
```

Hoặc:
```bash
python backend/ai_models/localGPUTraining.py train-all --web-learning
```

### 4. Cleanup Files

Xóa các file không còn sử dụng:

```bash
npm run aiesp:cleanup
```

Hoặc:
```bash
python backend/ai_models/localGPUTraining.py cleanup
```

## Tự Động Hóa

### Tích hợp vào Continuous Learning

Hệ thống continuous learning sẽ **tự động**:
- ✅ Check GPU availability mỗi 10 phút
- ✅ Tự động train với GPU nếu có
- ✅ Sử dụng web learning để tìm thêm data
- ✅ Chạy background, không block main process

**Chạy continuous learning:**
```bash
npm run aiesp:learn
```

Hệ thống sẽ tự động:
1. Monitor tất cả models
2. Generate samples nếu cần
3. **Check và train với GPU local** (mỗi 10 phút)
4. Check Colab training (mỗi 30 phút)

## GPU Performance Optimization

### Tự động tối ưu

Code tự động:
- ✅ **NVIDIA GPU detection** - Tự động detect và ưu tiên NVIDIA GPU (rời)
- ✅ **Bỏ qua AMD GPU tích hợp** - Chỉ sử dụng NVIDIA GPU để training
- ✅ **Batch processing** - xử lý patterns theo batch để tận dụng GPU
- ✅ **CUDA optimization** - `torch.backends.cudnn.benchmark = True`
- ✅ **Memory optimization** - `max_split_size_mb:512`
- ✅ **Full GPU utilization** - sử dụng toàn bộ NVIDIA GPU memory

### NVIDIA GPU Priority

Hệ thống tự động:
1. **Detect NVIDIA GPU** - Tìm GPU có tên chứa: "nvidia", "geforce", "rtx", "gtx", "quadro", "tesla"
2. **Ưu tiên GPU rời** - Bỏ qua GPU tích hợp (AMD)
3. **Set CUDA_VISIBLE_DEVICES** - Chỉ hiển thị NVIDIA GPU cho PyTorch

### Manual Optimization

Nếu muốn tối ưu thêm, set environment variables:

```bash
# Windows PowerShell (sử dụng NVIDIA GPU index từ check-gpu)
$env:CUDA_VISIBLE_DEVICES="0"  # Index của NVIDIA GPU
$env:PYTORCH_CUDA_ALLOC_CONF="max_split_size_mb:512"

# Linux/Mac
export CUDA_VISIBLE_DEVICES=0  # Index của NVIDIA GPU
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
```

## Web Learning

### Tự động tìm tài liệu

Khi bật `--web-learning`, hệ thống sẽ:
- ✅ Tìm conversation examples từ internet
- ✅ Generate training samples từ patterns
- ✅ Lưu vào database tự động
- ✅ Sử dụng để train ngay

### Sources

Hệ thống tìm từ:
- Reddit (r/EnglishLearning, r/languagelearning)
- Quora (English Language Learning)
- Generated patterns dựa trên topic

## Task Types

Hỗ trợ 4 task types:
1. **conversation_ai** - Kể chuyện và lắng nghe
2. **speaking_practice** - Practice và luyện tập
3. **game_conversation** - Game trò chuyện với NPCs
4. **translation_check** - Kiểm tra translation

## Workflow

```
1. Continuous Learning chạy
   ↓
2. Check GPU availability (mỗi 10 phút)
   ↓
3. Nếu GPU available:
   - Load training data từ database
   - Web learning (nếu bật)
   - Train với GPU (full performance)
   - Save model vào database
   ↓
4. Monitor và đánh giá performance
```

## Lợi Ích

- ✅ **Nhanh hơn**: GPU training nhanh hơn CPU nhiều lần
- ✅ **Tự động**: Không cần can thiệp thủ công
- ✅ **Full performance**: Tận dụng toàn bộ GPU
- ✅ **Web learning**: Tự động tìm thêm data
- ✅ **Continuous**: Tự động chạy khi cần

## Troubleshooting

### GPU không available

Nếu GPU không available:
- Code sẽ tự động fallback về CPU
- Training vẫn chạy được, chỉ chậm hơn
- Check GPU với: `npm run aiesp:gpu:check`

### PyTorch không cài đặt

```bash
pip install torch
```

### CUDA version mismatch

Cài đặt PyTorch với CUDA version phù hợp:
```bash
# CUDA 11.8
pip install torch --index-url https://download.pytorch.org/whl/cu118

# CUDA 12.1
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

### Memory error

Giảm batch size trong code hoặc giảm số samples:
- Edit `localGPUTraining.py`
- Giảm `batch_size` hoặc `LIMIT` trong SQL query

## Lợi Ích Local GPU Training

- ✅ **Tốc độ cao**: Training nhanh với GPU local
- ✅ **Tự động hoàn toàn**: Không cần can thiệp thủ công
- ✅ **Full control**: Kiểm soát hoàn toàn quá trình training
- ✅ **Cost-effective**: Không tốn chi phí cloud
- ✅ **Privacy**: Data không rời khỏi máy local

## Next Steps

Sau khi setup Local GPU Training:

1. **Chạy continuous learning:**
   ```bash
   npm run aiesp:learn
   ```

2. **Monitor performance:**
   ```bash
   npm run aiesp:monitor
   ```

3. **Check current AI:**
   ```bash
   npm run check:current-ai
   ```

4. **Generate samples nếu cần:**
   ```bash
   npm run aiesp:generate
   ```

