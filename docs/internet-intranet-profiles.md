# Internet- und Intranet-Betriebsprofile

Stand: 30. August 2026

## Entscheidung

flashterm stage bleibt eine Anwendung mit einer gemeinsamen Codebasis. Internet und Intranet werden im ersten Schritt als zwei getrennte Betriebsinstanzen derselben Release-Version umgesetzt.

Das Intranetprofil führt noch keine Windows- oder Active-Directory-Anmeldung ein. Beide Profile verwenden zunächst OpenID Connect. Für das Intranet wird eine eigene OIDC-Anwendung mit eigener Callback-Adresse registriert.

Zurückgestellt sind:

- Integrated Windows Authentication,
- automatische Übernahme von AD-Gruppen,
- Betrieb ohne erreichbaren OIDC-Anbieter,
- eine gemeinsame Laufzeitinstanz mit gemischten internen und externen Beständen.

Diese Abgrenzung hält den ersten Intranetbetrieb überschaubar und verhindert Sonderlogik in der Oberfläche.

## Sicherheitsgrenze

Ein interner DNS-Name macht eine Anwendung noch nicht zu einer Intranetanwendung. Die Intranetgrenze muss durch mindestens eine tatsächlich kontrollierte Netzgrenze erzwungen werden:

- IIS-Binding auf einer ausschließlich intern erreichbaren IP-Adresse,
- Zugriff nur über ein VPN oder einen privaten Reverse Proxy,
- vorgeschaltete Firewallregeln für festgelegte interne Netze,
- ergänzend IIS-IP-Beschränkungen nach dem betrieblichen Netzkonzept.

Ein Hostname-Binding auf `*:443` desselben öffentlich erreichbaren Servers reicht nicht als Trennung aus. Externe Clients könnten die öffentliche IP weiterhin mit einem selbst gesetzten Hostnamen ansprechen. Interner DNS und TLS-Zertifikat sind notwendig, aber keine alleinige Zugriffskontrolle.

`FLASHTERM_STAGE_PUBLIC_ORIGIN` bezeichnet auch beim Intranetprofil die für Benutzer sichtbare HTTPS-Origin. Der Variablenname sagt nichts über die Erreichbarkeit aus.

## Trennungsmodell

| Bestandteil | Internetprofil | Intranetprofil |
|---|---|---|
| Anwendungscode | gemeinsames geprüftes Release | dasselbe geprüfte Release |
| Node-Dienst | eigene Service-ID und eigener Loopback-Port | eigene Service-ID und eigener Loopback-Port |
| IIS | eigene Site und HTTPS-Binding | eigene Site auf interner Netzgrenze |
| Konfiguration | eigene geschützte `service.env` | eigene geschützte `service.env` |
| Daten | eigenes Datenverzeichnis | eigenes Datenverzeichnis |
| Anmeldung | eigene OIDC-Anwendung | eigene OIDC-Anwendung |
| Berechtigungen | externe Pilotrollen | interne Rollen, zunächst weiterhin als OIDC-Claims |
| Publisher | eigenes Ziel und Token | eigenes Ziel und Token |
| Backup/Rollback | eigener Sicherungs- und Aktivierungsstand | eigener Sicherungs- und Aktivierungsstand |

Die beiden Instanzen dürfen weder `service.env`, Datenverzeichnis, Veröffentlichungstoken noch OIDC-Client miteinander teilen. Ein Release-Verzeichnis darf gemeinsam gelesen werden, solange Updates beide Dienste kontrolliert stoppen, prüfen und bei Bedarf zurückrollen.

## Empfohlene erste Belegung

Die konkreten Hostnamen und internen Netzbereiche werden erst bei der Installation festgelegt. Als neutrales Schema gelten:

| Eigenschaft | Internet | Intranet |
|---|---|---|
| Instanz-ID | `internet` | `intranet` |
| Dienst | `flashterm-stage-internet` | `flashterm-stage-intranet` |
| Node-Port | `8100` | `8200` |
| ProgramData | `C:\ProgramData\flashterm-stage-internet` | `C:\ProgramData\flashterm-stage-intranet` |
| Daten | `D:\flashterm-stage-internet\data` | `D:\flashterm-stage-intranet\data` |
| IIS-Proxy | `C:\inetpub\flashterm-stage-internet-proxy` | `C:\inetpub\flashterm-stage-intranet-proxy` |

Die bestehende Pilotinstallation muss nicht allein wegen der neuen Namenskonvention umbenannt werden. Das Schema gilt für neue, getrennte Installationen; eine Migration des laufenden Internetpiloten wäre ein eigenes, kontrolliertes Arbeitspaket.

## Instanzdateien erzeugen

