[CmdletBinding()]
param(
    [string] $Origin = "http://127.0.0.1:8100"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$healthUri = "{0}/api/health" -f $Origin.TrimEnd("/")
$response = Invoke-RestMethod -Method Get -Uri $healthUri -TimeoutSec 10
if ($response.status -ne "ok") {
    throw "flashterm stage returned an unexpected health status."
}

Write-Output "flashterm stage health check succeeded."
