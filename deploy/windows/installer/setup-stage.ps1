[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Windows.Forms.Application]::EnableVisualStyles()
$principal=New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    [void][Windows.Forms.MessageBox]::Show('Bitte den Installationsassistenten als Administrator starten.','flashterm STAGE')
    return
}
$state=@{ page=0; installed=$false; certificate=$null; settings=$null; fileMakerChecked=$false; report=@{} }
$ui=@{}
$form=New-Object Windows.Forms.Form
$form.Text='flashterm STAGE installieren'
$form.Size=New-Object Drawing.Size(860,760)
$form.MinimumSize=$form.Size
$form.StartPosition='CenterScreen'
$form.Font=New-Object Drawing.Font('Segoe UI',10)
$title=New-Object Windows.Forms.Label
$title.Location=New-Object Drawing.Point(28,20); $title.Size=New-Object Drawing.Size(780,36)
$title.Font=New-Object Drawing.Font('Segoe UI',18,[Drawing.FontStyle]::Bold)
$form.Controls.Add($title)
$body=New-Object Windows.Forms.Panel
$body.Location=New-Object Drawing.Point(28,75); $body.Size=New-Object Drawing.Size(780,535); $body.AutoScroll=$true
$form.Controls.Add($body)
$status=New-Object Windows.Forms.Label
$status.Location=New-Object Drawing.Point(28,620); $status.Size=New-Object Drawing.Size(780,40)
$form.Controls.Add($status)
$back=New-Object Windows.Forms.Button
$back.Text='Zurueck'; $back.Location=New-Object Drawing.Point(558,675); $back.Size=New-Object Drawing.Size(115,34)
$next=New-Object Windows.Forms.Button
$next.Text='Weiter'; $next.Location=New-Object Drawing.Point(687,675); $next.Size=New-Object Drawing.Size(120,34)
$form.Controls.AddRange(@($back,$next))
$pages=@(); $positions=@{}
for($i=0;$i -lt 7;$i++) {
    $p=New-Object Windows.Forms.Panel; $p.Dock='Fill'; $p.AutoScroll=$true; $p.Visible=$false
    $pages+=,$p; $positions[$i]=0; $body.Controls.Add($p)
}
function Add-Text($page,$text,$height=65) {
    $label=New-Object Windows.Forms.Label; $label.Text=$text
    $label.Location=New-Object Drawing.Point(0,$positions[$page]); $label.Size=New-Object Drawing.Size(735,$height)
    $pages[$page].Controls.Add($label); $positions[$page]+=$height+10
    return $label
}
function Add-Field($page,$caption,$name,$value='') {
    [void](Add-Text $page $caption 23)
    $box=New-Object Windows.Forms.TextBox; $box.Text=$value
    $box.Location=New-Object Drawing.Point(0,$positions[$page]); $box.Size=New-Object Drawing.Size(720,28)
    $pages[$page].Controls.Add($box); $positions[$page]+=39; $ui[$name]=$box
}
function Add-Check($page,$caption,$name,$checked=$false) {
    $box=New-Object Windows.Forms.CheckBox; $box.Text=$caption; $box.Checked=$checked
    $box.Location=New-Object Drawing.Point(0,$positions[$page]); $box.Size=New-Object Drawing.Size(730,38)
    $pages[$page].Controls.Add($box); $positions[$page]+=45; $ui[$name]=$box
}
function Add-Button($page,$caption,$action) {
    $button=New-Object Windows.Forms.Button; $button.Text=$caption
    $button.Location=New-Object Drawing.Point(0,$positions[$page]); $button.Size=New-Object Drawing.Size(285,35)
    $button.Add_Click($action); $pages[$page].Controls.Add($button); $positions[$page]+=45
}
[void](Add-Text 0 "Dieser Assistent richtet eine neue STAGE in getrennten Verzeichnissen ein. Vorhandene Installationen werden nicht ersetzt.`r`n`r`nBereithalten: STAGE-Adresse, vorhandenes Serverzertifikat und FileMaker-Lesezugang." 120)
[void](Add-Text 0 'Diese erste Fassung richtet den Server ein. Die sichere Zuordnung innerhalb der FileMaker-Datei wird noch betreut abgeschlossen. Sie wird nicht automatisch als erfolgreich bestaetigt.' 80)
$serverResult=Add-Text 1 'Mit Weiter werden Windows, Administratorrechte und die benoetigten IIS-Module geprueft. Die vollstaendige Pruefung der gewaehlten Ziele folgt vor der Installation.' 180
Add-Field 2 'Interner DNS-Name der STAGE (ohne https://)' 'host'
Add-Field 2 'Lokale IPv4-Adresse fuer den Webzugang' 'ip'
Add-Check 2 'Nur auf diesem Server testen (127.0.0.1, keine Firmennetz-Abnahme)' 'local'
Add-Check 2 'Die zustaendige IT hat die private Netzgrenze bestaetigt.' 'intranet'
Add-Field 2 'Kurze Installationskennung (z. B. intranet)' 'instance' 'intranet'
Add-Field 2 'Interner Dienstport (muss frei sein)' 'port' '8200'
Add-Field 2 'HTTPS-Port nur fuer den lokalen Test' 'httpsPort' '18446'
$certificateLabel=Add-Text 2 'Noch kein Zertifikat ausgewaehlt.' 38
Add-Button 2 'Vorhandenes Zertifikat auswaehlen' {
    try {
        $selected=& (Join-Path $PSScriptRoot 'select-stage-certificate.ps1') -HostName $ui.host.Text -Select -OwnerWindow $form
        if ($selected) { $state.certificate=$selected; $certificateLabel.Text=('{0}, gueltig bis {1:dd.MM.yyyy}' -f $selected.Subject,$selected.Expires) }
    } catch { $status.Text='Kein passendes vertrauenswuerdiges Zertifikat. DNS-Name und Zertifikat durch die IT pruefen lassen.' }
}
Add-Field 3 'FileMaker-HTTPS-Adresse' 'fmServer'
Add-Field 3 'Gehostete Quelldatei ohne .fmp12' 'database'
Add-Field 3 'Technisches Data-API-Lesekonto' 'username'
Add-Field 3 'Passwort (wird nicht in Berichte uebernommen)' 'password'
$ui.password.UseSystemPasswordChar=$true
Add-Field 3 'Mandantenkennung' 'tenant'
Add-Field 3 'Kennung des veroeffentlichten Bestands' 'termbase'
Add-Field 3 'Anzeigename des Bestands' 'termbaseName'
Add-Check 3 'FileMaker-Anbindung spaeter einrichten' 'skipFileMaker'
$review=Add-Text 4 '' 430
$progress=Add-Text 5 '' 440
$finish=Add-Text 6 '' 390
Add-Button 6 'STAGE im Browser oeffnen' { if ($state.report.ContainsKey('origin')) { Start-Process $state.report.origin } }
Add-Button 6 'Installationsbericht speichern' {
    $dialog=New-Object Windows.Forms.SaveFileDialog; $dialog.Filter='JSON-Bericht (*.json)|*.json'; $dialog.FileName='stage-installationsbericht.json'
    try { if ($dialog.ShowDialog($form) -eq 'OK') { $state.report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $dialog.FileName -Encoding UTF8 } } finally { $dialog.Dispose() }
}
function Show-Page {
    $names=@('Willkommen','Server pruefen','Adresse und Zertifikat','FileMaker verbinden','Bereit zur Installation','Installation pruefen','Einrichtungsstand')
    for($i=0;$i -lt $pages.Count;$i++) { $pages[$i].Visible=($i -eq $state.page) }
    $title.Text=('{0}/7  {1}' -f ($state.page+1),$names[$state.page])
    $back.Enabled=($state.page -gt 0 -and -not $state.installed)
    $next.Text=$(if($state.page -eq 4){'Installieren'}elseif($state.page -eq 6){'Schliessen'}else{'Weiter'})
}
function Read-Settings {
    if (-not $state.certificate) { throw 'CERTIFICATE_REQUIRED' }
    if ($ui.instance.Text -notmatch '^[a-z0-9][a-z0-9-]{0,39}$') { throw 'INSTANCE_INVALID' }
    $id=$ui.instance.Text
    return [ordered]@{ instanceId=$id; hostName=$ui.host.Text.Trim(); bindingIpAddress=$ui.ip.Text.Trim(); port=[int]$ui.port.Text
        tenantId=$ui.tenant.Text.Trim(); termbaseId=$ui.termbase.Text.Trim(); accessMode='trusted-intranet'; trustedIntranetConfirmed=[bool]$ui.intranet.Checked
        certificateThumbprint=$state.certificate.Thumbprint; fileMakerSiteName='FMWebSite'
        applicationRoot="C:\Apps\flashterm-stage-$id"; programDataDirectory="C:\ProgramData\flashterm-stage-$id"
        dataDirectory="C:\Data\flashterm-stage-$id"; proxyDirectory="C:\inetpub\flashterm-stage-$id-proxy" }
}
function Check-FileMaker {
    if ($ui.skipFileMaker.Checked) { return }
    $request=@{ server=$ui.fmServer.Text.Trim(); database=$ui.database.Text.Trim(); username=$ui.username.Text; password=$ui.password.Text
        tenantId=$ui.tenant.Text.Trim(); termbaseId=$ui.termbase.Text.Trim(); termbaseName=$ui.termbaseName.Text.Trim() }
    $oldEncoding=$OutputEncoding
    $oldSystemCa=$env:NODE_USE_SYSTEM_CA
    try {
        $OutputEncoding=New-Object Text.UTF8Encoding($false)
        $env:NODE_USE_SYSTEM_CA='1'
        $result=($request | ConvertTo-Json -Compress) | & (Join-Path $PSScriptRoot 'tools\node.exe') (Join-Path $PSScriptRoot 'application\scripts\check-filemaker-setup.js') 2>$null
        if ($LASTEXITCODE -ne 0) { throw 'FILEMAKER_CHECK_FAILED' }
        $check=($result -join "`n") | ConvertFrom-Json
        if (-not $check.ok) { throw 'FILEMAKER_CHECK_FAILED' }
        $state.fileMakerChecked=$true
    } finally { $OutputEncoding=$oldEncoding; $env:NODE_USE_SYSTEM_CA=$oldSystemCa; $request=$null }
}
$back.Add_Click({ $state.page--; $status.Text=''; Show-Page })
$next.Add_Click({
    $next.Enabled=$false; $back.Enabled=$false; $status.Text='Bitte warten ...'; [Windows.Forms.Application]::DoEvents()
    $temporary=$null
    try {
        switch ($state.page) {
            1 {
                if ([Environment]::OSVersion.Version.Build -lt 17763) { throw 'SERVER_VERSION' }
                Import-Module WebAdministration
                $modules=@(Get-WebGlobalModule | Select-Object -ExpandProperty Name)
                if ($modules -notcontains 'RewriteModule' -or $modules -notcontains 'ApplicationRequestRouting') { throw 'IIS_MODULES' }
                $serverResult.Text='Windows und IIS-Grundvoraussetzungen erkannt. Die gewaehlten Ziele, DNS, Ports, Zertifikat und FileMaker-Site werden vor dem Installieren erneut geprueft.'
            }
            2 { $state.settings=Read-Settings }
            3 {
                $state.settings=Read-Settings
                Check-FileMaker
                $temporary=Join-Path ([IO.Path]::GetTempPath()) ('stage-setup-'+[Guid]::NewGuid().ToString('N')+'.json')
                $state.settings | ConvertTo-Json | Set-Content $temporary -Encoding UTF8
                $argsForInstaller=@{ SettingsFile=$temporary; LocalTest=[bool]$ui.local.Checked }
                if($ui.local.Checked){$argsForInstaller.LocalTestHttpsPort=[int]$ui.httpsPort.Text}
                $check=& (Join-Path $PSScriptRoot 'install-flashterm-stage.ps1') @argsForInstaller
                $review.Text="Neuinstallation: $($state.settings.instanceId)`r`nAdresse: $($state.settings.hostName)`r`nIP: $($state.settings.bindingIpAddress)`r`nAnwendung: $($state.settings.applicationRoot)`r`nDaten: $($state.settings.dataDirectory)`r`nFileMaker: $($ui.database.Text)`r`n`r`nVorpruefung erfolgreich. Erst Installieren legt Dienst und Webzugang an.`r`n`r`nFileMaker-Zuordnung und erste vollstaendige Veroeffentlichung bleiben bis zu ihrem Nachweis offen."
                $state.report.preflight=$check
            }
            4 {
                $temporary=Join-Path ([IO.Path]::GetTempPath()) ('stage-setup-'+[Guid]::NewGuid().ToString('N')+'.json')
                $state.settings | ConvertTo-Json | Set-Content $temporary -Encoding UTF8
                $argsForInstaller=@{ SettingsFile=$temporary; LocalTest=[bool]$ui.local.Checked; Apply=$true }
                if($ui.local.Checked){$argsForInstaller.LocalTestHttpsPort=[int]$ui.httpsPort.Text}
                $installed=@(& (Join-Path $PSScriptRoot 'install-flashterm-stage.ps1') @argsForInstaller | Where-Object { $_ -and $_.Mode -eq 'Installed' })
                if($installed.Count -ne 1){throw 'INSTALL_RESULT'}
                $state.installed=$true; $state.report.installation=$installed[0]; $state.report.origin=$installed[0].PublicOrigin
                $state.report.fileMakerPairing='Pending'; $state.report.publication='NotTested'
                $state.report.status='InstalledSetupIncomplete'
                $state.report | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $state.settings.programDataDirectory 'setup-state.json') -Encoding UTF8
                if(-not $ui.skipFileMaker.Checked){
                    $secure=ConvertTo-SecureString $ui.password.Text -AsPlainText -Force
                    $credential=New-Object Management.Automation.PSCredential($ui.username.Text,$secure)
                    $project=Join-Path $state.settings.applicationRoot 'current'
                    $state.report.fileMaker=& (Join-Path $project 'deploy\windows\configure-auto-publication.ps1') -SettingsFile (Join-Path $state.settings.programDataDirectory 'service.env') -ServiceName ('flashterm-stage-'+$state.settings.instanceId) -ProjectRoot $project -NodeExecutable (Join-Path $state.settings.applicationRoot 'runtime\node.exe') -FileMakerServer $ui.fmServer.Text -Database $ui.database.Text -TermbaseName $ui.termbaseName.Text -Credential $credential -Apply
                    $credential=$null; $secure=$null
                }
                $ui.password.Clear()
                $state.report | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $state.settings.programDataDirectory 'setup-state.json') -Encoding UTF8
                $progress.Text="STAGE-Dienst und HTTPS sind erreichbar.`r`n`r`nNaechster betreuter Schritt: FileMaker-Datei sicher zuordnen und eine vollstaendige Veroeffentlichung pruefen. Die technischen Schluessel bleiben in geschuetzten Einstellungen."
            }
            5 { $finish.Text="STAGE wurde installiert; die Einrichtung ist noch unvollstaendig.`r`n`r`nAdresse: $($state.report.origin)`r`n`r`nOffen: FileMaker-Zuordnung, Veroeffentlichung und gegebenenfalls separater Clienttest. Der Bericht unterscheidet diese Punkte vom erfolgreichen Serverstart." }
            6 { $form.Close(); return }
        }
        $state.page++; $status.Text=''; Show-Page
    } catch {
        $status.Text=$(if($state.installed){'STAGE ist installiert, Einrichtung noch offen. Bericht in ProgramData gesichert.'}else{'Pruefung fehlgeschlagen. Angaben, freie Ziele, FileMaker-Leserechte und Zertifikat pruefen.'})
        if($state.installed){$state.page=5; $progress.Text=$status.Text; Show-Page}
    } finally {
        if($temporary -and (Test-Path $temporary)){Remove-Item -LiteralPath $temporary -Force}
        $next.Enabled=$true; $back.Enabled=($state.page -gt 0 -and -not $state.installed)
    }
})
$form.Add_FormClosing({ $ui.password.Clear() })
try { Show-Page; [void]$form.ShowDialog() } finally { $form.Dispose() }
