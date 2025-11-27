# 🔧 Fix: Service URLs trong Docker

## ❌ Vấn đề

API Gateway đang cố kết nối đến `http://package-service:4003` thay vì `http://localhost:4003`, gây ra lỗi 504.

**Nguyên nhân**: 
- Trong Docker, tất cả services chạy trong **cùng một container** (`app`)
- Không phải microservices riêng biệt, nên không có service names như `package-service`
- Phải dùng `localhost:PORT` để services giao tiếp với nhau

## ✅ Giải pháp (KHÔNG thay đổi code)

### 1. Sửa `.env.docker`
File `backend/.env.docker` đã được cập nhật với tất cả service URLs dùng `localhost`:

```env
PACKAGE_SERVICE_URL=http://localhost:4003
NOTIFICATION_SERVICE_URL=http://localhost:4001
COMMUNITY_SERVICE_URL=http://localhost:4002
# ... tất cả services dùng localhost
```

### 2. Sửa `compose.yaml`
Thêm explicit service URLs vào `environment` section để đảm bảo override bất kỳ giá trị nào từ `.env.docker`:

```yaml
environment:
  - PACKAGE_SERVICE_URL=http://localhost:4003
  - NOTIFICATION_SERVICE_URL=http://localhost:4001
  # ... etc
```

## 🎯 Tại sao cách này hoạt động?

1. **Code không thay đổi**: API Gateway vẫn dùng `process.env.PACKAGE_SERVICE_URL || "http://localhost:4003"`
2. **Docker set env vars**: `compose.yaml` set `PACKAGE_SERVICE_URL=http://localhost:4003`
3. **npm local vẫn hoạt động**: Khi chạy local không có env vars, code fallback về `localhost:4003` (đúng)

## 🚀 Test

Sau khi sửa:

```bash
# Restart Docker
docker-compose restart app

# Xem logs
docker-compose logs app | grep "package\|gateway"
```

Bạn sẽ thấy:
```
[API Gateway] /api/packages/public → http://localhost:4003/packages/public
```

**KHÔNG còn**:
```
[API Gateway] /api/packages/public → http://package-service:4003/packages/public  ❌
```

## 📝 Lưu ý

- ✅ **Docker**: Dùng `localhost` vì tất cả services cùng container
- ✅ **npm local**: Vẫn dùng `localhost` (default trong code)
- ✅ **Microservices riêng biệt** (nếu deploy sau): Có thể set service names trong env vars

## 🔍 Verify

Kiểm tra service URLs trong container:
```bash
docker exec -it aesp-app-1 sh -c "echo PACKAGE_SERVICE_URL=\$PACKAGE_SERVICE_URL"
# Output: PACKAGE_SERVICE_URL=http://localhost:4003 ✅
```

