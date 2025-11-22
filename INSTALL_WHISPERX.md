# Hướng dẫn cài đặt WhisperX với CUDA 12.1

## ✅ Yêu cầu hệ thống

- **Python**: 3.8+ (khuyến nghị 3.12)
- **GPU**: NVIDIA với CUDA 12.1 support
- **PyTorch**: 2.5.1+cu121 (đã cài - version CUDA cao nhất hiện có)
- **CUDA Toolkit**: 12.1 (nếu cần)

## 🔍 Bước 1: Kiểm tra Python và PyTorch

Mở PowerShell hoặc Command Prompt và chạy:

```bash
# Kiểm tra Python
py -3 --version

# Kiểm tra PyTorch và CUDA
py -3 -c "import torch; print('PyTorch:', torch.__version__); print('CUDA:', torch.version.cuda); print('GPU:', torch.cuda.is_available())"
```

**Kết quả mong đợi:**
```
Python 3.12.7
PyTorch: 2.5.1+cu121
CUDA: 12.1
GPU: True
```

Nếu GPU = False, kiểm tra lại cài đặt PyTorch với CUDA.

## 📦 Bước 2: Cài đặt WhisperX (QUAN TRỌNG: Giữ PyTorch CUDA)

### ⚠️ LƯU Ý QUAN TRỌNG:
**KHÔNG được để pip tự động cài PyTorch CPU!** Phải chỉ định rõ để giữ PyTorch CUDA.

### Cách 1: Cài WhisperX KHÔNG thay đổi PyTorch (Khuyến nghị)

```bash
# Bước 1: Kiểm tra PyTorch hiện tại
py -3 -c "import torch; print('PyTorch:', torch.__version__); print('CUDA:', torch.version.cuda if torch.cuda.is_available() else 'CPU')"

# Bước 2: Cài WhisperX KHÔNG dependencies (QUAN TRỌNG!)
py -3 -m pip install whisperx --no-deps

# Bước 3: Cài faster-whisper KHÔNG dependencies (QUAN TRỌNG!)
py -3 -m pip install faster-whisper --no-deps

# Bước 4: Cài NumPy 2.0.2 (QUAN TRỌNG - Theo yêu cầu của WhisperX 3.7.4)
py -3 -m pip install "numpy>=2.0.2,<2.1.0"

# Bước 5: Cài các dependencies cần thiết
py -3 -m pip install transformers
py -3 -m pip install "pyannote-audio>=3.3.2,<4.0.0" --no-deps
py -3 -m pip install lightning pytorch-lightning pyannote-core pyannote-database pyannote-metrics pyannote-pipeline pyannoteai-sdk torch-audiomentations opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp

# Bước 5: Kiểm tra lại PyTorch không bị thay đổi
py -3 -c "import torch; print('PyTorch:', torch.__version__); print('CUDA:', torch.version.cuda if torch.cuda.is_available() else 'CPU'); print('GPU:', torch.cuda.is_available())"
```

### Cách 2: Cài WhisperX với constraint PyTorch

```bash
# Cài WhisperX nhưng giữ nguyên PyTorch hiện tại
py -3 -m pip install whisperx --constraint "torch==2.5.1+cu121"

# Hoặc nếu constraint không hoạt động:
py -3 -m pip install whisperx --no-deps
py -3 -m pip install faster-whisper --no-deps
py -3 -m pip install "numpy>=2.0.2,<2.1.0"
py -3 -m pip install transformers
py -3 -m pip install "pyannote-audio>=3.3.2,<4.0.0" --no-deps
py -3 -m pip install lightning pytorch-lightning pyannote-core pyannote-database pyannote-metrics pyannote-pipeline pyannoteai-sdk torch-audiomentations opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp
```

### Cách 3: Cài đầy đủ nhưng lock PyTorch version

```bash
# Kiểm tra PyTorch version hiện tại
py -3 -c "import torch; print(torch.__version__)"

# Giả sử là 2.5.1+cu121, cài WhisperX với constraint
py -3 -m pip install whisperx "torch>=2.0.0,<3.0.0" --no-build-isolation

# Hoặc đơn giản hơn: cài không dependencies rồi cài thủ công
py -3 -m pip install whisperx --no-deps
py -3 -m pip install faster-whisper --no-deps
py -3 -m pip install "numpy>=2.0.2,<2.1.0"
py -3 -m pip install transformers
py -3 -m pip install "pyannote-audio>=3.3.2,<4.0.0" --no-deps
py -3 -m pip install lightning pytorch-lightning pyannote-core pyannote-database pyannote-metrics pyannote-pipeline pyannoteai-sdk torch-audiomentations opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp
```

