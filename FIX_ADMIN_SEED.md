# 🔧 Fix: Admin Seed trong Docker

## ❌ Vấn đề

Admin service tự động seed khi start, nhưng bảng `users` chưa tồn tại, gây lỗi:
```
❌ Seed admin error: relation "public.users" does not exist
```

**Nguyên nhân**: 
- Admin service gọi `seedAdmins()` ngay khi start
- Database chưa có bảng `users` (chưa chạy `init-db`)
- Seed fail và service có thể không start được

## ✅ Đã sửa

### 1. Sửa `seedAdminsFromFile.js`
- ✅ Check bảng `users` có tồn tại trước khi seed
- ✅ Nếu không có bảng, log warning và skip seed (không throw error)
- ✅ Service vẫn start được dù seed fail
- ✅ Hướng dẫn user chạy `init-db` nếu cần

### 2. Sửa `admin-service/src/server.js`
- ✅ Seed không block server start
- ✅ Server start ngay cả khi seed fail
- ✅ Log warning thay vì exit process

## 🎯 Kết quả

Sau khi sửa:
- ✅ Admin service start được ngay cả khi bảng `users` chưa tồn tại
- ✅ Seed tự động chạy khi bảng đã có
- ✅ Login vẫn hoạt động vì dùng bảng `users` (không phải bảng riêng)
- ✅ Không còn lỗi crash khi start service

## 🚀 Workflow đúng

### Lần đầu setup:
```bash
# 1. Start database
docker-compose up -d db

# 2. Setup schema (tạo bảng users)
docker-compose run --rm init-db

# 3. Start app (admin service sẽ tự động seed)
docker-compose up -d app
```

### Hoặc seed thủ công:
```bash
# Seed admin sau khi đã có bảng users
docker-compose run --rm seed
```

## 📝 Lưu ý

1. **Bảng users**: Admin login dùng bảng `users` với `role='admin'`, không phải bảng riêng
2. **Auto-seed**: Admin service tự động seed khi start nếu bảng đã có
3. **Manual seed**: Có thể chạy `docker-compose run --rm seed` để seed thủ công
4. **Service không crash**: Admin service sẽ start được dù seed fail

## 🔍 Kiểm tra

Sau khi start:
```bash
docker-compose logs app | grep -i "admin\|seed"
```

Bạn sẽ thấy:
```
⚠️  Users table does not exist. Please run: docker-compose run --rm init-db
👑 Admin Service running on port 4008  ✅ (Service vẫn start)
```

Hoặc nếu bảng đã có:
```
✅ Seeded/Updated admin: admin@example.com
✅ Admin seed completed
👑 Admin Service running on port 4008
```





