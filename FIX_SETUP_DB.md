# 🔧 Fix: Missing script "setup:db" và "Cannot find module"

## ❌ Vấn đề 1: Missing script "setup:db"
Khi chạy `docker-compose run --rm init-db`, gặp lỗi:
```
npm error Missing script: "setup:db"
```

## ❌ Vấn đề 2: Cannot find module
Sau khi sửa, gặp lỗi:
```
Error: Cannot find module '/app/backend/db/setup-db-docker.js'
```

**Nguyên nhân**: Service `init-db` và `seed` không có volume mount, nên không thấy được files từ host machine.

## ✅ Đã sửa
1. **Cập nhật `compose.yaml`** để chạy trực tiếp script thay vì qua npm:
   - `init-db`: Chạy trực tiếp `node backend/db/setup-db-docker.js`
   - `seed`: Chạy trực tiếp `node backend/seed/seedAdminsFromFile.js`

2. **Thêm volume mount** vào services `init-db` và `seed`:
   ```yaml
   volumes:
     - .:/app
     - /app/node_modules
   ```
   Điều này đảm bảo files từ host machine được mount vào container.

## 🚀 Cách chạy lại

**Không cần rebuild image** vì đã có volume mount, files sẽ được mount trực tiếp từ host:

```bash
# 1. Đảm bảo database đang chạy và healthy
docker-compose up -d db
docker-compose ps db  # Kiểm tra status phải là "healthy"

# 2. Chạy setup database
docker-compose run --rm init-db

# 3. Chạy seed admin (nếu cần)
docker-compose run --rm seed
```

**Lưu ý**: Với volume mount, bạn không cần rebuild image mỗi khi thay đổi code. Files sẽ được sync tự động từ host vào container.

## 🔍 Kiểm tra

Sau khi chạy, kiểm tra logs:
```bash
docker-compose logs init-db
```

Nếu vẫn lỗi, kiểm tra:
1. File `backend/db/setup-db-docker.js` có tồn tại không
2. Dependencies đã được cài đặt chưa (`pg`, `dotenv`)
3. Database đã healthy chưa: `docker-compose ps db`

## 📝 Lưu ý

- Script `setup:db` vẫn có trong `package.json` và có thể dùng khi chạy local
- Trong Docker, chạy trực tiếp script để tránh vấn đề với npm scripts trong container

