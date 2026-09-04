[CmdletBinding()]
param(
    [string] $SettingsFile = (Join-Path $PSScriptRoot "customer-settings.json"),

    [Security.SecureString] $OidcClientSecret,

    [switch] $Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RequiredSetting {
    param(
        [Parameter(Mandatory = $true)] $Settings,
        [Parameter(Mandatory = $true)] [string] $Name
    )

    $property = $Settings.PSObject.Properties[$Name]
    if (-not $property -or $null -eq $property.Value) {
        throw "Missing installer setting: $Name"
    }
    if ($property.Value -is [string]) {
        $value = $property.Value.Trim()
        if (-not $value) {
            throw "Installer setting is empty: $Name"
        }
        return $value
    }
    return $property.Value
}

function Assert-CustomerValue {
    param(
        [Parameter(Mandatory = $true)] [string] $Value,
        [Parameter(Mandatory = $true)] [string] $Name
    )

    if ($Value -match '(?i)YOUR-|REPLACE-|example\.org' -or $Value -match '[\r\n]') {
        throw "Installer setting still contains a placeholder or line break: $Name"
    }
}

function Assert-SafeLocalDirectory {
    param(
        [Parameter(Mandatory = $true)] [string] $Value,
        [Parameter(Mandatory = $true)] [string] $Name
    )

    if ($Value -notmatch '^[A-Za-z]:\\' -or $Value -notmatch '(?i)flashterm-stage') {
        throw "$Name must be a dedicated absolute local flashterm-stage directory."
    }
    $fullPath = [IO.Path]::GetFullPath($Value)
    if ($fullPath -eq [IO.Path]::GetPathRoot($fullPath)) {
        throw "$Name must not be a drive root."
    }
    return $fullPath.TrimEnd("\")
}

function Test-CertificateDnsName {
    param(
        [Parameter(Mandatory = $true)] [string] $Pattern,
        [Parameter(Mandatory = $true)] [string] $HostName
    )

    if ($Pattern.Equals($HostName, [StringComparison]::OrdinalIgnoreCase)) {
        return $true
    }
    if (-not $Pattern.StartsWith("*.")) {
        return $false
    }
    $suffix = $Pattern.Substring(1)
    if (-not $HostName.EndsWith($suffix, [StringComparison]::OrdinalIgnoreCase)) {
        return $false
    }
    $prefix = $HostName.Substring(0, $HostName.Length - $suffix.Length)
    return $prefix -and -not $prefix.Contains(".")
}

function Get-FileMakerSiteSnapshot {
    param([Parameter(Mandatory = $true)] [string] $SiteName)

    $site = Get-Website | Where-Object { $_.Name -eq $SiteName }
    if (-not $site) {
        throw "The required FileMaker IIS site was not found."
    }
    $bindings = @(
        Get-WebBinding -Name $SiteName |
            ForEach-Object { "{0}|{1}|{2}" -f $_.protocol, $_.bindingInformation, $_.sslFlags } |
            Sort-Object
    )
    return [PSCustomObject]@{
        Name = $site.Name
        State = [string] $site.State
        Bindings = $bindings -join "`n"
    }
}

function Test-BundleManifest {
    param(
        [Parameter(Mandatory = $true)] [string] $BundleRoot,
        [Parameter(Mandatory = $true)] $Manifest
    )

    if (
        $Manifest.format -ne "flashterm-stage-windows-customer-bundle" -or
        [int] $Manifest.version -ne 1
    ) {
        throw "The customer bundle manifest is not supported."
    }
    $rootPath = [IO.Path]::GetFullPath($BundleRoot).TrimEnd("\")
    $rootPrefix = $rootPath + "\"
    foreach ($entry in @($Manifest.files)) {
        $relativePath = [string] $entry.path
        if (-not $relativePath -or [IO.Path]::IsPathRooted($relativePath)) {
            throw "The customer bundle manifest contains an unsafe path."
        }
        $filePath = [IO.Path]::GetFullPath((Join-Path $rootPath $relativePath))
        if (-not $filePath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
            throw "The customer bundle manifest escapes the bundle directory."
        }
        if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
            throw "A customer bundle file is missing."
        }
        $actualHash = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash
        if (-not $actualHash.Equals([string] $entry.sha256, [StringComparison]::OrdinalIgnoreCase)) {
            throw "A customer bundle file failed its SHA-256 verification."
        }
    }
}

function Invoke-Icacls {
    param(
        [Parameter(Mandatory = $true)] [string] $Path,
        [Parameter(Mandatory = $true)] [string[]] $Arguments
    )

    & icacls.exe $Path @Arguments | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to protect an installation path with icacls."
    }
}

function New-PublishToken {
    $bytes = New-Object byte[] 32
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    }
    finally {
        $generator.Dispose()
    }
    return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

$bundleRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$manifestPath = Join-Path $bundleRoot "manifest.json"
$applicationSource = Join-Path $bundleRoot "application"
$winSwSource = Join-Path $bundleRoot "tools\WinSW-x64.exe"
$nodeSource = Join-Path $bundleRoot "tools\node.exe"

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "The customer bundle manifest is missing."
}
if (-not (Test-Path -LiteralPath $SettingsFile -PathType Leaf)) {
    throw "Copy customer-settings.example.json to customer-settings.json and complete it first."
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
Test-BundleManifest -BundleRoot $bundleRoot -Manifest $manifest
$settings = Get-Content -LiteralPath $SettingsFile -Raw -Encoding UTF8 | ConvertFrom-Json

$instanceId = [string] (Get-RequiredSetting $settings "instanceId")
$hostName = ([string] (Get-RequiredSetting $settings "hostName")).ToLowerInvariant()
$bindingIpAddress = [string] (Get-RequiredSetting $settings "bindingIpAddress")
$port = [int] (Get-RequiredSetting $settings "port")
$tenantId = [string] (Get-RequiredSetting $settings "tenantId")
$termbaseId = [string] (Get-RequiredSetting $settings "termbaseId")
$accessMode = ([string] (Get-RequiredSetting $settings "accessMode")).ToLowerInvariant()
$trustedIntranetConfirmed = $false
$readerGroup = ""
$oidcIssuer = ""
$oidcClientId = ""
$oidcGroupClaim = ""
if ($accessMode -eq "trusted-intranet") {
    $trustedIntranetConfirmed = Get-RequiredSetting $settings "trustedIntranetConfirmed"
    if ($trustedIntranetConfirmed -isnot [bool] -or -not $trustedIntranetConfirmed) {
        throw "trusted-intranet requires trustedIntranetConfirmed to be true."
    }
}
elseif ($accessMode -eq "oidc") {
    $readerGroup = [string] (Get-RequiredSetting $settings "readerGroup")
    $oidcIssuer = ([string] (Get-RequiredSetting $settings "oidcIssuer")).TrimEnd("/")
    $oidcClientId = [string] (Get-RequiredSetting $settings "oidcClientId")
    $oidcGroupClaim = [string] (Get-RequiredSetting $settings "oidcGroupClaim")
}
else {
    throw "accessMode must be oidc or trusted-intranet."
}
$certificateThumbprint = ([string] (Get-RequiredSetting $settings "certificateThumbprint")).Replace(" ", "").ToUpperInvariant()
$fileMakerSiteName = [string] (Get-RequiredSetting $settings "fileMakerSiteName")
$applicationRoot = Assert-SafeLocalDirectory ([string] (Get-RequiredSetting $settings "applicationRoot")) "applicationRoot"
$programDataDirectory = Assert-SafeLocalDirectory ([string] (Get-RequiredSetting $settings "programDataDirectory")) "programDataDirectory"
$dataDirectory = Assert-SafeLocalDirectory ([string] (Get-RequiredSetting $settings "dataDirectory")) "dataDirectory"
$proxyDirectory = Assert-SafeLocalDirectory ([string] (Get-RequiredSetting $settings "proxyDirectory")) "proxyDirectory"

$installationDirectories = @($applicationRoot, $programDataDirectory, $dataDirectory, $proxyDirectory)
for ($leftIndex = 0; $leftIndex -lt $installationDirectories.Count; $leftIndex++) {
    $leftPath = $installationDirectories[$leftIndex].TrimEnd("\")
    $leftPrefix = $leftPath + "\"
    $leftDrive = Split-Path $leftPath -Qualifier
    if (-not (Test-Path -LiteralPath $leftDrive -PathType Container)) {
        throw "An installation target drive does not exist: $leftDrive"
    }
    for ($rightIndex = $leftIndex + 1; $rightIndex -lt $installationDirectories.Count; $rightIndex++) {
        $rightPath = $installationDirectories[$rightIndex].TrimEnd("\")
        $rightPrefix = $rightPath + "\"
        if (
            $leftPath.Equals($rightPath, [StringComparison]::OrdinalIgnoreCase) -or
            $leftPath.StartsWith($rightPrefix, [StringComparison]::OrdinalIgnoreCase) -or
            $rightPath.StartsWith($leftPrefix, [StringComparison]::OrdinalIgnoreCase)
        ) {
            throw "Installation directories must be separate and must not contain one another."
        }
    }
}

foreach ($settingPair in [PSCustomObject[]]@(
    [PSCustomObject]@{ Value = $instanceId; Name = "instanceId" },
    [PSCustomObject]@{ Value = $hostName; Name = "hostName" },
    [PSCustomObject]@{ Value = $tenantId; Name = "tenantId" },
    [PSCustomObject]@{ Value = $termbaseId; Name = "termbaseId" },
    [PSCustomObject]@{ Value = $certificateThumbprint; Name = "certificateThumbprint" }
)) {
    Assert-CustomerValue -Value $settingPair.Value -Name $settingPair.Name
}
if ($accessMode -eq "oidc") {
    foreach ($settingPair in [PSCustomObject[]]@(
        [PSCustomObject]@{ Value = $readerGroup; Name = "readerGroup" },
        [PSCustomObject]@{ Value = $oidcIssuer; Name = "oidcIssuer" },
        [PSCustomObject]@{ Value = $oidcClientId; Name = "oidcClientId" },
        [PSCustomObject]@{ Value = $oidcGroupClaim; Name = "oidcGroupClaim" }
    )) {
        Assert-CustomerValue -Value $settingPair.Value -Name $settingPair.Name
    }
}
if ($instanceId -notmatch '^[a-z0-9][a-z0-9-]{0,31}$') {
    throw "instanceId must use lowercase letters, digits and hyphens only."
}
if ($hostName -notmatch '^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$' -or -not $hostName.Contains(".")) {
    throw "hostName must be a complete DNS host name."
}
if ($port -lt 1024 -or $port -gt 65535) {
    throw "port must be between 1024 and 65535."
}
if ($tenantId -notmatch '^[A-Za-z0-9._-]+$' -or $termbaseId -notmatch '^[A-Za-z0-9._-]+$') {
    throw "Tenant and termbase IDs contain unsupported characters."
}
$parsedBindingIp = $null
if (
    -not [Net.IPAddress]::TryParse($bindingIpAddress, [ref] $parsedBindingIp) -or
    $parsedBindingIp.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork -or
    [Net.IPAddress]::IsLoopback($parsedBindingIp)
) {
    throw "bindingIpAddress must be a non-loopback IPv4 address."
}
$parsedIssuer = $null
if ($accessMode -eq "oidc") {
    if (
        -not [Uri]::TryCreate($oidcIssuer, [UriKind]::Absolute, [ref] $parsedIssuer) -or
        $parsedIssuer.Scheme -ne "https" -or
        $parsedIssuer.UserInfo -or
        $parsedIssuer.Query -or
        $parsedIssuer.Fragment
    ) {
        throw "oidcIssuer must be a clean absolute HTTPS URL."
    }
}
if ($certificateThumbprint -notmatch '^[A-F0-9]{40,64}$') {
    throw "certificateThumbprint must be a complete hexadecimal certificate thumbprint."
}

$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run the installer in an elevated Windows PowerShell session."
}
if (-not [Environment]::Is64BitOperatingSystem -or [Environment]::OSVersion.Version.Build -lt 17763) {
    throw "Windows Server 2019 build 17763 or newer is required."
}
if ($PSVersionTable.PSVersion.Major -lt 5) {
    throw "Windows PowerShell 5.1 or newer is required."
}

Import-Module WebAdministration -ErrorAction Stop
$globalModules = @(Get-WebGlobalModule | Select-Object -ExpandProperty Name)
if ($globalModules -notcontains "RewriteModule" -or $globalModules -notcontains "ApplicationRequestRouting") {
    throw "IIS URL Rewrite and Application Request Routing must be installed before flashterm stage."
}
$arrProxyEnabled = (Get-WebConfigurationProperty -PSPath "MACHINE/WEBROOT/APPHOST" -Filter "system.webServer/proxy" -Name "enabled").Value
if (-not $arrProxyEnabled) {
    throw "The existing IIS ARR proxy function must be enabled by the server administrator."
}

$fileMakerBefore = Get-FileMakerSiteSnapshot -SiteName $fileMakerSiteName
if ($fileMakerBefore.State -ne "Started") {
    throw "The FileMaker IIS site must be running before installation."
}
$localAddresses = @(Get-NetIPAddress -AddressFamily IPv4 | Select-Object -ExpandProperty IPAddress)
if ($localAddresses -notcontains $bindingIpAddress) {
    throw "bindingIpAddress is not assigned to this Windows server."
}
$resolvedAddresses = @([Net.Dns]::GetHostAddresses($hostName) | ForEach-Object { $_.IPAddressToString })
if ($resolvedAddresses -notcontains $bindingIpAddress) {
    throw "The intranet DNS host does not resolve to bindingIpAddress."
}
if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    throw "The configured Node.js loopback port is already in use."
}

$serviceId = "flashterm-stage-$instanceId"
$siteName = $serviceId
$appPoolName = $serviceId
$wrapperBaseName = "$serviceId-service"
$releaseId = [string] $manifest.releaseId
$releaseDirectory = Join-Path $applicationRoot "releases\$releaseId\flashterm-stage"
$currentPath = Join-Path $applicationRoot "current"
$privateNodePath = Join-Path $applicationRoot "runtime\node.exe"
$serviceSettingsPath = Join-Path $programDataDirectory "service.env"
$publisherSettingsPath = Join-Path $programDataDirectory "publisher.env"
$logDirectory = Join-Path $programDataDirectory "logs"
$wrapperPath = Join-Path $programDataDirectory "$wrapperBaseName.exe"
$wrapperXmlPath = Join-Path $programDataDirectory "$wrapperBaseName.xml"
$publicOrigin = "https://$hostName"
$bindingInformation = "{0}:443:{1}" -f $bindingIpAddress, $hostName

foreach ($targetPath in @($applicationRoot, $programDataDirectory, $dataDirectory, $proxyDirectory)) {
    if (Test-Path -LiteralPath $targetPath) {
        throw "A fresh-install target already exists: $targetPath"
    }
}
if (Get-Service -Name $serviceId -ErrorAction SilentlyContinue) {
    throw "The flashterm stage service already exists."
}
if ((Test-Path "IIS:\Sites\$siteName") -or (Test-Path "IIS:\AppPools\$appPoolName")) {
    throw "The flashterm stage IIS site or application pool already exists."
}
$conflictingBinding = Get-WebBinding | Where-Object {
    $_.protocol -eq "https" -and $_.bindingInformation -eq $bindingInformation
}
if ($conflictingBinding) {
    throw "The requested IIS HTTPS binding already exists."
}

$certificate = Get-Item -LiteralPath "Cert:\LocalMachine\My\$certificateThumbprint" -ErrorAction SilentlyContinue
if (-not $certificate -or -not $certificate.HasPrivateKey -or $certificate.NotAfter -le (Get-Date)) {
    throw "The selected LocalMachine certificate is missing, expired or has no private key."
}
$certificateDnsNames = @($certificate.DnsNameList | ForEach-Object { $_.Unicode })
if (-not $certificateDnsNames) {
    $commonNameEntry = $certificate.Subject -split ',' |
        Where-Object { $_.Trim().StartsWith("CN=") } |
        Select-Object -First 1
    if ($commonNameEntry) {
        $certificateDnsNames = @($commonNameEntry.Trim().Substring(3))
    }
}
$certificateMatches = @($certificateDnsNames | Where-Object {
    Test-CertificateDnsName -Pattern $_ -HostName $hostName
}).Count -gt 0
if (-not $certificateMatches) {
    throw "The selected certificate does not cover the configured intranet host."
}

$nodeVersionText = (& $nodeSource --version 2>$null)
if ($LASTEXITCODE -ne 0 -or $nodeVersionText -notmatch '^v([0-9]+)\.') {
    throw "The bundled private Node.js runtime cannot be executed."
}
if ([int] $Matches[1] -lt 20) {
    throw "The bundled private Node.js runtime must be Node 20 or newer."
}
if ($nodeSource -match '(?i)FileMaker Server') {
    throw "FileMaker Server's internal Node.js runtime must never be used by flashterm stage."
}

$oidcDiscoveryStatus = "not-required"
if ($accessMode -eq "oidc") {
    $discovery = Invoke-RestMethod -Method Get -Uri "$oidcIssuer/.well-known/openid-configuration" -TimeoutSec 20
    if (-not $discovery.issuer -or ([string] $discovery.issuer).TrimEnd("/") -ne $oidcIssuer) {
        throw "The OIDC discovery issuer does not match the configured issuer."
    }
    $oidcDiscoveryStatus = "ok"
}

if (-not $Apply) {
    [PSCustomObject]@{
        Mode = "Preflight"
        Release = $releaseId
        Instance = $instanceId
        AccessMode = $accessMode
        HostName = $hostName
        BindingIpAddress = $bindingIpAddress
        NodePort = $port
        NodeRuntime = "BundledPrivateRuntime"
        Service = $serviceId
        Site = $siteName
        FileMakerSite = $fileMakerBefore.Name
        FileMakerState = $fileMakerBefore.State
        CertificateExpires = $certificate.NotAfter
        OidcDiscovery = $oidcDiscoveryStatus
        BundleIntegrity = "ok"
    }
    return
}

$clientSecretPlain = ""
if ($accessMode -eq "oidc") {
    if (-not $OidcClientSecret) {
        $OidcClientSecret = Read-Host "OIDC Client Secret" -AsSecureString
    }
    $secretCredential = New-Object Net.NetworkCredential("", $OidcClientSecret)
    $clientSecretPlain = $secretCredential.Password
    if ([string]::IsNullOrWhiteSpace($clientSecretPlain) -or $clientSecretPlain.Length -lt 16 -or $clientSecretPlain -match '[\r\n]') {
        throw "The OIDC Client Secret is empty or unexpectedly short."
    }
}
$publishToken = New-PublishToken
$groupAccessJson = ""
if ($accessMode -eq "oidc") {
    $groupAccess = @{}
    $groupAccess[$readerGroup] = @($termbaseId)
    $groupAccessJson = ConvertTo-Json $groupAccess -Compress
}
$utf8WithoutBom = New-Object Text.UTF8Encoding($false)
$generatedRoot = Join-Path ([IO.Path]::GetTempPath()) ("flashterm-stage-installer-" + [Guid]::NewGuid().ToString("N"))

$createdApplication = $false
$createdProgramData = $false
$createdData = $false
$createdProxy = $false
$createdAppPool = $false
$createdSite = $false
$createdService = $false

try {
    $instanceGenerator = Join-Path $applicationSource "scripts\create-windows-instance-files.js"
    $instanceArguments = [string[]]@(
        "--instance", $instanceId,
        "--port", [string] $port,
        "--origin", $publicOrigin,
        "--output", $generatedRoot,
        "--project-root", $currentPath,
        "--program-data", $programDataDirectory,
        "--data-directory", $dataDirectory,
        "--node", $privateNodePath,
        "--tenant", $tenantId,
        "--termbase", $termbaseId,
        "--access-mode", $accessMode
    )
    if ($accessMode -eq "oidc") {
        $instanceArguments += [string[]]@("--group", $readerGroup)
    }
    & $nodeSource $instanceGenerator @instanceArguments | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "The instance file generator failed."
    }
    $generatedInstance = Join-Path $generatedRoot $instanceId

    New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null
    New-Item -ItemType Directory -Path (Split-Path $privateNodePath -Parent) -Force | Out-Null
    $createdApplication = $true
    Get-ChildItem -LiteralPath $applicationSource -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $releaseDirectory -Recurse
    }
    Copy-Item -LiteralPath $nodeSource -Destination $privateNodePath
    New-Item -ItemType Junction -Path $currentPath -Target $releaseDirectory | Out-Null

    New-Item -ItemType Directory -Path $programDataDirectory -Force | Out-Null
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    $createdProgramData = $true
    New-Item -ItemType Directory -Path $dataDirectory -Force | Out-Null
    $createdData = $true
    New-Item -ItemType Directory -Path $proxyDirectory -Force | Out-Null
    $createdProxy = $true

    Copy-Item -LiteralPath $winSwSource -Destination $wrapperPath
    Copy-Item -LiteralPath (Join-Path $generatedInstance "$wrapperBaseName.xml") -Destination $wrapperXmlPath
    Copy-Item -LiteralPath (Join-Path $generatedInstance "iis\web.config") -Destination (Join-Path $proxyDirectory "web.config")

    $authenticationLines = if ($accessMode -eq "oidc") {
        [string[]]@(
            "FLASHTERM_STAGE_AUTH=oidc",
            "FLASHTERM_STAGE_PUBLIC_ORIGIN=$publicOrigin",
            "FLASHTERM_OIDC_ISSUER=$oidcIssuer",
            "FLASHTERM_OIDC_CLIENT_ID=$oidcClientId",
            "FLASHTERM_OIDC_CLIENT_SECRET=$clientSecretPlain",
            "FLASHTERM_OIDC_GROUP_CLAIM=$oidcGroupClaim",
            "FLASHTERM_STAGE_GROUP_ACCESS=$groupAccessJson"
        )
    }
    else {
        [string[]]@(
            "FLASHTERM_STAGE_AUTH=trusted-intranet",
            "FLASHTERM_STAGE_PUBLIC_ORIGIN=$publicOrigin"
        )
    }
    $serviceLines = [string[]]@(
        "FLASHTERM_STAGE_PORT=$port",
        "FLASHTERM_STAGE_DATA=$dataDirectory",
        "FLASHTERM_STAGE_TENANT=$tenantId",
        "FLASHTERM_STAGE_TERMBASE=$termbaseId",
        ""
    ) + $authenticationLines + [string[]]@(
        "",
        "FLASHTERM_PUBLISH_TOKEN=$publishToken",
        "FLASHTERM_PUBLISH_TERMBASES=$termbaseId"
    )
    $publisherLines = [string[]]@(
        "FLASHTERM_STAGE_ORIGIN=$publicOrigin",
        "FLASHTERM_STAGE_TENANT=$tenantId",
        "FLASHTERM_PUBLISH_TERMBASE=$termbaseId",
        "FLASHTERM_PUBLISH_TOKEN=$publishToken"
    )
    [IO.File]::WriteAllLines($serviceSettingsPath, $serviceLines, $utf8WithoutBom)
    [IO.File]::WriteAllLines($publisherSettingsPath, $publisherLines, $utf8WithoutBom)

    Invoke-Icacls $applicationRoot @(
        "/inheritance:r", "/grant:r",
        "*S-1-5-32-544:(OI)(CI)(F)", "*S-1-5-18:(OI)(CI)(F)", "*S-1-5-20:(OI)(CI)(RX)"
    )
    Invoke-Icacls $programDataDirectory @(
        "/inheritance:r", "/grant:r",
        "*S-1-5-32-544:(OI)(CI)(F)", "*S-1-5-18:(OI)(CI)(F)", "*S-1-5-20:(OI)(CI)(RX)"
    )
    Invoke-Icacls $serviceSettingsPath @(
        "/inheritance:r", "/grant:r",
        "*S-1-5-32-544:(F)", "*S-1-5-18:(F)", "*S-1-5-20:(R)"
    )
    Invoke-Icacls $publisherSettingsPath @(
        "/inheritance:r", "/grant:r",
        "*S-1-5-32-544:(F)", "*S-1-5-18:(F)"
    )
    Invoke-Icacls $logDirectory @(
        "/inheritance:r", "/grant:r",
        "*S-1-5-32-544:(OI)(CI)(F)", "*S-1-5-18:(OI)(CI)(F)", "*S-1-5-20:(OI)(CI)(M)"
    )
    Invoke-Icacls $dataDirectory @(
        "/inheritance:r", "/grant:r",
        "*S-1-5-32-544:(OI)(CI)(F)", "*S-1-5-18:(OI)(CI)(F)", "*S-1-5-20:(OI)(CI)(M)"
    )
    Invoke-Icacls $proxyDirectory @(
        "/inheritance:r", "/grant:r",
        "*S-1-5-32-544:(OI)(CI)(F)", "*S-1-5-18:(OI)(CI)(F)", "*S-1-5-32-568:(OI)(CI)(RX)"
    )

    New-WebAppPool -Name $appPoolName | Out-Null
    $createdAppPool = $true
    Set-ItemProperty "IIS:\AppPools\$appPoolName" -Name managedRuntimeVersion -Value ""
    New-Item "IIS:\Sites\$siteName" `
        -Bindings @{ protocol = "https"; bindingInformation = $bindingInformation; sslFlags = 1 } `
        -PhysicalPath $proxyDirectory | Out-Null
    $createdSite = $true
    Set-ItemProperty "IIS:\Sites\$siteName" -Name applicationPool -Value $appPoolName
    $httpsBinding = Get-WebBinding -Name $siteName -Protocol "https" | Where-Object {
        $_.bindingInformation -eq $bindingInformation
    }
    if (-not $httpsBinding) {
        throw "The isolated IIS HTTPS binding was not created."
    }
    $httpsBinding.AddSslCertificate($certificateThumbprint, "My")

    & $wrapperPath install | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "WinSW could not install the flashterm stage service."
    }
    $createdService = $true
    & sc.exe config $serviceId "obj=" "NT AUTHORITY\NetworkService" "password=" "" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "The service account could not be changed to NetworkService."
    }
    Start-Service -Name $serviceId
    Start-Website -Name $siteName

    $nodeHealth = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 15
    if ($nodeHealth.status -ne "ok") {
        throw "The local Node.js health check failed."
    }
    $httpsHealth = Invoke-RestMethod -Method Get -Uri "$publicOrigin/api/health" -TimeoutSec 20
    if ($httpsHealth.status -ne "ok") {
        throw "The intranet HTTPS health check failed."
    }
    $fileMakerAfter = Get-FileMakerSiteSnapshot -SiteName $fileMakerSiteName
    if (
        $fileMakerAfter.State -ne $fileMakerBefore.State -or
        $fileMakerAfter.Bindings -ne $fileMakerBefore.Bindings
    ) {
        throw "The FileMaker IIS site changed during installation."
    }

    [PSCustomObject]@{
        Mode = "Installed"
        Release = $releaseId
        Instance = $instanceId
        AccessMode = $accessMode
        Service = $serviceId
        ServiceStatus = (Get-Service -Name $serviceId).Status
        Site = $siteName
        SiteState = (Get-Website -Name $siteName).State
        PublicOrigin = $publicOrigin
        NodeHealth = $nodeHealth.status
        HttpsHealth = $httpsHealth.status
        NodeRuntime = $privateNodePath
        FileMakerSite = $fileMakerAfter.Name
        FileMakerSiteUnchanged = $true
        PublisherSettings = $publisherSettingsPath
    }
}
catch {
    $installationError = $_
    if ($createdSite) {
        Remove-Website -Name $siteName -ErrorAction SilentlyContinue
    }
    if ($createdAppPool) {
        Remove-WebAppPool -Name $appPoolName -ErrorAction SilentlyContinue
    }
    if ($createdService -or (Get-Service -Name $serviceId -ErrorAction SilentlyContinue)) {
        Stop-Service -Name $serviceId -Force -ErrorAction SilentlyContinue
        if (Test-Path -LiteralPath $wrapperPath) {
            & $wrapperPath uninstall | Out-Null
        }
    }
    if ($createdProxy -and (Test-Path -LiteralPath $proxyDirectory)) {
        Remove-Item -LiteralPath $proxyDirectory -Recurse -Force -ErrorAction SilentlyContinue
    }
    if ($createdData -and (Test-Path -LiteralPath $dataDirectory)) {
        Remove-Item -LiteralPath $dataDirectory -Recurse -Force -ErrorAction SilentlyContinue
    }
    if ($createdProgramData -and (Test-Path -LiteralPath $programDataDirectory)) {
        Remove-Item -LiteralPath $programDataDirectory -Recurse -Force -ErrorAction SilentlyContinue
    }
    if ($createdApplication -and (Test-Path -LiteralPath $applicationRoot)) {
        Remove-Item -LiteralPath $applicationRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
    throw "Installation failed; installer-created resources were rolled back. $($installationError.Exception.Message)"
}
finally {
    if (Test-Path -LiteralPath $generatedRoot) {
        Remove-Item -LiteralPath $generatedRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
    Remove-Variable clientSecretPlain, secretCredential, OidcClientSecret, publishToken, serviceLines, publisherLines -ErrorAction SilentlyContinue
}