### ✅ Cách AN TOÀN NHẤT (Khuyến nghị - Giữ PyTorch CUDA 2.5.1):

**⚠️ VẤN ĐỀ:** 
- `pyannote.audio` yêu cầu `torch==2.8.0` nhưng PyTorch CUDA chỉ có đến `2.5.1+cu121`
- Khi cài `pyannote.audio`, nó sẽ cài `torch==2.8.0` (CPU) và ghi đè PyTorch CUDA!

**✅ GIẢI PHÁP:** Dùng `--no-deps` cho WhisperX và faster-whisper:

```bash
# 1. Kiểm tra Python đang dùng
py -3 -c "import sys; print('Python:', sys.executable)"

# 2. Kiểm tra PyTorch CUDA hiện tại (PHẢI là 2.5.1+cu121)
py -3 -c "import torch; print('PyTorch:', torch.__version__); print('CUDA:', torch.version.cuda if torch.cuda.is_available() else 'CPU'); print('GPU:', torch.cuda.is_available())"

# 3. Cài WhisperX KHÔNG dependencies (QUAN TRỌNG!)
py -3 -m pip install whisperx --no-deps

# 4. Cài faster-whisper KHÔNG dependencies (QUAN TRỌNG!)
py -3 -m pip install faster-whisper --no-deps

# 5. Cài NumPy 2.0.2 (QUAN TRỌNG - Theo yêu cầu của WhisperX 3.7.4)
py -3 -m pip install "numpy>=2.0.2,<2.1.0"

# 6. Cài dependencies cần thiết (trừ torch và pyannote.audio)
py -3 -m pip install transformers

# 7. Cài pyannote-audio 3.3.2+ (QUAN TRỌNG - Theo yêu cầu của WhisperX 3.7.4)
py -3 -m pip install "pyannote-audio>=3.3.2,<4.0.0" --no-deps

# 8. Cài các dependencies của pyannote.audio (trừ torch)
py -3 -m pip install lightning pytorch-lightning pyannote-core pyannote-database pyannote-metrics pyannote-pipeline pyannoteai-sdk torch-audiomentations opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp

# 9. Verify PyTorch vẫn là CUDA 2.5.1
py -3 -c "import torch; print('✅ PyTorch:', torch.__version__); print('✅ CUDA:', torch.version.cuda); print('✅ GPU:', torch.cuda.is_available())"

# 10. Verify NumPy 2.0.2+
py -3 -c "import numpy as np; print('✅ NumPy:', np.__version__); assert np.__version__.startswith('2.0'), 'NumPy phải >= 2.0.2, < 2.1.0'"

# 11. Kiểm tra WhisperX
py -3 -c "import whisperx; print('✅ WhisperX: OK')"
```

## ✅ Bước 3: Kiểm tra cài đặt

### Kiểm tra bằng Python:

```bash
py -3 -c "import whisperx; import torch; print('✅ WhisperX:', whisperx.__version__ if hasattr(whisperx, '__version__') else 'installed'); print('✅ PyTorch:', torch.__version__); print('✅ CUDA:', torch.version.cuda if torch.cuda.is_available() else 'CPU')"
```

### Kiểm tra bằng script Node.js:

```bash
npm run check:whisperx
```

### Test với GPU:

```bash
py -3 backend/ai_models/test_cuda_compatibility.py
```

## 🚀 Bước 4: Test WhisperX với GPU

Tạo file test đơn giản:

```python
# test_whisperx.py
import whisperx
import torch

print("Testing WhisperX with GPU...")
print(f"PyTorch: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"CUDA version: {torch.version.cuda}")
    
    # Test load model
    print("\nLoading WhisperX model 'tiny' on GPU...")
    model = whisperx.load_model("tiny", device="cuda", compute_type="float16")
    print("✅ Model loaded successfully on GPU!")
    del model
    torch.cuda.empty_cache()
    print("✅ GPU test passed!")
else:
    print("⚠️  GPU not available, will use CPU")
```

Chạy test:
```bash
py -3 test_whisperx.py
```

## 🔧 Xử lý lỗi thường gặp

### Lỗi 1: `ModuleNotFoundError: No module named 'whisperx'`

