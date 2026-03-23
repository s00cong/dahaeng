$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $scriptDir '.env.local'

if (-not (Test-Path $envFile)) {
    throw ".env.local not found: $envFile"
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()

    if (-not $line -or $line.StartsWith('#')) {
        return
    }

    $name, $value = $line -split '=', 2
    if (-not $name) {
        return
    }

    if ($null -eq $value) {
        $value = ''
    }

    [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), 'Process')
}

$pythonExe = Join-Path $scriptDir 'venv\Scripts\python.exe'
if (-not (Test-Path $pythonExe)) {
    $pythonExe = 'python'
}

Push-Location $scriptDir
try {
    & $pythonExe .\main.py
}
finally {
    Pop-Location
}
