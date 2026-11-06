[CmdletBinding()]
param(
    [switch]$Integration
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$backendRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $backendRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) {
    throw 'Virtual environment not found. Run .\scripts\install.ps1 first.'
}
if ($Integration) {
    Write-Host 'Integration tests need Postgres in Docker: run .\scripts\test-integration.ps1' -ForegroundColor Yellow
}
$arguments = @('-m', 'pytest')
if (-not $Integration) {
    $arguments += @('-m', 'not integration')
}
Push-Location $backendRoot
try {
    & $python @arguments
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
