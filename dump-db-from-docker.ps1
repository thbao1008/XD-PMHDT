# PowerShell script to dump PostgreSQL database from Docker container
# This creates a SQL file that can be imported into pgAdmin

param(
    [string]$OutputFile = "aesp_dump_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql",
    [string]$Format = "plain"  # plain or custom
)

Write-Host "=== Dump Database from Docker Container ===" -ForegroundColor Cyan
Write-Host ""

# Find PostgreSQL container
$dbContainer = docker ps --format "{{.Names}}" | Select-String -Pattern "postgres|aesp.*db" | Select-Object -First 1

if (-not $dbContainer) {
    Write-Host "ERROR: PostgreSQL container not found!" -ForegroundColor Red
    Write-Host "Make sure Docker containers are running: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

$dbContainer = $dbContainer.ToString().Trim()
Write-Host "Found container: $dbContainer" -ForegroundColor Green

# Database configuration
$dbUser = "postgres"
$dbName = "aesp"

Write-Host "Database: $dbName" -ForegroundColor Yellow
Write-Host "Output file: $OutputFile" -ForegroundColor Yellow
Write-Host "Format: $Format" -ForegroundColor Yellow
Write-Host ""

# Dump database
Write-Host "Dumping database..." -ForegroundColor Cyan

if ($Format -eq "custom") {
    # Custom format (binary, compressed)
    $backupFile = $OutputFile -replace '\.sql$', '.backup'
    docker exec -t $dbContainer pg_dump -U $dbUser -Fc $dbName > $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Database dumped to $backupFile" -ForegroundColor Green
        Write-Host "File size: $((Get-Item $backupFile).Length / 1MB) MB" -ForegroundColor Green
        Write-Host ""
        Write-Host "To restore in pgAdmin:" -ForegroundColor Cyan
        Write-Host "  1. Right-click database -> Restore..." -ForegroundColor White
        Write-Host "  2. Select Format: Custom or tar" -ForegroundColor White
        Write-Host "  3. Choose file: $backupFile" -ForegroundColor White
    } else {
        Write-Host "ERROR: Dump failed!" -ForegroundColor Red
        exit 1
    }
} else {
    # Plain SQL format
    docker exec -t $dbContainer pg_dump -U $dbUser $dbName > $OutputFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Database dumped to $OutputFile" -ForegroundColor Green
        Write-Host "File size: $((Get-Item $OutputFile).Length / 1MB) MB" -ForegroundColor Green
        Write-Host ""
        Write-Host "To restore in pgAdmin:" -ForegroundColor Cyan
        Write-Host "  1. Right-click database -> Restore..." -ForegroundColor White
        Write-Host "  2. Select Format: Plain" -ForegroundColor White
        Write-Host "  3. Choose file: $OutputFile" -ForegroundColor White
        Write-Host ""
        Write-Host "Or import using script:" -ForegroundColor Cyan
        Write-Host "  .\import-aesp-sql.ps1" -ForegroundColor White
    } else {
        Write-Host "ERROR: Dump failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== Dump Complete ===" -ForegroundColor Green









