# COMPLETE KILL - Kill ALL node, npm, cmd processes related to services
# Usage: .\kill-all-processes-complete.ps1

Write-Host "COMPLETE KILL: Killing ALL related processes..." -ForegroundColor Red
Write-Host ""

$ports = @(4000, 4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 4010, 4011, 5173)
$killed = 0

# Step 1: Kill by port
Write-Host "Step 1: Killing processes on service ports..." -ForegroundColor Yellow
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -and $procId -ne $PID) {
                try {
                    $process = Get-Process -Id $procId -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "  Killing PID $procId ($($process.ProcessName)) on port $port" -ForegroundColor Gray
                        & taskkill /F /T /Y /PID $procId 2>&1 | Out-Null
                        Start-Sleep -Milliseconds 100
                        $killed++
                    }
                } catch {
                }
            }
        }
    }
}

Start-Sleep -Seconds 2

# Step 2: Kill ALL npm processes
Write-Host "Step 2: Killing ALL npm processes..." -ForegroundColor Yellow
$npmProcesses = Get-Process -Name npm -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID }
if ($npmProcesses) {
    foreach ($proc in $npmProcesses) {
        try {
            Write-Host "  Killing npm PID $($proc.Id)" -ForegroundColor Gray
            & taskkill /F /T /Y /PID $proc.Id 2>&1 | Out-Null
            $killed++
        } catch {
        }
    }
}

Start-Sleep -Seconds 1

# Step 3: Kill ALL node processes using service ports
Write-Host "Step 3: Killing node processes using service ports..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID }
if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        $procPorts = Get-NetTCPConnection -OwningProcess $proc.Id -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort }
        if ($procPorts) {
            try {
                Write-Host "  Killing node PID $($proc.Id) (using ports)" -ForegroundColor Gray
                & taskkill /F /T /Y /PID $proc.Id 2>&1 | Out-Null
                $killed++
            } catch {
            }
        }
    }
}

Start-Sleep -Seconds 1

# Step 4: Kill cmd.exe processes
Write-Host "Step 4: Killing cmd.exe processes..." -ForegroundColor Yellow
$cmdProcesses = Get-Process -Name cmd -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID }
if ($cmdProcesses) {
    $cmdCount = ($cmdProcesses | Measure-Object).Count
    if ($cmdCount -gt 5) {
        Write-Host "  Found $cmdCount cmd.exe processes, killing..." -ForegroundColor Gray
        foreach ($proc in $cmdProcesses) {
            try {
                & taskkill /F /T /Y /PID $proc.Id 2>&1 | Out-Null
                $killed++
            } catch {
            }
        }
    }
}

Start-Sleep -Seconds 1

# Step 5: Kill PowerShell jobs
Write-Host "Step 5: Stopping PowerShell jobs..." -ForegroundColor Yellow
$jobs = Get-Job -ErrorAction SilentlyContinue
if ($jobs) {
    foreach ($job in $jobs) {
        try {
            Write-Host "  Stopping job $($job.Id)" -ForegroundColor Gray
            Stop-Job -Id $job.Id -ErrorAction SilentlyContinue
            Remove-Job -Id $job.Id -ErrorAction SilentlyContinue
        } catch {
        }
    }
}

Start-Sleep -Seconds 2

# Step 6: Final check
Write-Host "Step 6: Final cleanup - checking ports again..." -ForegroundColor Yellow
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -and $procId -ne $PID) {
                try {
                    & taskkill /F /T /Y /PID $procId 2>&1 | Out-Null
                    Write-Host "  Final kill: PID $procId on port $port" -ForegroundColor Gray
                    $killed++
                } catch {
                }
            }
        }
    }
}

Write-Host ""
Write-Host "Killed $killed process(es) and their children" -ForegroundColor Green
Write-Host "Waiting 5 seconds for ports to be fully released..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Final verification
Write-Host ""
Write-Host "Final status:" -ForegroundColor Cyan
$remainingPorts = @()
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $remainingPorts += $port
    }
}

if ($remainingPorts.Count -eq 0) {
    Write-Host "All ports are free!" -ForegroundColor Green
} else {
    Write-Host "Ports still in use: $($remainingPorts -join ', ')" -ForegroundColor Yellow
}

$nodeCount = (Get-Process -Name node -ErrorAction SilentlyContinue | Measure-Object).Count
$cmdCount = (Get-Process -Name cmd -ErrorAction SilentlyContinue | Measure-Object).Count
$npmCount = (Get-Process -Name npm -ErrorAction SilentlyContinue | Measure-Object).Count

Write-Host ""
Write-Host "Remaining processes:" -ForegroundColor Cyan
Write-Host "   Node.js: $nodeCount" -ForegroundColor $(if ($nodeCount -gt 5) { "Yellow" } else { "Green" })
Write-Host "   CMD: $cmdCount" -ForegroundColor $(if ($cmdCount -gt 5) { "Yellow" } else { "Green" })
Write-Host "   NPM: $npmCount" -ForegroundColor $(if ($npmCount -gt 0) { "Yellow" } else { "Green" })
