#Requires -Version 5.1
<#
Read-only inventory for planning replacement of an existing flashterm STAGE.
Only a NEW local report directory is written. No installer, backup, publication,
credential request, service change, external request or configuration dump.
Run in 64-bit Windows PowerShell, preferably elevated for complete IIS results.
See docs/customer-installation-questionnaire.md before sending the report.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $OutputDirectory,

    # Optional known application directories. File names/metadata only.
    [string[]] $ExistingStageRoot = @(),

    # Optional known STAGE ports. Only GET http://127.0.0.1:<port>/api/health.
    [ValidateRange(1024, 65535)]
    [int[]] $StagePort = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

if ($env:OS -ne 'Windows_NT') { throw 'This inventory requires Windows.' }
if ($OutputDirectory -notmatch '^[A-Za-z]:\\') {
    throw 'OutputDirectory must be an absolute local Windows directory.'
}
$reportDirectory = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $reportDirectory) {
    throw 'OutputDirectory already exists. Choose a NEW report directory.'
}
foreach ($root in $ExistingStageRoot) {
    if ($root -notmatch '^[A-Za-z]:\\') {
        throw 'ExistingStageRoot must contain absolute local Windows directories.'
    }
}
$null = New-Item -ItemType Directory -Path $reportDirectory

function Read-Section {
    param([scriptblock] $Read)
    try {
        $items = @(& $Read)
        return [ordered]@{ status = 'collected'; items = $items }
    }
    catch {
        # Exception messages, raw responses and command lines may contain secrets.
        return [ordered]@{
            status = 'unavailable'
            items = @()
            note = 'Not collected; check administrative rights and installed components manually.'
        }
    }
}

