# Force kill ALL processes on service ports
# Usage: .\force-kill-ports.ps1

$ports = @(4000, 4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 4010, 4011, 5173)
$currentPid = $PID
$killed = 0

Write-Host "Force killing ALL processes on service ports..." -ForegroundColor Red

# Kill 3 times to ensure everything is dead
for ($i = 1; $i -le 3; $i++) {
    Write-Host "Attempt $i of 3..." -ForegroundColor Yellow
    
    # Kill by port
    foreach ($port in $ports) {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($procId in $pids) {
                if ($procId -and $procId -ne $currentPid) {
                    try {
                        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                        if ($proc) {
                            Write-Host "  Killing PID $procId ($($proc.ProcessName)) on port $port" -ForegroundColor Gray
                            taskkill /F /T /PID $procId 2>&1 | Out-Null
                            Start-Sleep -Milliseconds 300
                            $killed++
                        }
                    } catch {
                        # Already gone
                    }
                }
            }
        }
    }
    
    Start-Sleep -Seconds 2
    
    # Kill ALL node processes using service ports
    $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $currentPid }
    if ($nodeProcesses) {
        foreach ($proc in $nodeProcesses) {
            $procPorts = Get-NetTCPConnection -OwningProcess $proc.Id -ErrorAction SilentlyContinue | 
                Where-Object { $ports -contains $_.LocalPort }
            if ($procPorts) {
                try {
                    Write-Host "  Killing node PID $($proc.Id)" -ForegroundColor Gray
                    taskkill /F /T /PID $proc.Id 2>&1 | Out-Null
                    Start-Sleep -Milliseconds 300
                    $killed++
                } catch {
                    # Already gone
                }
            }
        }
    }
    
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Killed $killed process(es)" -ForegroundColor Green
Write-Host "Waiting 10 seconds for ports to be released..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Final check
$remaining = @()
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $remaining += $port
    }
}

if ($remaining.Count -eq 0) {
    Write-Host "All ports are free!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Ports still in use: $($remaining -join ', ')" -ForegroundColor Red
    Write-Host "You may need to restart your computer to fully clear these ports." -ForegroundColor Yellow
}

