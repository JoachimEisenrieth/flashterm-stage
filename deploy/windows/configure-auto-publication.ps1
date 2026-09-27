[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string] $SettingsFile,
    [Parameter(Mandatory=$true)][ValidatePattern('^flashterm-stage-[a-z0-9-]+$')][string] $ServiceName,
    [Parameter(Mandatory=$true)][string] $ProjectRoot,
    [Parameter(Mandatory=$true)][string] $NodeExecutable,
    [Parameter(Mandatory=$true)][string] $FileMakerServer,
    [Parameter(Mandatory=$true)][string] $Database,
    [Parameter(Mandatory=$true)][string] $TermbaseName,
    [ValidateSet('public','container')][string] $ImageSource = 'public',
    [Parameter(Mandatory=$true)][Management.Automation.PSCredential] $Credential,
    [switch] $Apply
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$previous = $null
$password = $null
$inputJson = $null
$updated = $null
$trigger = $null
$writeStarted = $false
$service = $null
$oldEncoding = $OutputEncoding
$oldSystemCa = $env:NODE_USE_SYSTEM_CA
try {
    $envFile = (Resolve-Path -LiteralPath $SettingsFile).Path
    $directory = Split-Path $envFile -Parent
    if ((Split-Path $envFile -Leaf) -ine 'service.env') { throw 'Select the protected service.env of this installation.' }
    $service = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'"
    if (-not $service -or $service.State -ne 'Running') { throw 'The selected STAGE service must exist and be running.' }
    $expectedWrapper = Join-Path $directory ($ServiceName + '-service.exe')
    if ($service.PathName.Trim('"') -ine $expectedWrapper) { throw 'Service and protected settings directory do not belong to the same installation.' }
    $previous = [IO.File]::ReadAllText($envFile)
    $existing = @{}
    foreach ($line in ($previous -split '\r?\n')) {
        if (-not $line.Trim() -or $line.Trim().StartsWith('#')) { continue }
        $split = $line.IndexOf('=')
        if ($split -lt 1) { throw 'Invalid service settings.' }
        $key = $line.Substring(0,$split)
        if ($existing.ContainsKey($key)) { throw 'Duplicate service setting.' }
        $existing[$key] = $line.Substring($split+1)
    }
    if ($existing.ContainsKey('FLASHTERM_EXPORT_TRIGGER_TOKEN') -and $existing.FLASHTERM_EXPORT_TRIGGER_TOKEN) {
        throw 'Automatic publication is already configured. This setup does not replace keys or source bindings.'
    }
    $termbase = $existing.FLASHTERM_STAGE_TERMBASE
    if (-not $termbase -or $existing.FLASHTERM_PUBLISH_TERMBASES -ne $termbase) { throw 'This setup requires one explicitly configured and allowed target termbase.' }
    $port = 0
    if (-not [int]::TryParse($existing.FLASHTERM_STAGE_PORT,[ref]$port) -or $port -lt 1024 -or $port -gt 65535) { throw 'Invalid service port.' }
    $password = $Credential.GetNetworkCredential().Password
    foreach ($value in @($FileMakerServer,$Database,$TermbaseName,$Credential.UserName,$password)) {
        if (-not $value -or $value -match '[\r\n\x00]' -or $value.Trim() -cne $value) { throw 'Setup values must be nonempty single lines without leading or trailing whitespace.' }
    }
    $checkScript = Join-Path $ProjectRoot 'scripts\check-filemaker-setup.js'
    if (-not (Test-Path -LiteralPath $checkScript -PathType Leaf)) { throw 'The installed release does not yet support the FileMaker setup check.' }
    $request = @{ server=$FileMakerServer; database=$Database; username=$Credential.UserName; password=$password; tenantId=$existing.FLASHTERM_STAGE_TENANT; termbaseId=$termbase; termbaseName=$TermbaseName; imageSource=$ImageSource }
    $inputJson = $request | ConvertTo-Json -Compress
    $OutputEncoding = New-Object Text.UTF8Encoding($false)
    $env:NODE_USE_SYSTEM_CA = '1'
    $checkText = $inputJson | & $NodeExecutable $checkScript 2>$null
    $checkExit = $LASTEXITCODE
    try { $check = ($checkText -join "`n") | ConvertFrom-Json } catch { throw 'FileMaker read check returned no valid setup result.' }
    if ($checkExit -ne 0 -or -not $check.ok) { throw 'FileMaker read check failed. Check HTTPS trust, the Data API account, API layouts and the exported data. No settings changed.' }
    if (-not $Apply) {
        [PSCustomObject]@{ Mode='Preflight'; Service=$ServiceName; ReadCheck=$check; ConfigurationChanged=$false }
        return
    }
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $trigger = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
    $values = [ordered]@{
        FLASHTERM_FILEMAKER_SERVER=$FileMakerServer.TrimEnd('/')
        FLASHTERM_FILEMAKER_DATABASE=$Database
        FLASHTERM_FILEMAKER_IMAGE_SOURCE=$ImageSource
        FLASHTERM_FILEMAKER_USERNAME=$Credential.UserName
        FLASHTERM_FILEMAKER_PASSWORD=$password
        FLASHTERM_PUBLISH_TERMBASE=$termbase
        FLASHTERM_PUBLISH_TERMBASE_NAME=$TermbaseName
        FLASHTERM_EXPORT_TRIGGER_TOKEN=$trigger
    }
    $updated = $previous.TrimEnd()+"`r`n"
    foreach ($key in $values.Keys) {
        $updated = [regex]::Replace($updated,'(?m)^'+$key+'=.*\r?\n?','')
        $updated += $key+'='+$values[$key]+"`r`n"
    }
    Stop-Service -Name $ServiceName
    # Check persisted job state after stopping, before changing the source/key.
    $jobsDirectory = Join-Path $existing.FLASHTERM_STAGE_DATA 'export-jobs'
    if (Test-Path -LiteralPath $jobsDirectory) {
        foreach ($jobFile in Get-ChildItem -LiteralPath $jobsDirectory -Filter '*.json') {
            $job = Get-Content -LiteralPath $jobFile.FullName -Raw | ConvertFrom-Json
            if ($job.state -in @('preparing','running','interrupted')) { throw 'An unresolved publication job blocks setup. Keep its source and key unchanged.' }
        }
    }
    $writeStarted = $true
    # Writing the existing protected file preserves its ACL; no secret temp file.
    [IO.File]::WriteAllText($envFile,$updated,(New-Object Text.UTF8Encoding($false)))
    Start-Service -Name $ServiceName
    $healthy = $false
    for ($i=0;$i -lt 15;$i++) {
        try { $healthy=(Invoke-RestMethod "http://127.0.0.1:$port/api/health" -TimeoutSec 2).status -eq 'ok' } catch { $healthy=$false }
        if ($healthy) { break }
        Start-Sleep -Seconds 1
    }
    if (-not $healthy) { throw 'The configured service did not become healthy.' }
    [PSCustomObject]@{ Mode='Configured'; Service=$ServiceName; ReadCheck=$check; FileMakerPairing='Pending'; TriggerLocation='Protected service settings only'; ConfigurationChanged=$true }
}
catch {
    $failure = $_
    if ($writeStarted) { [IO.File]::WriteAllText($envFile,$previous,(New-Object Text.UTF8Encoding($false))) }
    if ($service -and (Get-Service $ServiceName).Status -eq 'Stopped') { Start-Service $ServiceName }
    throw $failure
}
finally {
    $OutputEncoding = $oldEncoding
    $env:NODE_USE_SYSTEM_CA = $oldSystemCa
    Remove-Variable previous,password,inputJson,updated,trigger,request,values,Credential -ErrorAction SilentlyContinue
}
