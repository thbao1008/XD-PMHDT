# Process Cleanup Guide - Giải quyết Processes Ngầm

## Vấn đề:
- Có **135+ node/cmd processes** đang chạy
- Ports vẫn hoạt động dù đã kill
- Có processes ngầm không được track

## Nguyên nhân:

### 1. **Start-Job trong PowerShell**
- `start-all.ps1` dùng `Start-Job` tạo background jobs
- Jobs này tạo orphan processes không được kill khi script dừng
- **Đã sửa**: Thay `Start-Job` bằng `Start-Process` với PowerShell windows riêng

### 2. **npm spawn processes**
- `start-all-services.js` spawn npm processes
- npm spawn node processes
- Nếu không kill đúng cách, sẽ để lại processes

### 3. **Python processes từ services**
- Các services (learner, mentor, ai) spawn Python processes
- Python processes không được track trong `processes` array
- **Cần**: Track tất cả child processes

### 4. **cmd.exe từ scripts**
- PowerShell scripts spawn cmd.exe
- cmd.exe spawn node/npm
- Nếu không kill process tree, sẽ để lại

## Giải pháp:

### Script Kill Tất Cả:
```powershell
.\kill-all-processes-complete.ps1
```

Script này sẽ:
1. Kill tất cả processes trên service ports
2. Kill tất cả npm processes
3. Kill tất cả node processes dùng service ports
4. Kill cmd.exe processes (nếu > 5)
5. Stop PowerShell jobs
6. Final cleanup

### Cách sử dụng:

#### 1. Kill tất cả trước khi start:
```powershell
.\kill-all-processes-complete.ps1
Start-Sleep -Seconds 5
cd backend/services
node start-all-services.js
```

#### 2. Kill tất cả sau khi dừng:
```powershell
# Trong terminal chạy services, nhấn Ctrl+C
# Sau đó chạy:
.\kill-all-processes-complete.ps1
```

#### 3. Kiểm tra processes còn lại:
```powershell
Get-Process -Name node,cmd,npm | Measure-Object | Select-Object -ExpandProperty Count
```

## Các Scripts Đã Sửa:

### 1. `start-all.ps1`
- **Trước**: Dùng `Start-Job` (tạo orphan processes)
- **Sau**: Dùng `Start-Process` với PowerShell windows riêng
- **Lợi ích**: Processes có thể kill bằng cách đóng windows

### 2. `start-all-services.js`
- **Đã có**: Track child processes trong `processes` array
- **Đã có**: Kill process tree với `taskkill /F /T /Y`
- **Cần cải thiện**: Track Python processes từ services

## Kiểm Tra Processes Ngầm:

### 1. Kiểm tra ports:
```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in @(4000,4001,4002,4003,4004,4005,4006,4007,4008,4010,4011,5173) }
```

### 2. Kiểm tra node processes:
```powershell
Get-Process -Name node | Select-Object Id, ProcessName, StartTime, @{Name="Memory(MB)";Expression={[math]::Round($_.WorkingSet64/1MB,2)}}
```

### 3. Kiểm tra cmd processes:
```powershell
Get-Process -Name cmd | Measure-Object | Select-Object -ExpandProperty Count
```

## Lưu ý:

1. **Luôn kill trước khi start**: Chạy `kill-all-processes-complete.ps1` trước khi start services
2. **Đợi ports được release**: Đợi 5-10 giây sau khi kill
3. **Kiểm tra lại**: Sau khi kill, kiểm tra xem ports đã free chưa
4. **Không dùng Start-Job**: Tránh dùng `Start-Job` trong PowerShell scripts
5. **Track tất cả processes**: Đảm bảo tất cả child processes được track và kill

## Nếu vẫn còn processes:

1. **Kill thủ công**:
```powershell
# Tìm PID
Get-NetTCPConnection -LocalPort 4000 | Select-Object OwningProcess

# Kill PID
taskkill /F /T /Y /PID <PID>
```

2. **Restart máy**: Nếu quá nhiều processes, restart máy là cách nhanh nhất

3. **Kiểm tra Task Manager**: Mở Task Manager và kill thủ công

