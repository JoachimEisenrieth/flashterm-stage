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
if (-not $service -or $service.Status -ne "Stopped") {
    throw "Stop the flashterm stage service before creating a filesystem backup."
}

$resolvedDataDirectory = (Resolve-Path -LiteralPath $DataDirectory).Path
if (-not (Test-Path -LiteralPath $resolvedDataDirectory -PathType Container)) {
    throw "The flashterm stage data directory was not found."
}

$resolvedBackupDirectory = [IO.Path]::GetFullPath($BackupDirectory).TrimEnd('\')
$dataPrefix = $resolvedDataDirectory.TrimEnd("\") + "\"
if ($resolvedBackupDirectory -ieq $resolvedDataDirectory.TrimEnd('\') -or $resolvedBackupDirectory.StartsWith($dataPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "The backup directory must be outside the flashterm stage data directory."
}
if (@(Get-ChildItem -LiteralPath $resolvedDataDirectory -Recurse -Force | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count) {
    throw 'Backup refuses links or junctions inside the data directory.'
}
New-Item -ItemType Directory -Path $resolvedBackupDirectory -Force | Out-Null
$timestamp = (Get-Date -Format "yyyyMMdd-HHmmss") + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
$backupPath = Join-Path $resolvedBackupDirectory "flashterm-stage-data-$timestamp.zip"

Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($resolvedDataDirectory,$backupPath,[IO.Compression.CompressionLevel]::Optimal,$true)
$hash = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash
[IO.File]::WriteAllText(($backupPath+'.sha256'),$hash,[Text.Encoding]::ASCII)

$archive = Get-Item -LiteralPath $backupPath
Write-Output $archive.FullName
