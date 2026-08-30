[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $ProjectRoot,

    [Parameter(Mandatory = $true)]
    [string] $SettingsFile,

    [string] $NodeExecutable = "node.exe"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$resolvedProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$resolvedSettingsFile = (Resolve-Path -LiteralPath $SettingsFile).Path
$serverScript = Join-Path $resolvedProjectRoot "scripts\stage-server.js"

if (-not (Test-Path -LiteralPath $serverScript -PathType Leaf)) {
    throw "The flashterm stage server script was not found."
}

foreach ($line in Get-Content -LiteralPath $resolvedSettingsFile -Encoding UTF8) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) {
        continue
    }

    $separator = $trimmed.IndexOf("=")
    if ($separator -le 0) {
        throw "The service settings file contains an invalid line."
    }

    $name = $trimmed.Substring(0, $separator).Trim()
    $value = $trimmed.Substring($separator + 1)
    if ($name -notmatch '^FLASHTERM_[A-Z0-9_]+$') {
        throw "The service settings file contains an invalid variable name."
    }

    Set-Item -Path "Env:$name" -Value $value
}

$nodeCommand = Get-Command $NodeExecutable -ErrorAction Stop
Set-Location -LiteralPath $resolvedProjectRoot
& $nodeCommand.Source $serverScript
exit $LASTEXITCODE
