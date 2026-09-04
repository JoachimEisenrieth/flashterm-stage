# Windows-Kundeninstaller für die Intranetversion

Stand: 30. August 2026

## Ziel

Kunden installieren flashterm stage auf einem eigenen Windows Server in ihrem Intranet. Auf demselben Server ist bereits FileMaker Server mit seiner IIS-Site installiert.

Der erste Installer wird als geprüftes ZIP-Paket mit einem PowerShell-Installer ausgeliefert. Ein MSI ist für diesen Schritt nicht erforderlich: Der PowerShell-Installer kann die vorhandene IIS- und FileMaker-Umgebung vor Änderungen detailliert prüfen, bricht standardmäßig nach dem Preflight ab und installiert erst mit dem ausdrücklichen Schalter `-Apply`.

Der Installer ist für eine frische Intranetinstallation vorgesehen. Upgrade und Deinstallation werden später als getrennte, zustandsbewusste Abläufe ergänzt.

## Feste Koexistenzregeln mit FileMaker Server

Der Installer:

- verwendet niemals die von FileMaker Server intern mitgelieferte `node.exe`,
- installiert keine globale Node.js-Version und verändert den System-`PATH` nicht,
- liefert eine separat geprüfte private Node.js-Laufzeit für flashterm stage mit,
- stoppt oder startet `FMWebSite` nicht,
- führt kein `iisreset` aus,
- verändert keine FileMaker-IIS-Bindings, Zertifikate oder Anwendungspools,
- aktiviert oder verändert ARR nicht automatisch,
- verwendet eine eigene IIS-Site, einen eigenen Anwendungspool, eine eigene Service-ID und einen eigenen Loopback-Port,
- vergleicht Zustand und Bindings der FileMaker-Site vor und nach der Installation.

Wenn FileMaker-Site oder Bindings während der Installation abweichen, gilt die Installation als fehlgeschlagen und die neu angelegten flashterm-Ressourcen werden zurückgerollt.

Der Standardname `FMWebSite` ist in der Kundeneinstellung konfigurierbar, falls eine freigegebene FileMaker-Installation einen anderen IIS-Sitenamen besitzt.

## Paketstruktur

Ein erzeugtes Kundenpaket enthält ausschließlich den erforderlichen Runtime-Umfang:

```text
flashterm-stage-intranet-<release>/
  application/                         geprüfte Stage-Runtime
  tools/
    node.exe                           private Node.js-Laufzeit
    WinSW-x64.exe                      Service-Wrapper
  install-flashterm-stage.ps1
  customer-settings.example.json
  README.txt
  manifest.json                        SHA-256 jedes ausgelieferten Paketinhalts
```

Nicht enthalten sind:

- `config.js`,
- FileMaker-Zugangsdaten,
- OIDC-Client-Secret,
- Veröffentlichungstoken,
- Tests und Fixtures,
- Entwicklungs- und Publisher-Skripte,
- Repository-Dokumentation,
- lokale Outputs oder Stage-Daten.

Das Manifest schützt gegen eine unbeabsichtigte Veränderung innerhalb des Pakets, ersetzt aber keine vertrauenswürdige Distribution. Das fertige ZIP erhält zusätzlich eine separat veröffentlichte SHA-256-Prüfsumme; für eine breitere Auslieferung sollen ZIP beziehungsweise PowerShell-Skript außerdem signiert werden.

## Paket beim Hersteller erzeugen

Vor dem Paketbau werden die freigegebenen Windows-x64-Dateien von Node.js und WinSW aus ihren offiziellen Quellen bezogen. Beide vollständigen SHA-256-Prüfsummen werden unabhängig bestätigt.

```text
npm run windows:customer-bundle -- \
  --source <repository-checkout> \
  --output <release-output> \
  --release <release-id> \
  --winsw <approved-WinSW-x64.exe> \
  --winsw-sha256 <approved-sha256> \
  --node <approved-node.exe> \
  --node-sha256 <approved-sha256>
```

Der Paketgenerator:

1. akzeptiert nur plausible Windows-Programme mit exakt passender Prüfsumme,
2. kopiert Runtime-Dateien über eine feste Allowlist,
3. nimmt weder den Backstage-Publisher noch lokale Konfigurationen auf,
4. berechnet Größe und SHA-256 aller Paketdateien,
5. überschreibt kein vorhandenes Releaseverzeichnis.

