[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $DataDirectory,

    [Parameter(Mandatory = $true)]
    [string] $BackupDirectory,

    [string] $ServiceName = "flashterm-stage"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($service -and $service.Status -ne "Stopped") {
    throw "Stop the flashterm stage service before creating a filesystem backup."
}

$resolvedDataDirectory = (Resolve-Path -LiteralPath $DataDirectory).Path
if (-not (Test-Path -LiteralPath $resolvedDataDirectory -PathType Container)) {
    throw "The flashterm stage data directory was not found."
}

New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
$resolvedBackupDirectory = (Resolve-Path -LiteralPath $BackupDirectory).Path
$dataPrefix = $resolvedDataDirectory.TrimEnd("\") + "\"
if ($resolvedBackupDirectory.StartsWith($dataPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "The backup directory must be outside the flashterm stage data directory."
}
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $resolvedBackupDirectory "flashterm-stage-data-$timestamp.zip"

Compress-Archive -LiteralPath $resolvedDataDirectory -DestinationPath $backupPath -CompressionLevel Optimal

$archive = Get-Item -LiteralPath $backupPath
Write-Output $archive.FullName
