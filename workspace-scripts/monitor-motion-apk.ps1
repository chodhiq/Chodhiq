$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\Users\ASUS\Documents\Codex\chodhiq'
$easCli = 'C:/Users/ASUS/AppData/Local/npm-cache/_npx/e25a38a8cc65d08e/node_modules/eas-cli/bin/run'
$buildId = '2ed827ed-cffb-4366-aa1d-ef7f3cd097a7'
$apkPath = 'outputs/ChodhiQ-1.0.0-alignment-motion-v20.apk'
$logPath = 'outputs/motion-build-monitor.log'
$deadline = (Get-Date).AddHours(3)
while ((Get-Date) -lt $deadline) {
  try {
    $ErrorActionPreference = 'Continue'
    $json = & node $easCli build:view $buildId --json 2>> $logPath
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -ne 0) { throw 'Expo status request failed.' }
    $build = ($json -join "`n") | ConvertFrom-Json
    ($json -join "`n") | Set-Content artifacts/motion-build-status.json
    "$(Get-Date -Format o) $($build.status)" | Add-Content $logPath
    if ($build.status -in @('ERRORED', 'CANCELED')) {
      "`nBuild ended with status $($build.status). See the Expo build page for details." | Add-Content project-docs/MOTION_APK_BUILD_2026-10-03.md
      exit 1
    }
    if ($build.status -eq 'FINISHED') {
      $apkUrl = $build.artifacts.applicationArchiveUrl
      if (!$apkUrl) { $apkUrl = $build.artifacts.buildUrl }
      if (!$apkUrl) { throw 'Finished build has no APK URL.' }
      Invoke-WebRequest -Uri $apkUrl -OutFile $apkPath -UseBasicParsing
      $signature = & 'C:/Users/ASUS/AppData/Local/Android/Sdk/build-tools/36.0.0/apksigner.bat' verify --print-certs $apkPath 2>&1
      $signature | Set-Content artifacts/motion-apk-signature.txt
      if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
      if (!(($signature -join "`n") -match 'ff6e67bc38d2394f9587919770499a8ffb4d23b0aa354544d9ccd76813b3baa2')) { throw 'APK signing certificate differs from version 19.' }
      $manifest = & 'C:/Users/ASUS/AppData/Local/Android/Sdk/build-tools/36.0.0/aapt.exe' dump badging $apkPath 2>&1
      $manifest | Set-Content artifacts/motion-apk-manifest.txt
      if ($LASTEXITCODE -ne 0) { throw 'APK manifest verification failed.' }
      $manifestText = $manifest -join "`n"
      if ($manifestText -notmatch "package: name='com.chodhiq.app' versionCode='20' versionName='1.0.0'" -or $manifestText -match 'application-debuggable') { throw 'Unexpected APK package/version/debuggable flag.' }
      $hash = (Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash.ToLower()
      $size = (Get-Item -LiteralPath $apkPath).Length
      $sourceRecord = Get-Content artifacts/motion-build-source.json -Raw | ConvertFrom-Json
      foreach ($file in $sourceRecord.files) {
        if ((Get-FileHash -LiteralPath $file.path -Algorithm SHA256).Hash.ToLower() -ne $file.sha256) { throw "Source changed after upload: $($file.path)" }
      }
      @"

Build completed successfully. Download: $apkUrl
Local APK: $apkPath
SHA-256: $hash
Size: $size bytes.
Verified: package com.chodhiq.app, version 1.0.0/code 20, non-debuggable; signature valid and certificate matches version 19; recorded source files still match upload hashes.
Phone runtime testing remains pending.
"@ | Add-Content project-docs/MOTION_APK_BUILD_2026-10-03.md
      "$(Get-Date -Format o) APK downloaded and verified: $apkPath" | Add-Content $logPath
      exit 0
    }
  } catch {
    "$(Get-Date -Format o) $($_.Exception.Message)" | Add-Content $logPath
  }
  Start-Sleep -Seconds 45
}
'Background monitor reached its time limit. Check the Expo build page.' | Add-Content $logPath
exit 2

