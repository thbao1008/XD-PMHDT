# Fix Scripts Summary

## Vấn đề:
- `npm run dev:fe` báo lỗi `'vite' is not recognized` sau khi cleanup dependencies
- Script cần chạy được cả frontend và microservices

## Đã sửa:

### 1. Sửa `dev:fe` script
**Trước:**
```json
"dev:fe": "vite --config frontend/vite.config.js --open"
```

**Sau:**
```json
"dev:fe": "cd frontend && npm run dev"
```

**Lý do:** Chạy từ frontend directory để dùng vite từ frontend/node_modules

### 2. Sửa `build:fe` script
**Trước:**
```json
"build:fe": "vite build --config frontend/vite.config.js"
```

**Sau:**
```json
"build:fe": "cd frontend && npm run build"
```

**Lý do:** Tương tự, chạy từ frontend directory

### 3. Thêm vite vào root devDependencies
- Giữ lại `vite` trong root devDependencies để đảm bảo tương thích
- Frontend có vite riêng trong `frontend/node_modules`

## Cách sử dụng:

### Chạy Frontend:
```bash
npm run dev:fe
```

### Chạy Microservices:
```bash
npm run dev:be:micro
```

### Chạy cả Frontend và Microservices:
```bash
npm run dev:micro
```

## Lưu ý:
- Frontend phải có `node_modules` (chạy `npm install` trong `frontend/` nếu chưa có)
- Mỗi service có `node_modules` riêng
- Root chỉ chứa dependencies cho root-level scripts

