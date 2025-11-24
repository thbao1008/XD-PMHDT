# Fix: Kill Ports Không Hoạt Động

## Vấn đề:
- Script kill báo "Killed 89 processes" nhưng ports vẫn bị "Port already in use"
- Processes không thực sự bị kill
- PowerShell command có lỗi với biến `$PID` (read-only)

## Nguyên nhân:
1. **PowerShell command quá phức tạp** - một dòng dài khó debug
2. **Biến `$PID` là read-only** - không thể dùng trong foreach
3. **execSync không chờ đủ lâu** - processes chưa kịp kill xong
4. **Không verify ports trước khi start** - start ngay cả khi ports còn busy

## Giải pháp đã áp dụng:

### 1. Tách kill command thành từng bước riêng biệt
- Kill by port (từng port một)
- Kill node processes
- Kill npm processes  
- Stop PowerShell jobs

### 2. Dùng `process.pid` thay vì `$PID`
- Tránh conflict với PowerShell built-in variable
- Pass PID từ Node.js vào PowerShell

### 3. Kill 3 lần với delay
- Lần 1: Kill tất cả → đợi 10 giây
- Lần 2: Kill lại → đợi 5 giây
- Lần 3: Kill lần cuối → đợi 5 giây
- Verify ports trước khi start

### 4. Verify ports trước khi start
- Check xem ports có free không
- Nếu vẫn còn busy, kill thêm 1 lần nữa
- Chỉ start khi ports đã free (hoặc cảnh báo)

## Cách sử dụng:

### Start services (tự động kill):
```bash
cd backend/services
node start-all-services.js
```

### Kill thủ công nếu cần:
```powershell
# Kill tất cả node processes trên service ports
Get-Process -Name node | Where-Object { 
  (Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue | 
   Where-Object { @(4000,4001,4002,4003,4004,4005,4006,4007,4008,4010,4011) -contains $_.LocalPort })
} | ForEach-Object { taskkill /F /T /Y /PID $_.Id }
```

## Lưu ý:
- Script sẽ kill 3 lần và verify trước khi start
- Nếu ports vẫn busy, sẽ cảnh báo nhưng vẫn start (có thể fail)
- Nên kill thủ công trước nếu có quá nhiều processes cũ

