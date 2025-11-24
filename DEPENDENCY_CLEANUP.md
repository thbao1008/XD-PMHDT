# Dependency Cleanup Summary

## Vấn đề đã phát hiện:

1. **Version Conflicts**: Root package.json có versions khác với microservices
2. **Duplicate Dependencies**: Root có nhiều dependencies trùng với frontend
3. **Deprecation Warning**: `http-proxy-middleware` version cũ dùng `util._extend`

## Đã sửa:

### 1. Updated http-proxy-middleware
- **File**: `backend/services/api-gateway/package.json`
- **Change**: `^3.0.3` → `^3.0.5`
- **Reason**: Fix `util._extend` deprecation warning

### 2. Cleaned Root package.json
- **Removed Frontend Dependencies**:
  - `@tanstack/react-query`, `@tanstack/react-query-devtools`
  - `react`, `react-dom`, `react-router-dom`
  - `react-chartjs-2`, `react-easy-crop`, `react-icons`
  - `react-modal`, `react-quill`
  - `chart.js`, `dompurify`, `recharts`, `swiper`
  - `@vitejs/plugin-react`, `vite`

- **Removed Backend Dependencies** (moved to microservices):
  - `express`, `cors`, `dotenv`, `pg`, `bcryptjs`, `jsonwebtoken`, `multer`

- **Kept Only Root-Specific Dependencies**:
  - `@google/generative-ai` - AI scripts
  - `axios` - HTTP requests (used in root scripts)
  - `form-data` - File uploads (used in root scripts)
  - `node-fetch` - Fetch API (used in root scripts)

- **Kept Dev Dependencies**:
  - `concurrently` - Run multiple scripts
  - `cross-port-killer` - Port management
  - `nodemon` - Development tool

## Kết quả:

✅ **No version conflicts** giữa root và services
✅ **No duplicate dependencies** (trừ axios - có thể cần ở cả 2 nơi)
✅ **Deprecation warning** sẽ được fix sau khi reinstall

## Cách kiểm tra conflicts:

```bash
node check-dependency-conflicts.js
```

## Lưu ý:

- Root `package.json` giờ chỉ chứa dependencies cho root-level scripts
- Frontend dependencies chỉ ở `frontend/package.json`
- Microservices dependencies chỉ ở từng service
- Nếu cần dùng dependencies ở root, cần cài đặt riêng