**Nguyên nhân:** WhisperX chưa được cài hoặc cài vào Python environment khác.

**Giải pháp:**
```bash
# Xác nhận Python đang dùng
py -3 -c "import sys; print(sys.executable)"

# Cài lại WhisperX vào đúng Python
py -3 -m pip install --upgrade whisperx
```

### Lỗi 2: `Library cublas64_12.dll is not found`

**Nguyên nhân:** Thiếu CUDA runtime libraries.

**Giải pháp:**
1. Cài CUDA Toolkit 12.1 từ NVIDIA: https://developer.nvidia.com/cuda-downloads
2. Hoặc code sẽ tự động fallback về CPU (chậm hơn nhưng vẫn hoạt động)

### Lỗi 3: `Python was not found`

**Nguyên nhân:** Python không có trong PATH.

**Giải pháp:**
1. Thêm Python vào PATH trong Windows
2. Hoặc dùng `py -3` launcher (Windows Python Launcher)
3. Code đã tự động tìm Python, nhưng nếu vẫn lỗi, kiểm tra lại PATH

### Lỗi 4: `torch.cuda.is_available() = False` hoặc PyTorch bị downgrade về CPU

**Nguyên nhân:** `pyannote.audio` (dependency của WhisperX) yêu cầu `torch==2.8.0` và tự động cài CPU version, ghi đè PyTorch CUDA.

**⚠️ TẠI SAO CẦN faster-whisper?**
- `faster-whisper` là dependency CẦN THIẾT của WhisperX
- WhisperX sử dụng faster-whisper để transcription nhanh hơn
- Không phải vấn đề, chỉ là dependency bình thường

**✅ Giải pháp KHẮC PHỤC (Nếu đã bị downgrade):**

```bash
# 1. Gỡ PyTorch CPU 2.8.0 (nếu đã bị cài)
py -3 -m pip uninstall torch torchvision torchaudio -y

# 2. Cài lại PyTorch CUDA 2.5.1+cu121 (version CUDA cao nhất hiện có)
py -3 -m pip install torch==2.5.1+cu121 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 3. Verify GPU
py -3 -c "import torch; print('PyTorch:', torch.__version__); print('CUDA:', torch.version.cuda); print('GPU:', torch.cuda.is_available())"

# 4. Cài WhisperX và faster-whisper với --no-deps (KHÔNG thay đổi PyTorch)
py -3 -m pip install whisperx --no-deps
py -3 -m pip install faster-whisper --no-deps

# 5. Cài NumPy 2.0.2 (QUAN TRỌNG - Theo yêu cầu của WhisperX 3.7.4)
py -3 -m pip install "numpy>=2.0.2,<2.1.0"

# 6. Cài dependencies cần thiết
py -3 -m pip install transformers

# 7. Cài pyannote-audio 3.3.2+ (QUAN TRỌNG - Theo yêu cầu của WhisperX 3.7.4)
py -3 -m pip install "pyannote-audio>=3.3.2,<4.0.0" --no-deps
py -3 -m pip install lightning pytorch-lightning pyannote-core pyannote-database pyannote-metrics pyannote-pipeline pyannoteai-sdk torch-audiomentations opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp

# 7. Verify lại PyTorch vẫn là CUDA
py -3 -c "import torch; print('✅ PyTorch:', torch.__version__); print('✅ GPU:', torch.cuda.is_available())"

# 8. Verify NumPy 2.0.2+
py -3 -c "import numpy as np; print('✅ NumPy:', np.__version__)"
```

**✅ Giải pháp PHÒNG NGỪA (Cài mới):**
- **Cách tốt nhất:** Dùng `--no-deps` cho WhisperX và faster-whisper
- `pyannote.audio` yêu cầu `torch==2.8.0` nhưng PyTorch CUDA chỉ có đến 2.5.1+cu121
- Cài WhisperX và faster-whisper với `--no-deps` → Cài pyannote.audio với `--no-deps` → Giữ nguyên PyTorch CUDA 2.5.1

### Lỗi 5: `Inference.__init__() got an unexpected keyword argument 'use_auth_token'`

**Nguyên nhân:** Version mới của `pyannote.audio` không còn hỗ trợ tham số `use_auth_token`, nhưng WhisperX vẫn cố gắng sử dụng nó.

**⚠️ Ảnh hưởng:**
- Lỗi này chỉ xảy ra khi WhisperX cố gắng sử dụng VAD (Voice Activity Detection) với pyannote.audio
- **Transcription vẫn hoạt động bình thường** (không cần VAD)
- Chỉ ảnh hưởng đến tính năng phát hiện giọng nói tự động

