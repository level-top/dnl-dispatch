[CmdletBinding()]
param(
  [int]$FrontendPort = 3010,
  [int]$BackendPort = 5010,
  [string]$FrontendPath,
  [string]$BackendPath,
  [switch]$SkipFrontend,
  [switch]$SkipBackend,
  [switch]$SkipAudit,
  [switch]$SkipBuild,
  [switch]$SkipLint
)

$ErrorActionPreference = 'Stop'

function Get-NodePath {
  $cmd = Get-Command node -ErrorAction Stop
  return $cmd.Source
}

function Wait-ForPort {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 15,
    [int]$OwningProcessId,
    [System.Diagnostics.Process]$Process
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if ($Process -and $Process.HasExited) { return $false }

    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
      if (-not $OwningProcessId) { return $true }
      if ($conn.OwningProcess -eq $OwningProcessId) { return $true }
    }
    Start-Sleep -Milliseconds 250
  }
  return $false
}

function Http-Status {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 8
  )

  try {
    return (Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec $TimeoutSeconds).StatusCode
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      return [int]$_.Exception.Response.StatusCode
    }
    return $_.Exception.Message
  }
}

$nodePath = Get-NodePath
$nodeVersion = & $nodePath -e "console.log(process.version)"
Write-Host "Node: $nodeVersion ($nodePath)"

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $FrontendPath) {
  $FrontendPath = Join-Path $repoRoot "front_end vibecode dnl\dnl_front_end"
}
if (-not $BackendPath) {
  $BackendPath = Join-Path $repoRoot "vibe code dnl"
}

$failed = $false

if (-not $SkipFrontend) {
  Write-Host "\n== Frontend ==" -ForegroundColor Cyan
  if (-not (Test-Path $FrontendPath)) { throw "FrontendPath not found: $FrontendPath" }

  Push-Location $FrontendPath
  try {
    if (-not $SkipLint) {
      Write-Host "Running: npm run lint"
      npm run lint
    }

    if (-not $SkipBuild) {
      Write-Host "Running: npm run build"
      npm run build
    }

    if (-not $SkipAudit) {
      Write-Host "Running: npm audit --omit=dev"
      npm audit --omit=dev
    }

    $existing = Get-NetTCPConnection -LocalPort $FrontendPort -State Listen -ErrorAction SilentlyContinue
    if ($existing) {
      $failed = $true
      Write-Host "Frontend port $FrontendPort is already in use (PID $($existing.OwningProcess)). Choose a different -FrontendPort." -ForegroundColor Red
    } else {
      Write-Host "Starting prod server on :$FrontendPort" 
      $frontendProc = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory $FrontendPath -FilePath $nodePath -ArgumentList @(
        "node_modules\\next\\dist\\bin\\next",
        "start",
        "-p",
        "$FrontendPort"
      )

      if (-not (Wait-ForPort -Port $FrontendPort -TimeoutSeconds 20 -OwningProcessId $frontendProc.Id -Process $frontendProc)) {
        $failed = $true
        if ($frontendProc -and $frontendProc.HasExited) {
          Write-Host "Frontend process exited early (exit code $($frontendProc.ExitCode))." -ForegroundColor Red
        } else {
          Write-Host "Frontend did not start listening on port $FrontendPort" -ForegroundColor Red
        }
      } else {
        $root = Http-Status -Url "http://localhost:$FrontendPort/"
        $login = Http-Status -Url "http://localhost:$FrontendPort/login"
        Write-Host "GET / => $root"
        Write-Host "GET /login => $login"
        if ($root -ne 200 -or $login -ne 200) { $failed = $true }
      }
    }
  } finally {
    if ($frontendProc -and -not $frontendProc.HasExited) {
      Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue
    }
    Pop-Location
  }
}

if (-not $SkipBackend) {
  Write-Host "\n== Backend ==" -ForegroundColor Cyan
  if (-not (Test-Path $BackendPath)) { throw "BackendPath not found: $BackendPath" }

  Push-Location $BackendPath
  try {
    if (-not $SkipAudit) {
      Write-Host "Running: npm audit --omit=dev"
      npm audit --omit=dev
    }

    $existing = Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction SilentlyContinue
    if ($existing) {
      $failed = $true
      Write-Host "Backend port $BackendPort is already in use (PID $($existing.OwningProcess)). Choose a different -BackendPort." -ForegroundColor Red
    } else {
      Write-Host "Starting API on :$BackendPort" 
      $env:PORT = "$BackendPort"

      $backendProc = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory $BackendPath -FilePath $nodePath -ArgumentList @(
        "src\\app.js"
      )

      if (-not (Wait-ForPort -Port $BackendPort -TimeoutSeconds 20 -OwningProcessId $backendProc.Id -Process $backendProc)) {
        $failed = $true
        if ($backendProc -and $backendProc.HasExited) {
          Write-Host "Backend process exited early (exit code $($backendProc.ExitCode))." -ForegroundColor Red
        } else {
          Write-Host "Backend did not start listening on port $BackendPort" -ForegroundColor Red
        }
      } else {
        $root = Http-Status -Url "http://localhost:$BackendPort/"
        $users = Http-Status -Url "http://localhost:$BackendPort/api/users"
        Write-Host "GET / => $root"
        Write-Host "GET /api/users => $users" 
        if ($root -ne 200) { $failed = $true }
        if ($users -ne 401) {
          Write-Host "Expected /api/users to be 401 (auth-protected)." -ForegroundColor Yellow
          $failed = $true
        }
      }
    }
  } finally {
    if ($backendProc -and -not $backendProc.HasExited) {
      Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    }
    Remove-Item Env:PORT -ErrorAction SilentlyContinue
    Pop-Location
  }
}

if ($failed) {
  Write-Host "\nSMOKE: FAIL" -ForegroundColor Red
  exit 1
}

Write-Host "\nSMOKE: PASS" -ForegroundColor Green
exit 0