Der Generator [`create-windows-instance-files.js`](../scripts/create-windows-instance-files.js) erzeugt ohne Secrets:

- eine instanzspezifische `service.env.example`,
- eine WinSW-Dienstdefinition mit eindeutiger Service-ID,
- eine IIS-Proxykonfiguration für den gewählten Loopback-Port.

Beispiel für das Intranetprofil auf dem Windows Server:

```powershell
Set-Location "C:\Apps\flashterm-stage\current"
npm run windows:instance -- `
  --instance intranet `
  --port 8200 `
  --origin https://flashterm.intern.example.org `
  --output C:\Temp\flashterm-stage-instance-files `
  --tenant INTRANET-TENANT `
  --termbase INTERNAL-TERMBASE
```

Der Beispielhostname wird durch einen freigegebenen Namen unter einer eigenen Domain ersetzt. `.local` soll nicht als willkürliche interne Endung verwendet werden.

Der Generator überschreibt kein vorhandenes Instanzverzeichnis. Seine Ausgabe bleibt eine Vorlage: Secrets werden erst in der geschützten Kopie am ausgegebenen `Protected settings target` ergänzt. Die WinSW-Programmdatei wird unter dem ausgegebenen `Wrapper base name` bereitgestellt, damit XML- und EXE-Basisname übereinstimmen.

Die IIS-Site und ihre Bindings werden bewusst nicht automatisch angelegt. Vor dieser Änderung müssen interne IP-Adresse, Zertifikat, DNS, Firewall und Überschneidungen mit vorhandenen Sites betrieblich geprüft werden.

## Authentifizierung im ersten Intranetprofil

Für das Intranet wird im vorhandenen OIDC-Anbieter eine zweite Anwendung registriert:

```text
https://<interner-host>/auth/callback
```

Die Benutzerbrowser und der Windows-Server benötigen ausgehend Zugriff auf den OIDC-Anbieter. Falls das interne Netz diesen Zugriff nicht erlaubt, ist dieses einfache Profil nicht ausreichend; dann wird ein interner OIDC-Anbieter oder Windows-SSO zu einem eigenen Folgeprojekt.

Eine eigene Anwendung verhindert insbesondere:

- vermischte Callback-Adressen,
- versehentliche Freigabe interner Rollen an die Internetinstanz,
- gemeinsames Rotieren eines Client-Secrets,
- unklare Abmeldung und Sitzungszuordnung.

## Veröffentlichung

Backstage veröffentlicht bewusst an genau eine Zielinstanz. Für Internet und Intranet werden getrennte Ziel-Origin, Veröffentlichungstoken, Tenant- und Termbase-ID verwendet.

Interne Inhalte dürfen nicht zunächst an die Internetinstanz übertragen und dort lediglich inaktiv gehalten werden. Eine inaktive Publication ist fachlich unsichtbar, befindet sich aber bereits im Speicher der Instanz. Die Zielauswahl muss deshalb vor der Übertragung erfolgen.

FileMaker bleibt in beiden Profilen ausschließlich Quelle des serverseitigen Publishers. Der Browser greift weder im Internet noch im Intranet direkt auf FileMaker zu.

## Abnahme des Intranetprofils

Vor der ersten internen Freigabe werden mindestens geprüft:

1. Der interne Host ist aus einem freigegebenen internen Netz erreichbar.
2. Derselbe Host ist aus einem externen Testnetz auch mit manuell gesetztem DNS beziehungsweise Hostnamen nicht erreichbar.
3. Der Internetpilot funktioniert unverändert weiter.
4. Beide Dienste besitzen unterschiedliche Service-IDs, Ports, Konfigurations- und Datenverzeichnisse.
5. Die interne Callback-Adresse gehört ausschließlich zur internen OIDC-Anwendung.
6. Eine Internetrolle erhält keinen Zugriff auf interne Termbases und umgekehrt.
7. Ein interner Testbestand wird nur im Intranetprofil veröffentlicht und aktiviert.
8. Backup, Code-Rollback und Publication-Rollback werden für die Instanz getrennt nachgewiesen.
9. Direkte Asset-Aufrufe sind ohne passende Intranetsitzung nicht möglich.
10. Server- und Browserzugriff auf den OIDC-Anbieter sowie benötigte Browser-CDNs sind betrieblich geklärt.

## Spätere Ausbaustufe

Windows-Single-Sign-on wird erst betrachtet, wenn das netzseitig getrennte Intranetprofil praktisch funktioniert. Dann wird separat entschieden, ob IIS Windows Authentication, AD FS, ein interner OIDC-Anbieter oder eine andere Unternehmensidentität die geeignete Grenze bildet. Die Stage-API und das Publication-Modell sollen dafür unverändert bleiben.
