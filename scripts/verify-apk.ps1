param([string]$ApkPath, [string]$JavaHome, [string]$SdkRoot)
$ErrorActionPreference='Stop'
$projectDir=Split-Path $PSScriptRoot -Parent
$config=Get-Content -Raw (Join-Path $projectDir 'app-release.json') | ConvertFrom-Json
$signing=Get-Content -Raw (Join-Path $projectDir 'android-signing.json') | ConvertFrom-Json
if(-not $ApkPath){$ApkPath=Join-Path $projectDir 'android/app/build/outputs/apk/debug/app-debug.apk'}
$env:JAVA_HOME=$JavaHome
$buildTools=Join-Path $SdkRoot 'build-tools/36.0.0'
$signature=& (Join-Path $buildTools 'apksigner.bat') verify --verbose --print-certs $ApkPath
if($LASTEXITCODE -ne 0){throw 'APK signature verification failed.'}
$match=[regex]::Match(($signature -join "`n"),'Signer #1 certificate SHA-256 digest: ([a-fA-F0-9]{64})')
if(-not $match.Success -or $match.Groups[1].Value.ToLowerInvariant() -ne $signing.certificateSha256){throw 'APK signing certificate changed. Existing users cannot update without losing the app installation.'}
$badging=& (Join-Path $buildTools 'aapt.exe') dump badging $ApkPath
if($LASTEXITCODE -ne 0){throw 'APK metadata check failed.'}
$package=[regex]::Match(($badging -join "`n"),"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'")
if(-not $package.Success -or $package.Groups[1].Value -ne 'com.dailyfeedback.app' -or $package.Groups[2].Value -ne [string]$config.versionCode -or $package.Groups[3].Value -ne $config.version){throw 'APK package or version does not match app-release.json.'}
Write-Output "Verified APK: com.dailyfeedback.app v$($config.version) ($($config.versionCode)); original signing certificate retained."
