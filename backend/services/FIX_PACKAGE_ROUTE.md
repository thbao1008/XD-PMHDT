# Fix: 404 Error for /api/packages/public

## Vấn đề:
```
GET http://localhost:4000/api/packages/public 404 (Not Found)
Cannot GET /public
```

## Nguyên nhân:
- Frontend gọi: `/api/packages/public`
- API Gateway có route: `/api/packages`
- Express match `/api/packages` và strip prefix, chỉ pass `/public` cho middleware
- Package Service cần route: `/packages/public`
- pathRewrite `{ "^/api/packages": "/packages" }` không hoạt động vì path đã bị strip thành `/public`

## Giải pháp:
Sử dụng function pathRewrite để thêm `/packages` vào đầu path:

```javascript
pathRewrite: (path, req) => {
  // Express strips /api/packages, leaving /public
  // We need to add /packages back: /public -> /packages/public
  return `/packages${path}`;
}
```

## Flow:
1. Request: `/api/packages/public`
2. Express match: `/api/packages`
3. Path còn lại: `/public`
4. pathRewrite function: `/public` → `/packages/public`
5. Proxy to Package Service: `http://localhost:4003/packages/public`
6. Package Service route: `/packages/public` ✅

## Lưu ý:
- API Gateway cần restart để áp dụng thay đổi
- Package Service route phải là `/packages/public` (không phải `/public`)
- Tất cả routes dưới `/api/packages` sẽ được rewrite tương tự