Das erzeugte Verzeichnis wird anschließend ohne inhaltliche Änderung als ZIP archiviert. ZIP-Prüfsumme, Release-ID, Node-Version und WinSW-Version werden im Releaseprotokoll festgehalten.

## Voraussetzungen beim Kunden

Vor dem Preflight stellt der Kunde bereit:

- Windows Server 2019 Build 17763 oder neuer,
- Windows PowerShell 5.1 oder neuer,
- eine laufende FileMaker-IIS-Site,
- IIS URL Rewrite und Application Request Routing,
- bereits aktivierte ARR-Proxyfunktion,
- eine feste interne IPv4-Adresse des Servers,
- einen internen DNS-Host, der exakt auf diese Adresse auflöst,
- ein gültiges Zertifikat in `Cert:\LocalMachine\My` mit privatem Schlüssel und passendem DNS-Namen,
- bei `trusted-intranet` eine nachweislich kontrollierte private Netzgrenze,
- alternativ bei `oidc` eine eigene vertrauliche OIDC-Webanwendung und ausgehenden HTTPS-Zugriff zum OIDC-Anbieter.

Der Installer beschafft keine Zertifikate und verändert weder DNS noch Windows Firewall. Diese Grenzen bleiben beim Kundenbetrieb.

## Kundeneinstellungen

`customer-settings.example.json` wird als `customer-settings.json` kopiert und vollständig ausgefüllt. Die Datei enthält bewusst keine Secrets.

| Feld | Bedeutung |
|---|---|
| `instanceId` | stabile kurze ID, standardmäßig `intranet` |
| `hostName` | vollständiger interner DNS-Name |
| `bindingIpAddress` | lokale interne IPv4-Adresse für das IIS-Binding |
| `port` | freier Node-Loopback-Port, standardmäßig `8200` |
| `tenantId` | Stage-Mandant dieser Installation |
| `termbaseId` | zunächst freigegebener Terminologiebestand |
| `accessMode` | `trusted-intranet` oder `oidc` |
| `trustedIntranetConfirmed` | muss für `trusted-intranet` ausdrücklich `true` sein |
| `readerGroup` | nur bei `oidc`: Rolle oder Gruppe für diesen Bestand |
| `oidcIssuer` | nur bei `oidc`: exakter HTTPS-Issuer |
| `oidcClientId` | nur bei `oidc`: Client-ID der eigenen Intranet-Webanwendung |
| `oidcGroupClaim` | nur bei `oidc`: Claim mit Rollen beziehungsweise Gruppen |
| `certificateThumbprint` | Zertifikat im lokalen Computerspeicher |
| `fileMakerSiteName` | vorhandene FileMaker-IIS-Site |
| Verzeichnisse | getrennte lokale Ziele für Anwendung, Einstellungen, Daten und IIS-Proxy |

Im Standardmodus `trusted-intranet` gibt es keine Personenanmeldung. Jeder Client, der die Site über die bestätigte private Netzgrenze erreicht, darf alle dort veröffentlichten Termbases lesen. Der technische Publisher bleibt token­geschützt.

Das Beispiel verwendet ausschließlich Laufwerk `C:` und funktioniert deshalb auch auf einem Server ohne separates Datenlaufwerk. Der Kunde darf ein freigegebenes anderes lokales Laufwerk verwenden; alle vier Zielverzeichnisse müssen getrennt bleiben.

Nur bei `oidc` lautet die Callback-Adresse beim Anbieter exakt:

```text
https://<hostName>/auth/callback
```

## Preflight