**✅ Giải pháp:**

**Cách 1: Bỏ qua VAD (Khuyến nghị - Đơn giản nhất)**
- WhisperX vẫn hoạt động bình thường mà không cần VAD
- Code đã được thiết kế để hoạt động không cần VAD
- Chỉ cần transcription, không cần phát hiện giọng nói tự động

**Cách 2: Downgrade pyannote.audio (Nếu cần VAD)**
```bash
# Gỡ pyannote.audio hiện tại
py -3 -m pip uninstall pyannote.audio -y

# Cài version cũ hơn (hỗ trợ use_auth_token)
py -3 -m pip install pyannote.audio==3.1.1 --no-deps
py -3 -m pip install lightning pytorch-lightning pyannote-core pyannote-database pyannote-metrics pyannote-pipeline pyannoteai-sdk torch-audiomentations opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp
```

**Cách 3: Upgrade WhisperX (Nếu có version mới)**
```bash
py -3 -m pip install --upgrade whisperx --no-deps
```

### Lỗi 6: `torchcodec is not installed correctly` (Warning)

**Nguyên nhân:** 
- `torchcodec` không tương thích với PyTorch 2.5.1+cu121
- Hoặc FFmpeg chưa được cài đặt

**⚠️ Ảnh hưởng:**
- **Chỉ là WARNING, không phải lỗi**
- WhisperX vẫn hoạt động bình thường
- Chỉ ảnh hưởng đến tính năng decode audio tự động (WhisperX có thể tự decode)

**✅ Giải pháp (Tùy chọn):**

**Nếu muốn sửa warning (không bắt buộc):**
```bash
# 1. Cài FFmpeg (Windows)
# Tải từ: https://www.gyan.dev/ffmpeg/builds/
# Hoặc dùng chocolatey: choco install ffmpeg

# 2. Hoặc bỏ qua warning này (WhisperX vẫn hoạt động)
# Không cần làm gì cả, chỉ là warning
```

**Lưu ý:** Warning này không ảnh hưởng đến chức năng chính của WhisperX. Có thể bỏ qua an toàn.

### Lỗi 7: Dependency conflicts (NumPy, pyannote-audio, torch versions)

**Nguyên nhân:** 
- WhisperX 3.7.4 yêu cầu:
  - `numpy>=2.0.2,<2.1.0` (không phải 1.26.4)
  - `pyannote-audio>=3.3.2,<4.0.0` (không phải 3.1.1)
  - `torch~=2.8.0` (không phải 2.5.1+cu121)
- PyTorch CUDA chỉ có đến 2.5.1+cu121 (không có 2.8.0+cu121)
- Có xung đột giữa các dependencies

**⚠️ Ảnh hưởng:**
- Pip sẽ báo warning về dependency conflicts
- WhisperX vẫn có thể hoạt động nếu cài đúng versions (bỏ qua torch conflict)

**✅ Giải pháp (Cài đúng versions theo yêu cầu của WhisperX 3.7.4):**

```bash
# 1. Cài NumPy 2.0.2 (theo yêu cầu của WhisperX 3.7.4)
py -3 -m pip install "numpy>=2.0.2,<2.1.0"

# 2. Cài pyannote-audio 3.3.2+ (theo yêu cầu của WhisperX 3.7.4)
py -3 -m pip install "pyannote-audio>=3.3.2,<4.0.0" --no-deps

# 3. Cài dependencies của pyannote-audio
py -3 -m pip install lightning pytorch-lightning pyannote-core pyannote-database pyannote-metrics pyannote-pipeline pyannoteai-sdk torch-audiomentations opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp

# 4. Giữ PyTorch 2.5.1+cu121 (bỏ qua conflict với WhisperX)
# PyTorch đã được cài, không cần làm gì

# 5. Cài WhisperX với --no-deps (bỏ qua dependency check cho torch)
py -3 -m pip install whisperx --no-deps

# 6. Verify
py -3 -c "import numpy as np; print('NumPy:', np.__version__)"
py -3 -c "import whisperx; print('WhisperX:', whisperx.__version__ if hasattr(whisperx, '__version__') else 'OK')"
```

**⚠️ Lưu ý:**
- Pip sẽ báo warning về torch version conflict, nhưng WhisperX vẫn hoạt động với PyTorch 2.5.1+cu121
- Chỉ cần đảm bảo NumPy và pyannote-audio đúng version

