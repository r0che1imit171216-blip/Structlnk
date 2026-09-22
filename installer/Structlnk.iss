#ifndef SourceRoot
  #define SourceRoot ".."
#endif
#ifndef OutputDir
  #define OutputDir "..\dist"
#endif
#ifndef AppVersion
  #define AppVersion "0.7.0"
#endif

#define AppName "Structlnk"
#define AppPublisher "Structlnk Project"
#define AppExeName "Structlnk.exe"
#define AppId "{{6C2A5195-EF7F-4BB2-A940-9579650876F3}"

[Setup]
AppId={#AppId}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
VersionInfoVersion={#AppVersion}.0
VersionInfoCompany={#AppPublisher}
VersionInfoDescription=Structlnk chemistry drawing workspace installer
VersionInfoProductName={#AppName}
VersionInfoProductVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename=Structlnk-Setup-{#AppVersion}-x64
SetupIconFile={#SourceRoot}\app\assets\structlnk.ico
UninstallDisplayIcon={app}\runtime\{#AppExeName}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
UsePreviousAppDir=yes
ChangesEnvironment=no
ChangesAssociations=no
MinVersion=10.0.17763

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加快捷方式："; Flags: checkedonce

[InstallDelete]
Type: filesandordirs; Name: "{app}\app"
Type: filesandordirs; Name: "{app}\runtime"
Type: filesandordirs; Name: "{app}\examples"
Type: filesandordirs; Name: "{app}\licenses"

[Files]
Source: "{#SourceRoot}\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceRoot}\runtime\*"; DestDir: "{app}\runtime"; Excludes: "electron.exe"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceRoot}\runtime\electron.exe"; DestDir: "{app}\runtime"; DestName: "{#AppExeName}"; Flags: ignoreversion
Source: "{#SourceRoot}\examples\*"; DestDir: "{app}\examples"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceRoot}\licenses\*"; DestDir: "{app}\licenses"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceRoot}\installer\.structlnk-installed"; DestDir: "{app}"; DestName: ".structlnk-installed"; Flags: ignoreversion
Source: "{#SourceRoot}\APP_SOURCE_SHA256.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceRoot}\THIRD_PARTY_NOTICES.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceRoot}\THIRD_PARTY_VERSIONS.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceRoot}\README-User-Guide.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceRoot}\Agent-Guide.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceRoot}\ACS-Style-Notes.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceRoot}\ChemDraw-Import-Guide.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Structlnk"; Filename: "{app}\runtime\{#AppExeName}"; WorkingDir: "{app}"
Name: "{autodesktop}\Structlnk"; Filename: "{app}\runtime\{#AppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\runtime\{#AppExeName}"; WorkingDir: "{app}"; Description: "启动 Structlnk"; Flags: nowait postinstall skipifsilent