In einer administrativen Windows-PowerShell im entpackten Paket:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\install-flashterm-stage.ps1"
```

Der Preflight verändert nichts und prüft:

- Paketmanifest und jede enthaltene SHA-256-Prüfsumme,
- Betriebssystem, PowerShell und administrative Rechte,
- private mitgelieferte Node.js-Laufzeit ab Version 20,
- IIS-, Rewrite- und ARR-Verfügbarkeit,
- aktive FileMaker-Site und vollständigen Binding-Snapshot,
- lokale Binding-IP und interne DNS-Auflösung,
- freien Loopback-Port,
- unbenutzte Zielverzeichnisse, Service-, Site- und Poolnamen,
- Zertifikat, privaten Schlüssel, Gültigkeit und Hostnamen,
- im Modus `trusted-intranet` die ausdrückliche Bestätigung der Netzgrenze,
- im Modus `oidc` OIDC-Discovery und exakte Issuer-Übereinstimmung.

Die Installation darf nur fortgesetzt werden, wenn `Mode : Preflight`, `BundleIntegrity : ok`, der erwartete FileMaker-Status und der beabsichtigte `AccessMode` ausgegeben werden. `OidcDiscovery` lautet bei `trusted-intranet` folgerichtig `not-required` und bei `oidc` `ok`.

## Installation

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\install-flashterm-stage.ps1" -Apply
```

Nur bei `oidc` wird das OIDC-Client-Secret verdeckt abgefragt. Bei `trusted-intranet` existiert kein OIDC-Secret. Secrets stehen weder in der JSON-Datei noch in der Konsolenausgabe.

Der Installer:

1. erzeugt eine zufällige technische Veröffentlichungsberechtigung,
2. kopiert Release und private Node.js-Laufzeit in getrennte Verzeichnisse,
3. erzeugt eine `current`-Junction auf das unveränderliche Release,
4. schreibt geschützte Service- und Publisher-Einstellungen,
5. setzt lokalisierungsunabhängige NTFS-Rechte über bekannte Windows-SIDs,
6. legt einen eigenen IIS-Anwendungspool und eine SNI-HTTPS-Site an,
7. installiert den WinSW-Dienst unter `NetworkService`,
8. startet nur die neue flashterm-Site und den neuen Dienst,
9. prüft Node- und HTTPS-Healthcheck,
10. bestätigt unveränderten Zustand und unveränderte Bindings der FileMaker-Site.

Das generierte `publisher.env` enthält das technische Veröffentlichungstoken und ist nur für Administratoren und `SYSTEM` lesbar. Der Token wird nicht angezeigt. Ein späterer Backstage-Publisher übernimmt die benötigten Werte über einen geschützten Betriebsweg.

Schlägt ein Apply-Schritt fehl, entfernt der Installer ausschließlich Ressourcen, die er in diesem frischen Lauf selbst angelegt hat. FileMaker-Ressourcen gehören nie zu diesem Rollback.

## Abnahme

Nach `Mode : Installed` folgen praktische Prüfungen:

1. FileMaker Admin Console und vorhandene FileMaker-Webabläufe funktionieren unverändert.
2. `FMWebSite` ist gestartet und besitzt exakt die vorherigen Bindings.
3. Der flashterm-Dienst läuft unter `NetworkService` mit der privaten Node.js-Datei außerhalb des FileMaker-Verzeichnisses.
4. Der Intranet-Host ist nur aus den freigegebenen internen Netzen erreichbar.
5. Bei `trusted-intranet` ist keine Anmeldung sichtbar und ein intern erreichbarer Browser erhält unmittelbar Lesezugriff.
6. Ein externer Testclient erreicht die Intranet-Site nicht; bei `oidc` werden stattdessen Rollen und Abmeldung geprüft.
7. Testveröffentlichung, Assets, Aktivierung und Publication-Rollback funktionieren.
8. Ein Serverneustart startet FileMaker und flashterm korrekt.
9. Backup und Restore der getrennten Stage-Daten werden nachgewiesen.

## Grenzen der ersten Version

- ausschließlich frische Installation,
- ein internes Host-Binding und eine initiale Termbase,
- `trusted-intranet` ohne Personenanmeldung oder alternativ ein vertraulicher OIDC-Webclient,
- keine automatische Firewall-, DNS-, Zertifikats- oder OIDC-Konfiguration,
- keine automatische Veröffentlichung aus dem lokalen FileMaker Server,
- noch kein Upgrade-, Repair- oder Uninstall-Modus,
- noch keine praktische Freigabe auf einer unabhängigen Kundeninstallation.

Vor der ersten Kundenauslieferung wird derselbe Paketstand deshalb auf einem separaten Windows Server mit FileMaker Server vollständig installiert, neu gestartet, veröffentlicht und wiederhergestellt.
