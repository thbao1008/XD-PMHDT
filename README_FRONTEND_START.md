# Frontend Start Script

## Tích hợp cleanup vào `npm run dev:fe`

Script `scripts/start-frontend.js` đã được tích hợp vào `npm run dev:fe` để tự động:
1. Kill tất cả processes trên port 5173
2. Verify frontend files (index.html, src/main.jsx, vite.config.js)
3. Kiểm tra node_modules (tự động install nếu thiếu)
4. Start Vite dev server

## Cách sử dụng:

### Từ root directory:
```bash
npm run dev:fe
```

### Hoặc từ frontend directory:
```bash
cd frontend
npm run dev
```

## Script sẽ tự động:
- ✅ Kill port 5173 trước khi start
- ✅ Verify files tồn tại
- ✅ Install dependencies nếu thiếu
- ✅ Start Vite với đúng config

## Lưu ý:
- Script chỉ hoạt động trên Windows (dùng PowerShell để kill port)
- Trên Linux/Mac, cần sửa phần kill port
- Nếu có lỗi, check console output để biết bước nào fail

## Troubleshooting:

### Port 5173 vẫn busy:
- Chạy thủ công: `.\fix-frontend-complete.ps1`
- Hoặc kill thủ công: `Get-NetTCPConnection -LocalPort 5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`

### Missing files:
- Đảm bảo đang ở root directory
- Check `frontend/` directory tồn tại

### Dependencies missing:
- Script sẽ tự động chạy `npm install` trong frontend directory
- Nếu fail, chạy thủ công: `cd frontend && npm install`

