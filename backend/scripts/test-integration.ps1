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
    'run', '--rm', '--build', 'backend-test',
    'python', '-m', 'pytest', '-m', 'integration', '-p', 'no:cacheprovider'
)
# Tham so them thay the lua chon mac dinh (ca thu muc tests/integration).
if ($PytestArgs) { $composeArgs += $PytestArgs } else { $composeArgs += 'tests/integration' }

# Docker ghi canh bao vo hai (vd. orphan containers) ra stderr; PowerShell 5.1 se coi la loi ket thuc
# khi $ErrorActionPreference='Stop'. Chi xet ma thoat that cua docker.
$ErrorActionPreference = 'Continue'
& docker @composeArgs 2>&1 | ForEach-Object { "$_" }
exit $LASTEXITCODE
