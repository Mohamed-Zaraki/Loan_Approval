$runRoot = Join-Path $env:TEMP 'loanflow-run'
$projectRoot = $PSScriptRoot
$apiPython = Join-Path $projectRoot 'backend\.venv\Scripts\python.exe'
$viteScript = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
foreach ($name in @('api.pid', 'frontend.pid')) {
  $pidFile = Join-Path $runRoot $name
  if (-not (Test-Path -LiteralPath $pidFile)) { continue }
  $processId = 0
  if ([int]::TryParse((Get-Content -LiteralPath $pidFile -Raw).Trim(), [ref]$processId)) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
    $isLoanFlowApi = $process -and $process.ExecutablePath -eq $apiPython -and $process.CommandLine.Contains('main:app')
    $isLoanFlowFrontend = $process -and $process.Name -eq 'node.exe' -and $process.CommandLine.Contains($viteScript)
    if ($isLoanFlowApi -or $isLoanFlowFrontend) {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
  }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}
