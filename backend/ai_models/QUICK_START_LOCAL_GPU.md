# ⚡ Quick Start: Local GPU Training

## 🚀 Bắt đầu nhanh

### 1. Kiểm tra GPU

```bash
npm run aiesp:gpu:check
```

**Nếu có NVIDIA GPU (rời):**
```json
{
  "cuda_available": true,
  "nvidia_gpu_available": true,
  "nvidia_gpu_index": 0,
  "nvidia_gpu_name": "NVIDIA GeForce RTX 3060",
  "device": "cuda:0",
  "torch_available": true
}
```
→ Hệ thống sẽ tự động sử dụng NVIDIA GPU và bỏ qua AMD GPU tích hợp

**Nếu không có GPU:**
```json
{"cuda_available": false, "nvidia_gpu_available": false, "device": "cpu", "torch_available": true}
```
→ Vẫn chạy được với CPU, chỉ chậm hơn

### 2. Train ngay

```bash
# Train tất cả task types
npm run aiesp:gpu:train

# Train với web learning (tự động tìm thêm data)
npm run aiesp:gpu:train:web
```

### 3. Tự động chạy liên tục

```bash
# Chạy continuous learning (tự động check GPU mỗi 10 phút)
npm run aiesp:learn
```

Hệ thống sẽ tự động:
- ✅ Check GPU mỗi 10 phút
- ✅ Train với GPU nếu có
- ✅ Tìm thêm data từ web
- ✅ Monitor và cải thiện performance

## 📋 Commands

| Command | Mô tả |
|---------|-------|
| `npm run aiesp:gpu:check` | Kiểm tra GPU availability |
| `npm run aiesp:gpu:train` | Train tất cả task types |
| `npm run aiesp:gpu:train:web` | Train với web learning |
| `npm run aiesp:gpu:auto` | Tự động chạy liên tục |
| `npm run aiesp:cleanup` | Xóa files không cần thiết |
| `npm run aiesp:learn` | Continuous learning (bao gồm GPU training) |

## 🎯 Kết quả

Sau khi train xong:
- Models được lưu vào database
- Accuracy được cập nhật
- AiESP sẵn sàng sử dụng

Check status:
```bash
npm run check:current-ai
```

## ⚙️ Troubleshooting

### GPU không available
→ Vẫn chạy được với CPU, chỉ chậm hơn

### PyTorch chưa cài
```bash
pip install torch
```

### Cần GPU mạnh hơn
→ Dùng Local GPU: `npm run aiesp:gpu:train:web`

## 📚 Chi tiết

Xem `LOCAL_GPU_TRAINING.md` để biết thêm chi tiết.

