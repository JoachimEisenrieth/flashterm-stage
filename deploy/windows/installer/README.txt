flashterm stage - Intranet customer installer

1. Read this file completely before running the installer.
2. Copy customer-settings.example.json to customer-settings.json.
3. Replace every placeholder with customer-approved non-secret values.
4. Choose accessMode explicitly:
   - trusted-intranet: every client that can reach the intranet host may read
     every published termbase. Set trustedIntranetConfirmed to true only after
     the firewall, routing or private proxy boundary has been verified.
   - oidc: complete readerGroup and all oidc* settings, then register the exact
     callback https://<host>/auth/callback.
5. Install the TLS certificate in LocalMachine\My with its private key.
6. Run the preflight in an elevated Windows PowerShell 5.1:

   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install-flashterm-stage.ps1

7. Only after a successful preflight, apply the installation. trusted-intranet
   does not request an OIDC secret; oidc requests it securely:

   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install-flashterm-stage.ps1 -Apply

The installer never changes DNS, Windows Firewall, certificate enrollment,
ARR server settings, or the existing FileMaker IIS site. It uses the bundled
private Node.js runtime and never uses FileMaker Server's internal node.exe.
