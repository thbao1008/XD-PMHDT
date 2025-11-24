# Auto-Reload Configuration

## Tính năng:
- ✅ **Auto-reload cho Backend**: Services tự động reload khi có thay đổi file
- ✅ **Auto-reload cho Frontend**: Vite tự động reload khi có thay đổi
- ✅ **Kill port chỉ lần đầu**: Chỉ kill port khi ports đang bị chiếm (first time)
- ✅ **Không kill lại khi reload**: Khi có thay đổi, chỉ reload service, không kill port

## Cách hoạt động:

### Backend Services:
1. **Lần đầu chạy**: 
   - Kiểm tra ports có đang bị chiếm không
   - Nếu có → Kill tất cả processes trên ports
   - Đợi 5 giây → Start services với `npm run dev` (có watch)

2. **Khi có thay đổi file**:
   - Node.js `--watch` tự động detect thay đổi
   - Service tự động reload (không cần kill port)
   - Không mất kết nối, không cần restart

### Frontend:
1. **Lần đầu chạy**:
   - Kiểm tra port 5173 có đang bị chiếm không
   - Nếu có → Kill process trên port 5173
   - Start Vite dev server

2. **Khi có thay đổi file**:
   - Vite tự động detect thay đổi
   - Hot Module Replacement (HMR) reload browser
   - Không cần restart server

## Scripts:

### Backend:
```bash
cd backend/services
node start-all-services.js
```

### Frontend:
```bash
npm run dev:fe
```

## Lưu ý:

- **Kill port chỉ chạy lần đầu**: Nếu ports đã free, sẽ skip kill step
- **Auto-reload không kill port**: Khi file thay đổi, chỉ reload service, không kill port
- **Vite HMR**: Frontend có Hot Module Replacement, không cần full reload
- **Node.js watch**: Backend dùng `node --watch` để auto-reload

## Troubleshooting:

### Service không reload:
- Kiểm tra `package.json` có script `dev` với `node --watch`
- Kiểm tra file có được save không
- Kiểm tra console có lỗi không

### Port vẫn bị chiếm:
- Chạy `kill-all-processes-complete.ps1` để kill tất cả
- Hoặc restart máy

### Frontend không reload:
- Kiểm tra Vite dev server đang chạy
- Kiểm tra browser console có lỗi không
- Thử hard refresh (Ctrl+Shift+R)

