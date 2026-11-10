$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$clientPath = Join-Path $projectRoot 'client'
$serverPath = Join-Path $projectRoot 'node-server'

# Stop only Node processes whose command line points into this project's app folders.
$processes = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object {
        $_.CommandLine -and
        ($_.CommandLine.IndexOf($clientPath, [StringComparison]::OrdinalIgnoreCase) -ge 0 -or
         $_.CommandLine.IndexOf($serverPath, [StringComparison]::OrdinalIgnoreCase) -ge 0)
    }

foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Milliseconds 700

$clientCommand = "Set-Location -LiteralPath '$clientPath'; npm install; if (`$LASTEXITCODE -eq 0) { npm run dev } else { Write-Host 'Client install failed.' -ForegroundColor Red; Read-Host 'Press Enter to close' }"
$serverCommand = "Set-Location -LiteralPath '$serverPath'; npm install; if (`$LASTEXITCODE -eq 0) { npm start } else { Write-Host 'Backend install failed.' -ForegroundColor Red; Read-Host 'Press Enter to close' }"

Start-Process -FilePath 'powershell.exe' -WorkingDirectory $clientPath -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $clientCommand)
Start-Process -FilePath 'powershell.exe' -WorkingDirectory $serverPath -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $serverCommand)
