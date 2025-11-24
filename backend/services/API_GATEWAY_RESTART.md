# API Gateway Restart - Tích Hợp Vào Start Services

## ✅ ĐÃ TÍCH HỢP:

### 1. Function `killApiGateway()`
- Kill process trên port 4000 (API Gateway) trước khi start
- Đảm bảo API Gateway được restart sạch sẽ
- Chỉ chạy trên Windows

### 2. Tích hợp vào `startServices()`
- Gọi `killApiGateway()` trước khi start tất cả services
- Đảm bảo API Gateway được kill và start lại đúng cách

## ✅ CODE:

```javascript
// Function to kill API Gateway specifically (port 4000)
function killApiGateway() {
  const isWindows = process.platform === "win32";
  if (!isWindows) return;
  
  try {
    console.log("🔄 Restarting API Gateway (port 4000)...");
    const currentPid = process.pid;
    const command = `$port = 4000; $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue; if ($conns) { $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($procId in $pids) { if ($procId -and $procId -ne ${currentPid}) { try { taskkill /F /T /PID $procId 2>&1 | Out-Null; Start-Sleep -Milliseconds 500 } catch {} } } }`;
    execSync(`powershell -Command "${command}"`, { stdio: "ignore", timeout: 10000 });
    // Wait a bit for port to be released
    execSync(`powershell -Command "Start-Sleep -Seconds 1"`, { stdio: "ignore", timeout: 2000 });
  } catch (e) {
    // Ignore errors
  }
}

function startServices() {
  console.log("🚀 Starting all microservices...\n");

  // Kill API Gateway specifically before starting (to ensure clean restart)
  killApiGateway();

  services.forEach((service) => {
    // ... start services ...
  });
}
```

## ✅ FLOW HOẠT ĐỘNG:

1. **Kill tất cả processes** (nếu ports đang bị chiếm)
2. **Kill API Gateway cụ thể** (port 4000) - đảm bảo restart sạch
3. **Start tất cả services** (bao gồm API Gateway)

## ✅ LỢI ÍCH:

- ✅ API Gateway được restart sạch sẽ mỗi lần chạy script
- ✅ Không cần restart thủ công
- ✅ Đảm bảo không có process cũ còn sót lại
- ✅ Port 4000 được release trước khi start

## ✅ CÁCH SỬ DỤNG:

```bash
cd backend/services
node start-all-services.js
```

Script sẽ tự động:
1. Kill tất cả processes trên service ports (nếu cần)
2. Kill API Gateway cụ thể (port 4000)
3. Start tất cả services (bao gồm API Gateway)

## 📝 LƯU Ý:

- API Gateway được kill và restart mỗi lần chạy script
- Không cần restart thủ công API Gateway
- Tất cả thay đổi trong `api-gateway/src/server.js` sẽ được áp dụng khi restart

