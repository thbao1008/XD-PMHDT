# PowerShell script to import SQL/backup file into PostgreSQL container
# Supports: .sql (plain), .backup (custom), .tar (tar format)
# Use when database already exists and need to re-import data

param(
    [string]$InputFile = "aesp.sql",
    [switch]$Clean = $false
)

Write-Host "=== Import Database into Docker Container ===" -ForegroundColor Cyan
Write-Host ""

# Check if container is running
$dbContainer = docker ps --format "{{.Names}}" | Select-String -Pattern "postgres|aesp.*db" | Select-Object -First 1

if (-not $dbContainer) {
    Write-Host "ERROR: PostgreSQL container not found. Run: docker-compose up -d db" -ForegroundColor Red
    exit 1
}

$dbContainer = $dbContainer.ToString().Trim()
Write-Host "Found container: $dbContainer" -ForegroundColor Green

# Check if file exists
if (-not (Test-Path $InputFile)) {
    Write-Host "ERROR: File not found: $InputFile" -ForegroundColor Red
    Write-Host "Available files in current directory:" -ForegroundColor Yellow
    Get-ChildItem -Filter "*.sql","*.backup","*.tar" | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
    exit 1
}

$fileExtension = [System.IO.Path]::GetExtension($InputFile).ToLower()
$fileName = [System.IO.Path]::GetFileName($InputFile)

Write-Host "Import information:" -ForegroundColor Yellow
Write-Host "   Container: $dbContainer"
Write-Host "   Database: aesp"
Write-Host "   User: postgres"
Write-Host "   File: $InputFile"
Write-Host "   Format: $fileExtension"
if ($Clean) {
    Write-Host "   Clean mode: Will drop existing data" -ForegroundColor Yellow
}
Write-Host ""

# Clean database if requested
if ($Clean) {
    Write-Host "Cleaning existing database..." -ForegroundColor Yellow
    docker exec -i $dbContainer psql -U postgres -d aesp -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Database cleaned" -ForegroundColor Green
    } else {
        Write-Host "  Warning: Could not clean database (might be empty)" -ForegroundColor Yellow
    }
}

# Copy file into container
Write-Host "Copying file into container..." -ForegroundColor Cyan
$containerPath = "/tmp/$fileName"
docker cp $InputFile "${dbContainer}:${containerPath}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cannot copy file into container" -ForegroundColor Red
    exit 1
}

# Import based on file format
Write-Host "Importing data..." -ForegroundColor Cyan

if ($fileExtension -eq ".sql") {
    # Plain SQL format
    docker exec -i $dbContainer psql -U postgres -d aesp -f $containerPath
} elseif ($fileExtension -eq ".backup" -or $fileExtension -eq ".tar") {
    # Custom or Tar format - use pg_restore
    if ($Clean) {
        docker exec -i $dbContainer pg_restore -U postgres -d aesp -c $containerPath
    } else {
        docker exec -i $dbContainer pg_restore -U postgres -d aesp $containerPath
    }
} else {
    Write-Host "ERROR: Unsupported file format: $fileExtension" -ForegroundColor Red
    Write-Host "Supported formats: .sql, .backup, .tar" -ForegroundColor Yellow
    docker exec $dbContainer rm $containerPath
    exit 1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Import successful!" -ForegroundColor Green
    Write-Host "Cleaning up temporary file in container..." -ForegroundColor Cyan
    docker exec $dbContainer rm $containerPath
    Write-Host ""
    Write-Host "=== Import Complete ===" -ForegroundColor Green
} else {
    Write-Host "ERROR: Import failed. Check errors above." -ForegroundColor Red
    Write-Host "File is still in container at: $containerPath" -ForegroundColor Yellow
    exit 1
}