## 📝 Tóm tắt lệnh cài đặt nhanh (AN TOÀN - Giữ PyTorch CUDA 2.5.1)

**⚠️ QUAN TRỌNG:** Dùng `--no-deps` để giữ PyTorch CUDA 2.5.1+cu121!

```bash
# 1. Kiểm tra Python
py -3 --version

# 2. Kiểm tra PyTorch CUDA (PHẢI là 2.5.1+cu121 và GPU=True)
py -3 -c "import torch; print('PyTorch:', torch.__version__); print('CUDA:', torch.version.cuda if torch.cuda.is_available() else 'CPU'); print('GPU:', torch.cuda.is_available())"

# 3. Cài WhisperX KHÔNG dependencies (QUAN TRỌNG!)
py -3 -m pip install whisperx --no-deps

# 4. Cài faster-whisper KHÔNG dependencies (QUAN TRỌNG!)
py -3 -m pip install faster-whisper --no-deps

# 5. Cài NumPy 2.0.2 (QUAN TRỌNG - Theo yêu cầu của WhisperX 3.7.4)
py -3 -m pip install "numpy>=2.0.2,<2.1.0"

# 6. Cài dependencies cần thiết
py -3 -m pip install transformers

# 7. Cài pyannote-audio 3.3.2+ (QUAN TRỌNG - Theo yêu cầu của WhisperX 3.7.4)
py -3 -m pip install "pyannote-audio>=3.3.2,<4.0.0" --no-deps
py -3 -m pip install lightning pytorch-lightning pyannote-core pyannote-database pyannote-metrics pyannote-pipeline pyannoteai-sdk torch-audiomentations opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp

# 8. Verify PyTorch vẫn là CUDA 2.5.1
py -3 -c "import torch; print('✅ PyTorch:', torch.__version__); print('✅ GPU:', torch.cuda.is_available())"

# 9. Verify NumPy 2.0.2+
py -3 -c "import numpy as np; print('✅ NumPy:', np.__version__); assert np.__version__.startswith('2.0'), 'NumPy phải >= 2.0.2, < 2.1.0'"

# 9. Kiểm tra WhisperX (có thể có warning về torchcodec - bình thường)
py -3 -c "import whisperx; print('✅ WhisperX OK')"

# 10. Test với script
npm run check:whisperx
```

**⚠️ Lưu ý về Warnings:**
- **`torchcodec warning`**: Bình thường, không ảnh hưởng chức năng
- **`use_auth_token error`**: Chỉ xảy ra khi test VAD, transcription vẫn hoạt động bình thường

## 🔒 Cách KHÓA PyTorch để không bị thay đổi

Nếu muốn đảm bảo PyTorch không bao giờ bị thay đổi:

```bash
# Tạo file requirements-whisperx.txt
echo "whisperx" > requirements-whisperx.txt
echo "faster-whisper" >> requirements-whisperx.txt
echo "transformers" >> requirements-whisperx.txt
echo "pyannote.audio" >> requirements-whisperx.txt

# Cài với constraint PyTorch
py -3 -m pip install -r requirements-whisperx.txt --constraint "torch==2.5.1"
```

Hoặc dùng pip-tools:

```bash
# Cài pip-tools
py -3 -m pip install pip-tools

# Tạo constraints file
echo "torch==2.5.1" > constraints.txt

# Cài WhisperX với constraints
py -3 -m pip install whisperx -c constraints.txt
```

## 🎯 Sau khi cài xong

1. **Khởi động lại server Node.js** để code nhận diện Python mới
2. **Test transcription** bằng cách upload audio trong app
3. **Kiểm tra logs** để xem WhisperX có chạy trên GPU không

## 💡 Tips

- **Nếu có nhiều Python**: Dùng `py -3` để đảm bảo dùng Python 3
- **Nếu cài vào virtualenv**: Activate virtualenv trước khi cài
- **Nếu GPU không hoạt động**: Code sẽ tự động fallback về CPU
- **Kiểm tra thường xuyên**: Chạy `npm run check:whisperx` để verify

## 📚 Tài liệu tham khảo

- WhisperX GitHub: https://github.com/m-bain/whisperX
- PyTorch CUDA: https://pytorch.org/get-started/locally/
- CUDA Toolkit: https://developer.nvidia.com/cuda-downloads
