# 🔧 Fix Missing Files

## ✅ Đã Fix

1. **Mentor Service** - Đã copy `whisperxRunner.js` từ learner-service
2. **Learner Service** - Đã sửa `dictionaryController.js` để dùng `aiServiceClient` thay vì `aiService`
3. **Admin Service** - Đã tạo `packageModel.js`

## 🚀 Cách Start Services

### Bước 1: Kill các process đang dùng ports
```powershell
cd backend/services
.\kill-ports.ps1
```

### Bước 2: Start services
```powershell
node start-simple.js
```

## 📋 Lưu Ý

- Ports có thể đã được sử dụng bởi các services cũ
- Chạy `kill-ports.ps1` trước khi start để giải phóng ports
- Sau khi start, đợi 5-10 giây rồi check health


