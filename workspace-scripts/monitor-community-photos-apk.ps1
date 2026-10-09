$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\Users\ASUS\Documents\Codex\chodhiq'
$easCli = 'C:/Users/ASUS/AppData/Local/npm-cache/_npx/e25a38a8cc65d08e/node_modules/eas-cli/bin/run'
$buildId = 'cc3602d8-f690-4f92-a260-0c13db72cbed'
$apkPath = 'outputs/ChodhiQ-1.0.0-community-photos-v23.apk'
$deadline = (Get-Date).AddHours(3)
while ((Get-Date) -lt $deadline) {
  $ErrorActionPreference = 'Continue'
  $json = & node $easCli build:view $buildId --json 2>> outputs/community-photos-build-monitor.log
  $ErrorActionPreference = 'Stop'
  if ($LASTEXITCODE -ne 0) { throw 'Expo status request failed.' }
  $build = ($json -join "`n") | ConvertFrom-Json
  ($json -join "`n") | Set-Content -Encoding UTF8 artifacts/community-photos-build-status.json
  Write-Output "$(Get-Date -Format o) APK build: $($build.status)"
  if ($build.status -in @('ERRORED', 'CANCELED')) { throw "APK build ended: $($build.status)" }
  if ($build.status -eq 'FINISHED') {
    $apkUrl = $build.artifacts.applicationArchiveUrl
    if (!$apkUrl) { $apkUrl = $build.artifacts.buildUrl }
    if (!$apkUrl) { throw 'Finished build has no APK URL.' }
    Invoke-WebRequest -Uri $apkUrl -OutFile $apkPath -UseBasicParsing
    $signature = & 'C:/Users/ASUS/AppData/Local/Android/Sdk/build-tools/36.0.0/apksigner.bat' verify --print-certs $apkPath 2>&1
    $signature | Set-Content artifacts/community-photos-apk-signature.txt
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
    if (!(($signature -join "`n") -match 'ff6e67bc38d2394f9587919770499a8ffb4d23b0aa354544d9ccd76813b3baa2')) { throw 'APK signing certificate differs from previous release.' }
    $manifest = & 'C:/Users/ASUS/AppData/Local/Android/Sdk/build-tools/36.0.0/aapt.exe' dump badging $apkPath 2>&1
    $manifest | Set-Content artifacts/community-photos-apk-manifest.txt
    if ($LASTEXITCODE -ne 0) { throw 'APK manifest verification failed.' }
    $manifestText = $manifest -join "`n"
    if ($manifestText -notmatch "package: name='com.chodhiq.app' versionCode='23' versionName='1.0.0'" -or $manifestText -match 'application-debuggable') { throw 'Unexpected APK package/version/debuggable flag.' }
    $sourceRecord = Get-Content artifacts/community-photos-build-source.json -Raw | ConvertFrom-Json
    foreach ($file in $sourceRecord.files) {
      if ((Get-FileHash -LiteralPath $file.path -Algorithm SHA256).Hash.ToLower() -ne $file.sha256) { throw "Source changed after upload: $($file.path)" }
    }
    $hash = (Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash.ToLower()
    $size = (Get-Item -LiteralPath $apkPath).Length
    @"

APK completed: $apkUrl
Local APK: $apkPath
SHA-256: $hash
Size: $size bytes.
Verified package com.chodhiq.app, version 1.0.0/code 23, non-debuggable, valid signature matching the previous release, and source hashes unchanged since upload.
Phone runtime testing remains pending.
"@ | Add-Content project-docs/COMMUNITY_NOTIFICATIONS_AND_PHOTOS_2026-10-03.md
    Write-Output "Verified APK: $apkPath ($hash)"
    exit 0
  }
  Start-Sleep -Seconds 30
}
throw 'APK build did not finish within three hours.'
