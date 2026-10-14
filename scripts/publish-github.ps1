param([string]$NotesFile = 'RELEASE-NOTES.md')
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
$projectDir = Split-Path $PSScriptRoot -Parent
function Push-Source {
  & git push -u origin main
  if ($LASTEXITCODE -eq 0) { return }
  $networkSettings = Get-ItemProperty 'HKCU:/Software/Microsoft/Windows/CurrentVersion/Internet Settings' -ErrorAction SilentlyContinue
  $proxy = if ($networkSettings.ProxyEnable -eq 1) { [string]$networkSettings.ProxyServer } else { '' }
  if ($proxy -match '^([^;=]+:\d+)$') { & git -c "http.proxy=http://$proxy" -c 'http.version=HTTP/1.1' push -u origin main }
  if ($LASTEXITCODE -ne 0) { throw 'Git push failed.' }
}
Push-Location $projectDir
try {
  $config = Get-Content -Raw 'app-release.json' | ConvertFrom-Json
  $repository = $config.githubRepository
  if ($repository -notmatch '^[a-zA-Z0-9-]+/[a-zA-Z0-9._-]+$' -or $config.version -notmatch '^\d+\.\d+\.\d+$' -or $config.versionCode -lt 2) { throw 'Invalid app-release.json.' }
  if (-not (Test-Path -LiteralPath $NotesFile)) { throw 'Release notes file not found.' }
  & gh auth status
  if ($LASTEXITCODE -ne 0) { throw 'Run gh auth login first.' }
  $repoJson = & gh repo view $repository --json nameWithOwner,visibility,url
  if ($LASTEXITCODE -ne 0) { throw 'Create the configured public repository before publishing.' }
  $repo = $repoJson | ConvertFrom-Json
  if ($repo.visibility -ne 'PUBLIC') { throw 'Public Releases are required for anonymous mobile update checks.' }
  if (-not (Test-Path -LiteralPath '.git')) { throw 'Initialize this project as a Git repository first.' }
  $branch = & git branch --show-current
  if ($branch -ne 'main') { throw 'Publish from main after merging the intended changes.' }
  $remote = & git remote get-url origin
  if ($remote -ne "https://github.com/$repository.git" -and $remote -ne "git@github.com:$repository.git") { throw 'origin does not match the configured update repository.' }
  $tag = "v$($config.version)"
  $releasesJson = & gh release list --repo $repository --limit 100 --json tagName,isDraft,isPrerelease
  if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect existing releases.' }
  foreach ($release in ($releasesJson | ConvertFrom-Json)) {
    if ($release.tagName -eq $tag) { throw 'This version is already published. Increase version and versionCode before a new release.' }
    if (-not $release.isDraft -and -not $release.isPrerelease -and $release.tagName -match '^v?\d+\.\d+\.\d+$') {
      if ([version]$release.tagName.TrimStart('v') -ge [version]$config.version) { throw 'New release version must be greater than existing releases.' }
    }
  }
  $latest = ($releasesJson | ConvertFrom-Json) | Where-Object { -not $_.isDraft -and -not $_.isPrerelease } | Select-Object -First 1
  if ($latest) {
    $metadataDir = Join-Path $projectDir '../../work/publish-metadata'
    New-Item -ItemType Directory -Force -Path $metadataDir | Out-Null
    & gh release download $latest.tagName --repo $repository --pattern 'app-release.json' --dir $metadataDir --clobber
    if ($LASTEXITCODE -ne 0) { throw 'Latest release is missing version metadata. Verify its versionCode before publishing.' }
    $previous = Get-Content -Raw (Join-Path $metadataDir 'app-release.json') | ConvertFrom-Json
    if ($config.versionCode -le $previous.versionCode) { throw 'versionCode must be greater than the previous release.' }
  }
  & npm.cmd test
  if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
  & npm.cmd run lint
  if ($LASTEXITCODE -ne 0) { throw 'Lint failed.' }
  & npm.cmd run android:build
  if ($LASTEXITCODE -ne 0) { throw 'APK build or signing validation failed.' }
  & git add -A
  if ($LASTEXITCODE -ne 0) { throw 'Git staging failed.' }
  $staged = & git diff --cached --name-only
  if ($staged | Where-Object { $_ -match '\.(keystore|jks|apk)$|(^|/)(node_modules|test-results|artifacts)/|(^|/)\.env|android-build\.local\.json|local\.properties$' }) { throw 'Local-only files were staged. Remove them before publishing.' }
  & git diff --cached --quiet
  if ($LASTEXITCODE -eq 1) {
    & git commit -m "Release $tag"
    if ($LASTEXITCODE -ne 0) { throw 'Git commit failed.' }
  } elseif ($LASTEXITCODE -ne 0) { throw 'Unable to inspect staged files.' }
  Push-Source
  $commit = & git rev-parse HEAD
  & gh release create $tag 'artifacts/daily-feedback-debug.apk' 'artifacts/daily-feedback-debug.apk.sha256' 'app-release.json' --repo $repository --target $commit --title "每日正反馈 $($config.version)" --notes-file $NotesFile --latest
  if ($LASTEXITCODE -ne 0) { throw 'Release upload failed. Source may already be pushed; inspect GitHub Releases before retrying.' }
  & (Join-Path $PSScriptRoot 'update-release-manifest.ps1') -Tag $tag
  & git add latest-release.json
  & git commit -m "Publish update manifest for $tag"
  if ($LASTEXITCODE -ne 0) { throw 'Release is published, but update manifest commit failed.' }
  Push-Source
  Write-Output "Published: https://github.com/$repository/releases/tag/$tag"
} finally { Pop-Location }
