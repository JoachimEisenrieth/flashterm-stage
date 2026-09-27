[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $HostName,
    [switch] $Select,
    [object] $OwnerWindow
)

# Read-only: never imports a certificate, exports a key or changes trust.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$HostName = $HostName.Trim().ToLowerInvariant()
if ($HostName -notmatch '^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$' -or -not $HostName.Contains('.')) {
    throw 'Enter the DNS name of the STAGE address, without scheme, port or path.'
}

function Test-StageCertificateName([string] $Pattern, [string] $Name) {
    if ($Pattern.Equals($Name, [StringComparison]::OrdinalIgnoreCase)) { return $true }
    if (-not $Pattern.StartsWith('*.')) { return $false }
    $suffix = $Pattern.Substring(1)
    if (-not $Name.EndsWith($suffix, [StringComparison]::OrdinalIgnoreCase)) { return $false }
    $prefix = $Name.Substring(0, $Name.Length - $suffix.Length)
    return $prefix.Length -gt 0 -and -not $prefix.Contains('.')
}

$results = @(foreach ($certificate in Get-ChildItem Cert:\LocalMachine\My) {
    $names = @($certificate.DnsNameList | ForEach-Object { $_.Unicode })
    if (-not @($names | Where-Object { Test-StageCertificateName $_ $HostName }).Count) { continue }
    $reasons = @()
    if (-not $certificate.HasPrivateKey) { $reasons += 'PrivateKeyMissing' }
    if ($certificate.NotBefore -gt (Get-Date)) { $reasons += 'NotYetValid' }
    if ($certificate.NotAfter -le (Get-Date)) { $reasons += 'Expired' }
    $chain = New-Object Security.Cryptography.X509Certificates.X509Chain
    try {
        $chain.ChainPolicy.RevocationMode = [Security.Cryptography.X509Certificates.X509RevocationMode]::Online
        $chain.ChainPolicy.RevocationFlag = [Security.Cryptography.X509Certificates.X509RevocationFlag]::ExcludeRoot
        $chain.ChainPolicy.VerificationFlags = [Security.Cryptography.X509Certificates.X509VerificationFlags]::NoFlag
        $chain.ChainPolicy.UrlRetrievalTimeout = [TimeSpan]::FromSeconds(10)
        [void] $chain.ChainPolicy.ApplicationPolicy.Add((New-Object Security.Cryptography.Oid('1.3.6.1.5.5.7.3.1')))
        $trusted = $chain.Build($certificate)
        if (-not $trusted) { $reasons += @($chain.ChainStatus | ForEach-Object { [string] $_.Status }) }
    }
    finally { $chain.Dispose() }
    [PSCustomObject]@{
        HostName = $HostName
        Subject = $certificate.Subject
        Thumbprint = $certificate.Thumbprint
        Expires = $certificate.NotAfter
        Selectable = ($reasons.Count -eq 0)
        Reasons = @($reasons)
        VerificationScope = 'CurrentWindowsAccount; FileMaker and separate clients require an additional connection test'
    }
})

if (-not $Select) { return $results }
$eligible = @($results | Where-Object { $_.Selectable } | Sort-Object Expires -Descending)
if ($eligible.Count -eq 0) { throw 'No usable certificate found for this STAGE address. Ask your administrator to provide a trusted server certificate with a private key and reachable revocation information.' }

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form = New-Object Windows.Forms.Form
$form.Text = 'flashterm STAGE - Zertifikat auswaehlen'
$form.Size = New-Object Drawing.Size(660,240)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$label = New-Object Windows.Forms.Label
$label.Text = "Vorhandenes Zertifikat fuer $HostName"
$label.Location = New-Object Drawing.Point(20,20)
$label.Size = New-Object Drawing.Size(610,30)
$list = New-Object Windows.Forms.ComboBox
$list.DropDownStyle = 'DropDownList'
$list.Location = New-Object Drawing.Point(20,60)
$list.Size = New-Object Drawing.Size(610,30)
foreach ($item in $eligible) { [void] $list.Items.Add(('{0} | bis {1:dd.MM.yyyy} | ...{2}' -f $item.Subject,$item.Expires,$item.Thumbprint.Substring($item.Thumbprint.Length-8))) }
$list.SelectedIndex = 0
$ok = New-Object Windows.Forms.Button
$ok.Text = 'Auswaehlen'
$ok.Location = New-Object Drawing.Point(500,135)
$ok.Size = New-Object Drawing.Size(130,35)
$ok.DialogResult = [Windows.Forms.DialogResult]::OK
$cancel = New-Object Windows.Forms.Button
$cancel.Text = 'Abbrechen'
$cancel.Location = New-Object Drawing.Point(355,135)
$cancel.Size = New-Object Drawing.Size(130,35)
$cancel.DialogResult = [Windows.Forms.DialogResult]::Cancel
$form.Controls.AddRange(@($label,$list,$ok,$cancel))
$form.AcceptButton = $ok
$form.CancelButton = $cancel
try {
    $dialogResult = if ($OwnerWindow) { $form.ShowDialog($OwnerWindow) } else { $form.ShowDialog() }
    if ($dialogResult -eq [Windows.Forms.DialogResult]::OK) { return $eligible[$list.SelectedIndex] }
}
finally { $form.Dispose() }
