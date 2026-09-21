$ErrorActionPreference = 'Stop'

$workspace = Split-Path -Parent $PSScriptRoot
$projects = @(
  @{ Name = 'Customer app'; Path = $workspace; Command = 'verify:release' },
  @{ Name = 'Admin dashboard'; Path = Join-Path $workspace 'admin-dashboard'; Command = 'verify' },
  @{ Name = 'Business dashboard'; Path = Join-Path $workspace 'business-dashboard'; Command = 'verify' },
  @{ Name = 'Coming-soon site'; Path = Join-Path $workspace 'coming-soon'; Command = 'verify' }
)

foreach ($project in $projects) {
  Write-Host "`n== $($project.Name) ==" -ForegroundColor Cyan
  Push-Location $project.Path
  try {
    & npm.cmd run $project.Command
    if ($LASTEXITCODE -ne 0) { throw "$($project.Name) verification failed." }
  }
  finally {
    Pop-Location
  }
}

Write-Host "`nAll four ChodhiQ products passed verification." -ForegroundColor Green
