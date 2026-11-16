$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$backendDir = Join-Path $projectRoot 'backend'
$pythonExe = Join-Path $backendDir '.venv\Scripts\python.exe'
$nodeExe = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
$viteScript = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$runRoot = Join-Path $env:TEMP 'loanflow-run'
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null

function Show-Notice([string]$message, [string]$title = 'LoanFlow') {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($message, $title, 'OK', 'Information') | Out-Null
}

function Test-ListeningPort([int]$port) {
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

if (-not (Test-Path -LiteralPath (Join-Path $backendDir '.env'))) {
  Show-Notice 'Create backend\.env and enter your MySQL settings before starting LoanFlow.'
  exit 1
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.env'))) {
  Show-Notice 'Create the project .env file from .env.example before starting LoanFlow.'
  exit 1
}
if (-not (Test-Path -LiteralPath $pythonExe) -or -not (Test-Path -LiteralPath $viteScript) -or -not $nodeExe) {
  Show-Notice 'Project dependencies are missing. Run the setup instructions in README.md first.'
  exit 1
}

$apiPidFile = Join-Path $runRoot 'api.pid'
$frontPidFile = Join-Path $runRoot 'frontend.pid'
if (-not (Test-ListeningPort 8000)) {
  $apiOut = Join-Path $runRoot 'api.out.log'
  $apiErr = Join-Path $runRoot 'api.err.log'
  $api = Start-Process -FilePath $pythonExe -ArgumentList @('-m','uvicorn','main:app','--host','127.0.0.1','--port','8000') -WorkingDirectory $backendDir -WindowStyle Hidden -PassThru -RedirectStandardOutput $apiOut -RedirectStandardError $apiErr
  Set-Content -LiteralPath $apiPidFile -Value $api.Id
}

$apiReady = $false
$apiMessage = ''
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 2
    if ($health.status -eq 'ok') { $apiReady = $true; break }
  } catch {
    if ($_.ErrorDetails.Message) { $apiMessage = $_.ErrorDetails.Message }
  }
  Start-Sleep -Milliseconds 500
}
if (-not $apiReady) {
  if (-not $apiMessage) { $apiMessage = 'The API did not start. Check the MySQL service and backend/.env.' }
  Show-Notice "LoanFlow could not connect to MySQL.`r`n`r`n$apiMessage`r`n`r`nAPI log: $runRoot\api.err.log" 'LoanFlow startup problem'
  exit 1
}

if (-not (Test-ListeningPort 5173)) {
  $viteOut = Join-Path $runRoot 'frontend.out.log'
  $viteErr = Join-Path $runRoot 'frontend.err.log'
  $frontend = Start-Process -FilePath $nodeExe -ArgumentList "`"$viteScript`" --host 127.0.0.1" -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $viteOut -RedirectStandardError $viteErr
  Set-Content -LiteralPath $frontPidFile -Value $frontend.Id
}

$frontReady = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  try {
    $page = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -TimeoutSec 2 -UseBasicParsing
    if ($page.StatusCode -eq 200) { $frontReady = $true; break }
  } catch {}
  Start-Sleep -Milliseconds 500
}
if (-not $frontReady) {
  Show-Notice "The frontend did not start. Check the log at $runRoot\frontend.err.log" 'LoanFlow startup problem'
  exit 1
}

Start-Process 'http://127.0.0.1:5173'
