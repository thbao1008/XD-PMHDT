# 🔧 Fix: spawn xdg-open ENOENT Error

## ❌ Vấn đề

Khi chạy frontend trong Docker, gặp lỗi:
```
[FE] Error: spawn xdg-open ENOENT
```

**Nguyên nhân**: 
- Vite dev server đang cố gắng tự động mở browser với `open: true` trong config
- Trong Docker container không có browser và không có lệnh `xdg-open` (Linux command để mở browser)
- Lỗi này không ảnh hưởng đến chức năng, nhưng tạo ra error logs không cần thiết

## ✅ Đã sửa

### 1. Cập nhật `vite.config.js`
Thay đổi từ:
```js
open: true, // Tự động mở browser
```

Thành:
```js
open: process.env.DOCKER !== "true", // Tự động mở browser (tắt trong Docker)
```

### 2. Cập nhật `start-frontend.js`
Đảm bảo biến môi trường `DOCKER` được truyền vào Vite process:
```js
env: {
  ...process.env,
  DOCKER: process.env.DOCKER || "false"
}
```

## 🚀 Kết quả

Sau khi sửa:
- ✅ Không còn lỗi `spawn xdg-open ENOENT`
- ✅ Frontend vẫn chạy bình thường trong Docker
- ✅ Khi chạy local (không có DOCKER=true), browser vẫn tự động mở như cũ
- ✅ Frontend accessible tại `http://localhost:5173` từ host machine

## 📝 Lưu ý

1. **Trong Docker**: Browser không tự động mở, nhưng bạn vẫn có thể truy cập `http://localhost:5173` từ browser trên host machine

2. **Local development**: Nếu chạy local (không có `DOCKER=true`), browser vẫn tự động mở như trước

3. **Biến môi trường**: Đảm bảo `DOCKER=true` được set trong `compose.yaml` cho service `app` (đã có sẵn)

## 🔍 Kiểm tra

Sau khi restart container:
```bash
docker-compose restart app
docker-compose logs -f app
```

Bạn sẽ thấy:
- ✅ Không còn lỗi `spawn xdg-open ENOENT`
- ✅ Frontend start thành công
- ✅ Log: "Frontend will be available at: http://localhost:5173"

