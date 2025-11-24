# Fix: API Configuration - Tất Cả Lỗi API

## Vấn đề:
- `ERR_CONNECTION_REFUSED` khi truy cập API
- `Network Error` và `Failed to fetch`
- API không thể truy cập từ frontend

## Nguyên nhân:
- `api.js` dùng **absolute URL** `http://localhost:4000/api` 
- Không đi qua **Vite proxy** → CORS errors, connection refused
- Cần dùng **relative URL** `/api` để đi qua Vite proxy

## Giải pháp:

### 1. Sửa `api.js` - Dùng relative URL
**Trước:**
```javascript
baseURL: "http://localhost:4000/api" // Absolute URL - không đi qua proxy
```

**Sau:**
```javascript
baseURL: "/api" // Relative URL - đi qua Vite proxy
```

### 2. Sửa `apiHelpers.js` - Dùng relative URL
**Trước:**
```javascript
return "http://localhost:4000/api"; // Absolute URL
```

**Sau:**
```javascript
return "/api"; // Relative URL
```

## Flow hoạt động:

1. **Frontend** → `api.get("/packages/public")`
2. **Axios** → Request đến `/api/packages/public` (relative)
3. **Vite Proxy** → Forward đến `http://localhost:4000/api/packages/public`
4. **API Gateway** → Proxy đến `http://localhost:4003/packages/public`
5. **Package Service** → Return data

## Lợi ích:

- ✅ Đi qua Vite proxy → Không có CORS issues
- ✅ Tự động handle errors
- ✅ Logging trong dev mode
- ✅ Timeout handling

## Lưu ý:

- **Luôn dùng relative URL** (`/api`) trong frontend
- **Không dùng absolute URL** (`http://localhost:4000/api`) trừ khi cần thiết
- Vite proxy tự động forward đến API Gateway
- CORS được handle bởi Vite proxy

