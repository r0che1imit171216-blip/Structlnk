# Structlnk Windows Installer

The installer contains the files required to run Structlnk: `app`, `runtime`, examples, licenses, and user documentation. It does not include `sources`, `work`, or development `data`.

The default installation directory is `%LOCALAPPDATA%\Programs\Structlnk`; administrator rights are not required. API settings, UI language, and recovery files are saved under `%APPDATA%\Structlnk`. Updating or uninstalling the application does not remove those user files.

Build the installer with:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\build-installer.ps1
```

The build writes the installer, `latest.json`, and the SHA256 file to `dist`. Increase the version in `app/package.json` before creating an upgrade; keep the Inno Setup `AppId` unchanged.

The current installer is not signed with a commercial code-signing certificate. A trusted certificate should be used before public distribution to reduce Windows SmartScreen warnings.
