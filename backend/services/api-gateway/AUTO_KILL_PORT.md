# Fix: API Gateway Tự Động Kill Port Khi Auto-Reload

## ✅ VẤN ĐỀ:

- Khi `node --watch` auto-reload, port 4000 vẫn bị chiếm bởi process cũ
- Lỗi: "Port 4000 is already in use!"
- API Gateway không thể restart

## ✅ GIẢI PHÁP:

### 1. Function `killPortBeforeStart()`
- Kill process trên port 4000 trước khi start
- Chỉ chạy trên Windows
- Không kill process hiện tại (current PID)

### 2. Retry Logic trong `startServer()`
- Nếu port vẫn bị chiếm, kill lại và retry
- Đợi 1 giây trước khi retry
- Đảm bảo port được release

## ✅ CODE:

```javascript
import { execSync } from "child_process";

// Function to kill port before starting (for auto-reload)
function killPortBeforeStart(port) {
  const isWindows = process.platform === "win32";
  if (!isWindows) return;
  
  try {
    const currentPid = process.pid;
    const command = `$port = ${port}; $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; if ($conns) { $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($procId in $pids) { if ($procId -and $procId -ne ${currentPid}) { try { taskkill /F /T /PID $procId 2>&1 | Out-Null; Start-Sleep -Milliseconds 300 } catch {} } } }`;
    execSync(`powershell -Command "${command}"`, { stdio: "ignore", timeout: 5000 });
    // Wait a bit for port to be released
    execSync(`powershell -Command "Start-Sleep -Milliseconds 500"`, { stdio: "ignore", timeout: 1000 });
  } catch (e) {
    // Ignore errors
  }
}

// Create server with retry logic
function startServer() {
  // Kill port before starting
  killPortBeforeStart(PORT);

  const server = app.listen(PORT, () => {
    console.log(`🚀 API Gateway running on port ${PORT}`);
    // ... rest of startup messages
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`🔄 Port ${PORT} is in use, killing old process...`);
      killPortBeforeStart(PORT);
      // Retry after a short delay
      setTimeout(() => {
        console.log(`🔄 Retrying to start on port ${PORT}...`);
        startServer();
      }, 1000);
    } else {
      console.error(`❌ Error starting API Gateway:`, err);
      process.exit(1);
    }
  });

  return server;
}

startServer();
```

## ✅ FLOW HOẠT ĐỘNG:

1. **File thay đổi** → `node --watch` detect
2. **Kill port cũ** → `killPortBeforeStart(4000)`
3. **Start server** → `app.listen(4000)`
4. **Nếu vẫn lỗi** → Kill lại và retry sau 1s

## ✅ LỢI ÍCH:

- ✅ Tự động kill port cũ khi auto-reload
- ✅ Không cần restart thủ công
- ✅ Retry logic đảm bảo port được release
- ✅ Không crash khi port bị chiếm

## 📝 LƯU Ý:

- Function chỉ chạy trên Windows
- Không kill process hiện tại (current PID)
- Retry sau 1 giây nếu vẫn lỗi
- Tự động release port trước khi start