function Read-LocalHealth {
    param([int] $Port)
    $result = [ordered]@{ port = $Port; httpStatus = $null; health = 'unverified' }
    $response = $null
    $reader = $null
    try {
        $request = [Net.HttpWebRequest]::Create("http://127.0.0.1:$Port/api/health")
        $request.Method = 'GET'
        $request.AllowAutoRedirect = $false
        $request.UseDefaultCredentials = $false
        $request.Proxy = $null
        $request.Timeout = 5000
        $request.ReadWriteTimeout = 5000
        $response = $request.GetResponse()
        $result.httpStatus = [int] $response.StatusCode
        $reader = New-Object IO.StreamReader($response.GetResponseStream())
        $buffer = New-Object char[] 4097
        $count = $reader.ReadBlock($buffer, 0, $buffer.Length)
        if ($count -le 4096 -and $result.httpStatus -eq 200) {
            $body = (-join $buffer[0..([Math]::Max(0, $count - 1))]) | ConvertFrom-Json
            if ($body.status -ceq 'ok') { $result.health = 'ok' }
        }
    }
    catch {
        # Do not output errors or response bodies, even for unexpected endpoints.
        $result.health = 'unverified'
    }
    finally {
        if ($null -ne $reader) { $reader.Dispose() }
        if ($null -ne $response) { $response.Close() }
    }
    return [PSCustomObject] $result
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$report = [ordered]@{
    format = 'flashterm-installation-inventory'
    version = 1
    collectedAt = (Get-Date).ToString('o')
    computerName = $env:COMPUTERNAME
    elevated = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    powerShellVersion = $PSVersionTable.PSVersion.ToString()
    is64BitProcess = [Environment]::Is64BitProcess
    purpose = 'Replacement planning only; not installation approval or a backup.'
    sections = [ordered]@{}
}
$sections = $report.sections

$sections.os = Read-Section {
    Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber,
        OSArchitecture, LastBootUpTime, TotalVisibleMemorySize, FreePhysicalMemory
}
$sections.disks = Read-Section {
    Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' |
        Select-Object DeviceID, FileSystem, Size, FreeSpace
}
$sections.products = Read-Section {
    # Registry metadata only. Do NOT use Win32_Product (can trigger MSI repair).
    $locations = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
    )
    foreach ($location in $locations) {
        if (-not (Test-Path -LiteralPath $location)) { continue }
        foreach ($key in Get-ChildItem -LiteralPath $location) {
            $entry = Get-ItemProperty -LiteralPath $key.PSPath
            if ($entry.PSObject.Properties['DisplayName'] -and
                $entry.DisplayName -match 'FileMaker Server|URL Rewrite|Application Request Routing|TeamViewer') {
                $entry | Select-Object DisplayName, DisplayVersion, InstallLocation
            }
        }
    }
}
$sections.services = Read-Section {
    Get-CimInstance Win32_Service |
        Where-Object { $_.Name -match 'flashterm|FileMaker|^W3SVC$|^WAS$' -or
            $_.DisplayName -match 'flashterm|FileMaker' } |
        Select-Object Name, DisplayName, State, StartMode, ProcessId
    # No PathName, command line, credentials or custom service-account identity.
}
$sections.addresses = Read-Section {
    Get-NetIPAddress | Where-Object { $_.AddressState -eq 'Preferred' } |
        Select-Object InterfaceAlias, AddressFamily, IPAddress, PrefixLength
}
$sections.listeners = Read-Section {
    Get-NetTCPConnection -State Listen |
        Sort-Object LocalPort, LocalAddress |
        Select-Object LocalAddress, LocalPort, OwningProcess
}
$sections.firewallProfiles = Read-Section {
    Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction, DefaultOutboundAction
    # Profile state does not establish effective network isolation.
}
$sections.iis = Read-Section {
    Import-Module WebAdministration -ErrorAction Stop
    $modules = @(Get-WebGlobalModule | Select-Object -ExpandProperty Name)
    $proxyEnabled = $null
    if ($modules -contains 'ApplicationRequestRouting') {
        $proxyEnabled = (Get-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' `
            -Filter 'system.webServer/proxy' -Name 'enabled').Value
    }
    $sites = @(foreach ($site in Get-Website) {
        $bindings = @(foreach ($binding in Get-WebBinding -Name $site.Name) {
            $hash = $binding.certificateHash
            if ($hash -is [byte[]]) { $hash = [BitConverter]::ToString($hash).Replace('-', '') }
            [PSCustomObject]@{
                protocol = [string] $binding.protocol
                bindingInformation = [string] $binding.bindingInformation
                sslFlags = [int] $binding.sslFlags
                certificateThumbprint = [string] $hash
                certificateStore = [string] $binding.certificateStoreName
            }
        })
        [PSCustomObject]@{
            name = [string] $site.Name
            state = [string] $site.State
            physicalPath = [string] $site.physicalPath
            applicationPool = [string] $site.applicationPool
            bindings = $bindings
            applications = @(Get-WebApplication -Site $site.Name |
                Select-Object Path, PhysicalPath, ApplicationPool)
            virtualDirectories = @(Get-WebVirtualDirectory -Site $site.Name |
                Select-Object Path, PhysicalPath)
        }
    })
    [PSCustomObject]@{
        rewriteInstalled = ($modules -contains 'RewriteModule')
        arrInstalled = ($modules -contains 'ApplicationRequestRouting')
        arrProxyEnabled = $proxyEnabled
        sites = $sites
    }
}
$sections.certificates = Read-Section {
    foreach ($certificate in Get-ChildItem Cert:\LocalMachine\My) {
        [PSCustomObject]@{
            subject = $certificate.Subject
            dnsNames = @($certificate.DnsNameList | ForEach-Object { $_.Unicode })
            thumbprint = $certificate.Thumbprint
            notBefore = $certificate.NotBefore.ToString('o')
            notAfter = $certificate.NotAfter.ToString('o')
            hasPrivateKey = $certificate.HasPrivateKey
        }
    }
    # Metadata only: no export, private keys, trust-store changes or trust claim.
}
$sections.applicationFiles = Read-Section {
    $names = @('index.html', 'flashterm.html', 'flashterm.js', 'flashterm.css',
        'config.js', 'web.config', 'package.json', 'scripts\stage-server.js')
    foreach ($root in $ExistingStageRoot) {
        $exists = Test-Path -LiteralPath $root -PathType Container
        $files = @(if ($exists) {
            foreach ($name in $names) {
                $path = Join-Path $root $name
                if (Test-Path -LiteralPath $path -PathType Leaf) {
                    $file = Get-Item -LiteralPath $path
                    [PSCustomObject]@{
                        relativePath = $name
                        size = $file.Length
                        modifiedAt = $file.LastWriteTimeUtc.ToString('o')
                    }
                }
            }
        })
        [PSCustomObject]@{ directory = $root; exists = $exists; files = $files }
    }
    # No file contents, hashes of secrets, recursive search or database access.
}
$sections.localHealth = Read-Section {
    foreach ($port in ($StagePort | Sort-Object -Unique)) { Read-LocalHealth -Port $port }
}
$report.manualChecks = @(
    'Existing STAGE URL including path, old version and customized files',
    'FileMaker hosted database, schema/scripts, Data API rights and PSoS availability',
    'Stage publication settings, active publication and in-flight export jobs',
    'Effective firewall/cloud rules; allowed internal and rejected external client',
    'DNS, certificate chain and browser trust from an actual client',
    'Backups, restore rehearsal, cutover and rollback ownership',
    'TeamViewer reconnect after UAC/logoff/restart; maintenance window'
)
$failedSections = @($sections.Keys | Where-Object { $sections[$_].status -ne 'collected' })
$report.collectionComplete = ($failedSections.Count -eq 0)
$report.unavailableSections = $failedSections
$report.scriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant()
$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $reportDirectory 'inventory.json') -Encoding UTF8

$summary = @(
    'flashterm STAGE - technische Bestandserfassung',
    ('Zeit: ' + $report.collectedAt),
    ('Server: ' + $report.computerName),
    ('Administrator / 64-Bit-Prozess: ' + $report.elevated + ' / ' + $report.is64BitProcess),
    '',
    'Erfasste Abschnitte:'
)
foreach ($name in $sections.Keys) {
    $summary += ('- {0}: {1}; Eintraege: {2}' -f $name, $sections[$name].status, @($sections[$name].items).Count)
}
$summary += @('',
    'Leere Abschnitte und unverified sind KEIN positiver Funktionsnachweis.',
    'collectionComplete bedeutet nur: alle Abfragen liefen ohne Fehler.',
    'Manuelle Pruefung und Kundenfragebogen bleiben erforderlich.',
    'Keine Installationsfreigabe, kein Backup und kein Nachweis der Netzgrenze.',
    'Enthaelt interne Servernamen, IPs und Pfade. Vor Weitergabe pruefen.',
    'Es wurden nur diese Berichtsdateien neu angelegt; keine Systemeinstellungen geaendert.')
$summary | Set-Content -LiteralPath (Join-Path $reportDirectory 'LIESMICH.txt') -Encoding UTF8
Write-Output ('Inventory written to: ' + $reportDirectory)
Write-Output ('Unavailable sections: ' + $failedSections.Count)
