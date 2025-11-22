# 🎯 NVIDIA GPU Priority - Ưu Tiên GPU NVIDIA (Rời)

## Tổng quan

Hệ thống tự động **ưu tiên sử dụng NVIDIA GPU (rời)** và **bỏ qua GPU tích hợp AMD** khi training.

## Tự động Detection

### 1. NVIDIA GPU Detection

Code tự động tìm GPU có tên chứa:
- `nvidia`
- `geforce`
- `rtx`
- `gtx`
- `quadro`
- `tesla`

### 2. Ưu tiên GPU rời

- ✅ **Sử dụng**: NVIDIA GPU (rời) - RTX, GTX, Quadro, Tesla
- ❌ **Bỏ qua**: AMD GPU tích hợp - Radeon Graphics, Vega, etc.

## Kiểm tra GPU

```bash
npm run aiesp:gpu:check
```

**Output ví dụ:**
```json
{
  "cuda_available": true,
  "nvidia_gpu_available": true,
  "nvidia_gpu_index": 0,
  "nvidia_gpu_name": "NVIDIA GeForce RTX 3060",
  "device": "cuda:0",
  "torch_available": true,
  "total_gpus": 2,
  "all_gpus": [
    "NVIDIA GeForce RTX 3060",      ← Sẽ sử dụng GPU này
    "AMD Radeon Graphics"           ← Sẽ bỏ qua GPU này
  ]
}
```

## Cách hoạt động

### 1. Detection Phase

```python
# Tự động detect NVIDIA GPU
for i in range(torch.cuda.device_count()):
    device_name = torch.cuda.get_device_name(i)
    if 'nvidia' in device_name.lower() or 'geforce' in device_name.lower():
        NVIDIA_GPU_INDEX = i
        break
```

### 2. Training Phase

```python
# Chỉ sử dụng NVIDIA GPU
device = torch.device(f'cuda:{NVIDIA_GPU_INDEX}')
torch.cuda.set_device(NVIDIA_GPU_INDEX)
```

### 3. Environment Variables

```javascript
// Chỉ hiển thị NVIDIA GPU cho PyTorch
CUDA_VISIBLE_DEVICES: nvidiaGpuIndex  // Ví dụ: "0"
```

## Lợi ích

- ✅ **Performance tốt hơn**: NVIDIA GPU thường mạnh hơn GPU tích hợp
- ✅ **Tự động**: Không cần cấu hình thủ công
- ✅ **Tránh conflict**: Không sử dụng GPU tích hợp (thường yếu hơn)
- ✅ **Full utilization**: Tận dụng toàn bộ NVIDIA GPU

## Troubleshooting

### NVIDIA GPU không được detect

**Kiểm tra:**
```bash
python -c "import torch; print(torch.cuda.get_device_name(0))"
```

**Nếu GPU không phải NVIDIA:**
- Code sẽ fallback về GPU đầu tiên
- Hoặc sử dụng CPU nếu không có CUDA

### Muốn force sử dụng GPU cụ thể

Set environment variable:
```bash
# Windows PowerShell
$env:CUDA_VISIBLE_DEVICES="0"  # Index của NVIDIA GPU

# Linux/Mac
export CUDA_VISIBLE_DEVICES=0
```

### Có nhiều NVIDIA GPU

Hệ thống sẽ chọn GPU đầu tiên được detect. Nếu muốn chọn GPU khác:

1. Check tất cả GPUs:
   ```bash
   npm run aiesp:gpu:check
   ```

2. Set CUDA_VISIBLE_DEVICES với index mong muốn:
   ```bash
   $env:CUDA_VISIBLE_DEVICES="1"  # Sử dụng GPU thứ 2
   ```

## Ví dụ

### Setup thông thường

```
Máy tính có:
- NVIDIA GeForce RTX 3060 (GPU rời) ← Sẽ sử dụng
- AMD Radeon Graphics (GPU tích hợp) ← Sẽ bỏ qua

→ Hệ thống tự động chọn RTX 3060
```

### Training

```bash
npm run aiesp:gpu:train
```

**Output:**
```
[Local GPU] ✅ NVIDIA GPU (rời) selected: NVIDIA GeForce RTX 3060
[Local GPU] GPU Index: 0
[Local GPU] 🚀 Using NVIDIA GPU (rời) to process 500 patterns...
[Local GPU] ✅ NVIDIA GPU processing completed with full performance
```

## Next Steps

Sau khi setup, chạy:
```bash
npm run aiesp:learn
```

Hệ thống sẽ tự động:
- ✅ Detect NVIDIA GPU mỗi 10 phút
- ✅ Train với NVIDIA GPU nếu có
- ✅ Bỏ qua AMD GPU tích hợp

