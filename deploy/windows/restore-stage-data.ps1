[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string] $Archive,
    [Parameter(Mandatory=$true)][ValidatePattern('^[A-Fa-f0-9]{64}$')][string] $ExpectedSha256,
    [Parameter(Mandatory=$true)][string] $Destination
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$zipPath=(Resolve-Path -LiteralPath $Archive).Path
$target=[IO.Path]::GetFullPath($Destination).TrimEnd('\')
if ($target -notmatch '^[A-Za-z]:\\' -or $target.Length -lt 4 -or (Test-Path -LiteralPath $target)) {
    throw 'Restore requires a new local destination directory. Existing data is never overwritten.'
}
if ((Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash -ine $ExpectedSha256) { throw 'Backup checksum mismatch.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=[IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $names=@{}
    foreach ($entry in $zip.Entries) {
        $name=$entry.FullName.Replace('/','\')
        if ($name -match '(^\\|:|(^|\\)\.\.?($|\\))' -or [string]::IsNullOrWhiteSpace($name)) { throw 'Unsafe archive path.' }
        $full=[IO.Path]::GetFullPath((Join-Path $target $name))
        if (-not $full.StartsWith(($target+'\'),[StringComparison]::OrdinalIgnoreCase)) { throw 'Archive escapes its restore directory.' }
        if ($names.ContainsKey($full)) { throw 'Duplicate archive path.' }
        $names[$full]=$true
        if ((($entry.ExternalAttributes -shr 16) -band 61440) -eq 40960) { throw 'Archive links are not supported.' }
    }
} finally { $zip.Dispose() }
# Keep a failed extraction for diagnosis rather than deleting potentially useful data.
[IO.Compression.ZipFile]::ExtractToDirectory($zipPath,$target)
[PSCustomObject]@{ Mode='RestoredToNewDirectory'; Destination=$target; ArchiveSha256=$ExpectedSha256.ToUpperInvariant(); Activated=$false }
