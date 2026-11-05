# Chay kiem thu tich hop trong mang Compose (bank-data) tren Postgres that, dang nhap bank_app (chiu RLS).
# Khong publish cong Postgres, khong in mat khau. Tham so them duoc chuyen cho pytest.
[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$PytestArgs)

$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path -Parent $PSScriptRoot
$infraRoot = Join-Path (Split-Path -Parent $backendRoot) 'infra'
$composeArgs = @(
    'compose',
    '--env-file', (Join-Path $infraRoot 'versions.env'),
    '--env-file', (Join-Path $infraRoot '.env.local'),
    '-f', (Join-Path $infraRoot 'docker-compose.infra.yml'),
    '-f', (Join-Path $backendRoot 'docker-compose.test.yml'),
    '--profile', 'test',
    'run', '--rm', '--build', 'backend-test'
)
if ($PytestArgs) {
    $composeArgs += @('python', '-m', 'pytest', '-m', 'integration', 'tests/integration', '-p', 'no:cacheprovider') + $PytestArgs
}
& docker @composeArgs
exit $LASTEXITCODE
