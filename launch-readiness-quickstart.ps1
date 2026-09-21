#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

if (-not (Test-Path (Join-Path $PSScriptRoot 'package.json'))) {
  throw 'Run this script from the ChodhiQ workspace root.'
}

Push-Location $PSScriptRoot
try {
  Write-Host 'Checking launch configuration...' -ForegroundColor Cyan
  & npm.cmd run launch:config
  if ($LASTEXITCODE -ne 0) {
    throw 'Complete the reported .env.local values before creating production builds.'
  }

  Write-Host 'Verifying customer, business and admin products...' -ForegroundColor Cyan
  & npm.cmd run verify:all
  if ($LASTEXITCODE -ne 0) { throw 'Local release verification failed.' }

  Write-Host 'Local code is launch-ready.' -ForegroundColor Green
  Write-Host 'Remaining external gates: staging migrations/RLS, authenticated E2E, load test, signed device builds, legal and operations approval.'
}
finally {
  Pop-Location
}
