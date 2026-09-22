param(
  [string]$IsccPath = '',
  [string]$OutputDir = ''
)
$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$package=Get-Content (Join-Path $projectRoot 'app\package.json') -Raw | ConvertFrom-Json
$version=[string]$package.version
if($version -notmatch '^\d+\.\d+\.\d+$'){throw "package.json version must use x.y.z: $version"}
if(-not $OutputDir){$OutputDir=Join-Path $projectRoot 'dist'}
$OutputDir=[IO.Path]::GetFullPath($OutputDir)
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
if(-not $IsccPath){
  $candidates=@(
    (Join-Path $projectRoot 'work\tools\Inno Setup 7\ISCC.exe'),
    (Join-Path $projectRoot 'work\tools\Inno Setup 6\ISCC.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 7\ISCC.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'),
    'C:\Program Files\Inno Setup 7\ISCC.exe',
    'C:\Program Files (x86)\Inno Setup 6\ISCC.exe'
  )
  $IsccPath=$candidates | Where-Object {Test-Path -LiteralPath $_} | Select-Object -First 1
}
if(-not $IsccPath -or -not (Test-Path -LiteralPath $IsccPath)){throw 'ISCC.exe was not found. Install Inno Setup 6/7 or pass -IsccPath.'}
$manifest=Get-Content (Join-Path $projectRoot 'APP_SOURCE_SHA256.json') -Raw | ConvertFrom-Json
foreach($entry in $manifest.PSObject.Properties){
  $file=Join-Path $projectRoot ($entry.Name.Replace('/','\'))
  if(-not (Test-Path -LiteralPath $file)){throw "Missing source file: $($entry.Name)"}
  $actual=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
  if($actual -ne $entry.Value){throw "Source integrity mismatch: $($entry.Name)"}
}
$script=Join-Path $PSScriptRoot 'Structlnk.iss'
& $IsccPath "/DSourceRoot=$projectRoot" "/DOutputDir=$OutputDir" "/DAppVersion=$version" $script
if($LASTEXITCODE -ne 0){throw "Inno Setup failed with exit code $LASTEXITCODE"}
$installer=Join-Path $OutputDir "Structlnk-Setup-$version-x64.exe"
if(-not (Test-Path -LiteralPath $installer)){throw "Installer was not created: $installer"}
$item=Get-Item -LiteralPath $installer
$sha=(Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
$update=[ordered]@{version=$version;file=$item.Name;size=$item.Length;sha256=$sha;publishedAt=(Get-Date).ToUniversalTime().ToString('o')}
[IO.File]::WriteAllText((Join-Path $OutputDir 'latest.json'),(($update|ConvertTo-Json)+[Environment]::NewLine),(New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllText((Join-Path $OutputDir ($item.Name+'.sha256')),($sha+'  '+$item.Name+[Environment]::NewLine),(New-Object Text.UTF8Encoding($false)))
Write-Host "Built $installer"
Write-Host "SHA256 $sha"
