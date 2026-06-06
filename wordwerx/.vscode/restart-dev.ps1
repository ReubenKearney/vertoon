# Restart the WORDWERX dev environment and open it in a fresh Chrome window.
#
# Guarantees a SINGLE session: before starting, it kills whatever is currently
# listening on the dev ports (companion server 8787 + Vite 5173) plus any stray
# node processes from this project, so you never end up with two servers at once
# (the EADDRINUSE / stale-tsx problem).
#
# Invoked by .vscode/tasks.json -> "WORDWERX: Restart dev server + open Chrome".

$ErrorActionPreference = 'SilentlyContinue'

$proj   = 'C:\vertoons\vertoon\wordwerx'
$ports  = @(8787, 5173)            # companion server, Vite
$appUrl = 'http://localhost:5173'

Write-Host '== Terminating any existing WORDWERX dev session ==' -ForegroundColor Cyan

# 1) Primary, reliable dedupe: kill whoever OWNS the dev ports.
foreach ($p in $ports) {
  Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
      Write-Host "  stopping PID $_ (listening on port $p)"
      Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
}

# 2) Backstop: kill stray node processes for THIS project (tsx server / vite),
#    scoped to the project path so other projects are never touched.
Get-CimInstance Win32_Process -Filter "name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.CommandLine -and $_.CommandLine -match 'wordwerx' -and
    ($_.CommandLine -match 'server[\\/]index\.ts' -or $_.CommandLine -match '[\\/]vite' -or $_.CommandLine -match 'dev:all')
  } |
  ForEach-Object {
    Write-Host "  stopping stray node PID $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Start-Sleep -Milliseconds 700

# 3) Open a new Chrome window once Vite answers (background waiter so it doesn't
#    block the server that runs in this terminal).
Start-Job -ScriptBlock {
  param($url)
  for ($i = 0; $i -lt 40; $i++) {
    try { if ((Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2).StatusCode -ge 200) { break } } catch {}
    Start-Sleep -Milliseconds 500
  }
  $chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($chrome) { Start-Process $chrome -ArgumentList '--new-window', $url }
  else { Start-Process $url }   # fall back to default browser if Chrome isn't found
} -ArgumentList $appUrl | Out-Null

# 4) Start Vite + companion server in THIS terminal (logs stay visible; closing
#    or re-running the task cleanly replaces it via step 1).
Write-Host '== Starting Vite + companion server (npm run dev:all) ==' -ForegroundColor Green
Set-Location $proj
npm run dev:all
