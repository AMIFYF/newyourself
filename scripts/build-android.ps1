param([string]$JavaHome, [string]$SdkRoot)
$ErrorActionPreference = 'Stop'
$projectDir = Split-Path $PSScriptRoot -Parent
$localConfigPath = Join-Path $projectDir 'android-build.local.json'
$localConfig = if (Test-Path -LiteralPath $localConfigPath) { Get-Content -Raw -LiteralPath $localConfigPath | ConvertFrom-Json } else { $null }
if (-not $JavaHome) { $JavaHome = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { $localConfig.javaHome } }
if (-not $SdkRoot) { $SdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { $localConfig.sdkRoot } }
if (-not $JavaHome -or -not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin/java.exe'))) { throw 'Set JAVA_HOME to JDK 21, or pass -JavaHome.' }
if (-not $SdkRoot -or -not (Test-Path -LiteralPath (Join-Path $SdkRoot 'platforms/android-36'))) { throw 'Set ANDROID_HOME to an SDK containing Android 36, or pass -SdkRoot.' }
$env:JAVA_HOME = $JavaHome
$env:ANDROID_HOME = $SdkRoot
Push-Location $projectDir
try {
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
  & npx.cmd cap sync android
  if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }
  $sdkProperty = $SdkRoot.Replace('\', '/').Replace(':', '\:')
  Set-Content -LiteralPath 'android/local.properties' -Value "sdk.dir=$sdkProperty" -Encoding ascii
  Push-Location 'android'
  try {
    $gradleCommand = if ($localConfig.gradleHome) { Join-Path $localConfig.gradleHome 'bin/gradle.bat' } else { '.\gradlew.bat' }
    & $gradleCommand :app:assembleDebug --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'Android Gradle build failed.' }
  } finally { Pop-Location }
  & (Join-Path $PSScriptRoot 'verify-apk.ps1') -JavaHome $JavaHome -SdkRoot $SdkRoot
  New-Item -ItemType Directory -Force -Path 'artifacts' | Out-Null
  Copy-Item -LiteralPath 'android/app/build/outputs/apk/debug/app-debug.apk' -Destination 'artifacts/daily-feedback-debug.apk' -Force
  $apkPath = Join-Path $projectDir 'artifacts/daily-feedback-debug.apk'
  $hasher = [System.Security.Cryptography.SHA256]::Create()
  try { $checksum = [BitConverter]::ToString($hasher.ComputeHash([System.IO.File]::ReadAllBytes($apkPath))).Replace('-', '').ToLowerInvariant() }
  finally { $hasher.Dispose() }
  [System.IO.File]::WriteAllText("$apkPath.sha256", "$checksum  daily-feedback-debug.apk`n")
  Write-Output "SHA256: $checksum"
  Write-Output "APK: $projectDir/artifacts/daily-feedback-debug.apk"
} finally { Pop-Location }
