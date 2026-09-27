flashterm stage - Intranet customer installer

First native setup assistant (supervised testing):
Run .\setup-stage.ps1 in an elevated Windows PowerShell 5.1 from this bundle.
The assistant supports trusted-intranet and an isolated server-only test,
selects an existing certificate, validates free targets and installs STAGE.
FileMaker pairing and the first complete publication are still separate,
supervised steps. InstalledSetupIncomplete is not a customer acceptance.
No code-signing certificate is currently available or confirmed.
For OIDC or the explicit command-line workflow use the steps below.

1. Read this file completely before running the installer.
2. Copy customer-settings.example.json to customer-settings.json.
3. Replace every placeholder with customer-approved non-secret values.
4. Choose accessMode explicitly:
   - trusted-intranet: every client that can reach the intranet host may read
     every published termbase. Set trustedIntranetConfirmed to true only after
     the firewall, routing or private proxy boundary has been verified.
   - oidc: complete readerGroup and all oidc* settings, then register the exact
     callback https://<host>/auth/callback.
5. Have the administrator provide the TLS certificate in LocalMachine\My
   with its private key. Select an existing certificate with:
   .\select-stage-certificate.ps1 -HostName <hostName> -Select
   Copy the returned Thumbprint into customer-settings.json. This checks the
   name, validity, private key, server usage, trust and online revocation.
6. Run the preflight in an elevated Windows PowerShell 5.1:

   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install-flashterm-stage.ps1

7. Only after a successful preflight, apply the installation. trusted-intranet
   does not request an OIDC secret; oidc requests it securely:

   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install-flashterm-stage.ps1 -Apply

The installer never changes DNS, Windows Firewall, certificate enrollment,
ARR server settings, or the existing FileMaker IIS site. It uses the bundled
private Node.js runtime and never uses FileMaker Server's internal node.exe.

Server-only rehearsal (not customer network acceptance):
Use a fresh instance, separate directories, a free Node port and binding IP
127.0.0.1. The DNS name must resolve exclusively to loopback addresses.
Keep trustedIntranetConfirmed false; pass -LocalTest to preflight AND apply.
The HTTPS test port defaults to 18446; override with -LocalTestHttpsPort.
This does not make a public server an intranet and does not change firewall,
DNS or certificate trust. A separate client/VPN test is still required later.
