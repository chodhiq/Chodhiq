$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\Users\ASUS\Documents\Codex\chodhiq'
$workspaceRoot = (Resolve-Path -LiteralPath '.').Path
$buildStatus = Get-Content -LiteralPath 'artifacts/email-confirmation-build-status.json' -Raw | ConvertFrom-Json
if ($buildStatus.id -ne 'ec6d6f4f-692c-4487-9fab-421cad36c12e' -or $buildStatus.status -ne 'FINISHED') {
  throw 'The expected email-confirmation build has not finished.'
}
if ($buildStatus.appVersion -ne '1.0.0' -or $buildStatus.appBuildVersion -ne '24') {
  throw 'Unexpected build version.'
}
$apkUrl = $buildStatus.artifacts.applicationArchiveUrl
if (!$apkUrl) { $apkUrl = $buildStatus.artifacts.buildUrl }
$downloadUri = [Uri]$apkUrl
if ($downloadUri.Scheme -ne 'https' -or $downloadUri.Host -ne 'expo.dev' -or !$downloadUri.AbsolutePath.StartsWith('/artifacts/eas/')) {
  throw 'Unexpected Expo artifact download destination.'
}
$sourceRecord = Get-Content -LiteralPath 'artifacts/email-confirmation-build-source.json' -Raw | ConvertFrom-Json
foreach ($sourceFile in $sourceRecord.files) {
  $sourcePath = (Resolve-Path -LiteralPath $sourceFile.path).Path
  if (!$sourcePath.StartsWith($workspaceRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Recorded source path is outside this workspace.'
  }
  if ((Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLower() -ne $sourceFile.sha256) {
    throw ('Source changed after upload: ' + $sourceFile.path)
  }
}
$apkPath = 'outputs/ChodhiQ-1.0.0-email-confirmation-v24.apk'
Invoke-WebRequest -Uri $downloadUri -OutFile $apkPath -UseBasicParsing
$signature = & 'C:/Users/ASUS/AppData/Local/Android/Sdk/build-tools/36.0.0/apksigner.bat' verify --print-certs $apkPath 2>&1
$signature | Set-Content -LiteralPath 'artifacts/email-confirmation-apk-signature.txt'
if ($LASTEXITCODE -ne 0 -or ($signature -join "`n") -notmatch 'ff6e67bc38d2394f9587919770499a8ffb4d23b0aa354544d9ccd76813b3baa2') {
  throw 'APK signature verification failed or differs from the established release certificate.'
}
$badging = & 'C:/Users/ASUS/AppData/Local/Android/Sdk/build-tools/36.0.0/aapt.exe' dump badging $apkPath 2>&1
$badging | Set-Content -LiteralPath 'artifacts/email-confirmation-apk-manifest.txt'
$badgingText = $badging -join "`n"
if ($LASTEXITCODE -ne 0 -or $badgingText -notmatch "package: name='com.chodhiq.app' versionCode='24' versionName='1.0.0'" -or $badgingText -match 'application-debuggable') {
  throw 'Unexpected APK package, version, or debug flag.'
}
$manifest = & 'C:/Users/ASUS/AppData/Local/Android/Sdk/build-tools/36.0.0/aapt.exe' dump xmltree $apkPath AndroidManifest.xml 2>&1
if ($LASTEXITCODE -ne 0 -or ($manifest -join "`n") -notmatch 'android:scheme[^\r\n]*"chodhiq"') {
  throw 'The APK does not register the ChodhiQ callback scheme.'
}
$hash = (Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash.ToLower()
$size = (Get-Item -LiteralPath $apkPath).Length
@{
  buildId = $buildStatus.id
  apkPath = $apkPath
  downloadUrl = $apkUrl
  sha256 = $hash
  sizeBytes = $size
  package = 'com.chodhiq.app'
  versionCode = 24
  checks = @('signature matches established release', 'non-debuggable', 'chodhiq scheme registered', 'uploaded source hashes match')
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath 'artifacts/email-confirmation-apk-verification.json'
Write-Output "Verified APK: $apkPath"
Write-Output "SHA-256: $hash"
Write-Output "Download: $apkUrl"
