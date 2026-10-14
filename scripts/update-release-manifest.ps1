param([string]$Tag)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
$projectDir=Split-Path $PSScriptRoot -Parent
$config=Get-Content -Raw (Join-Path $projectDir 'app-release.json') | ConvertFrom-Json
if(-not $Tag){$Tag="v$($config.version)"}
$json=& gh api "repos/$($config.githubRepository)/releases/tags/$Tag"
if($LASTEXITCODE -ne 0){throw 'Unable to read the published release.'}
$release=$json | ConvertFrom-Json
$apk=$release.assets | Where-Object { $_.name -eq $config.apkAssetName -and $_.state -eq 'uploaded' -and $_.size -gt 0 }
if($release.draft -or $release.prerelease -or -not $apk){throw 'Publish a complete official APK release before updating the manifest.'}
$manifest=@{tag_name=$release.tag_name;draft=$false;prerelease=$false;body=$release.body;assets=@($release.assets | Select-Object name,state,size,browser_download_url,digest)}
[System.IO.File]::WriteAllText((Join-Path $projectDir 'latest-release.json'),($manifest | ConvertTo-Json -Depth 6),[System.Text.UTF8Encoding]::new($false))
Write-Output "Update manifest prepared for published release $Tag."
