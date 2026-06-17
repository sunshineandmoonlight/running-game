$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$tempOutput = "C:\runner-release"
$releaseDir = Join-Path $projectRoot "release"
$artifactName = "霓虹金币跑酷-免安装版-1.0.0.exe"
$tempArtifact = Join-Path $tempOutput $artifactName

if (Test-Path -LiteralPath $tempOutput) {
  Remove-Item -LiteralPath $tempOutput -Recurse -Force
}

if (Test-Path -LiteralPath $releaseDir) {
  Remove-Item -LiteralPath $releaseDir -Recurse -Force
}

$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"

Push-Location $projectRoot
try {
  npm run build
  npx electron-builder --win portable --config.directories.output=$tempOutput
  New-Item -ItemType Directory -Path $releaseDir | Out-Null
  Copy-Item -LiteralPath $tempArtifact -Destination $releaseDir
  Write-Host "Portable executable created:" (Join-Path $releaseDir $artifactName)
} finally {
  Pop-Location
}
