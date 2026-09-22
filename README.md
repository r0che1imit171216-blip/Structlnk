# Structlnk

Structlnk is an offline Windows chemistry drawing workspace for organic structures and reactions, metal complexes, catalytic cycles, and reaction mechanisms. It combines the editable chemistry canvas, ChemDraw CDX/CDXML import, ACS 1996 compatible styling, project recovery, and an approval-gated canvas agent in one desktop application.

## Download

Windows x64 installers are published on the [Releases page](https://github.com/r0che1imit171216-blip/Structlnk/releases). The installer contains the Electron runtime and can be used without Node.js, Python, or ChemDraw.

## Source layout

- `app/` — Structlnk application source and the bundled Ketcher standalone frontend.
- `examples/` — editable examples for organic reactions, metal complexes, catalytic cycles, mechanisms, and ACS styling.
- `tests/` — service and UI verification scripts.
- `installer/` — Inno Setup script and the reproducible installer build script.
- `licenses/` — third-party licenses and dependency notices.
- `*.md` — Chinese user, Agent, import, ACS-style, and validation documentation.

The Electron Windows runtime, generated installers, recovery data, disposable test profiles, and upstream source archives are intentionally excluded from Git. They are either distributed in the installer/Release or documented in `THIRD_PARTY_NOTICES.txt`.

## Development

The checked-in application is plain JavaScript/HTML/CSS. A local Electron runtime is required to launch it. With the full release workspace present, run:

```powershell
runtime\electron.exe app
```

To build an installer, install Inno Setup 6 or 7 and provide the Electron runtime, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\build-installer.ps1
```

The build verifies `APP_SOURCE_SHA256.json` before invoking Inno Setup. Output is written to `dist/`, which is ignored by Git and uploaded as a GitHub Release asset.

## Agent and data handling

The canvas Agent can use OpenAI, Claude, DeepSeek, local, or compatible APIs. It reads the current canvas representation and only applies a proposed modification after the user approves it. API keys are stored locally with Windows protection and are not written into project files. See `Agent使用说明.md` for provider setup and data boundaries.

## Compatibility and licensing

The `ACS 1996 兼容样式` is an independent implementation based on publicly described parameters. It does not copy ChemDraw code, artwork, templates, or style files. ChemDraw file import is a compatibility feature; complex layouts should be checked against the original document.

Structlnk application code is released under the MIT License. Ketcher, Indigo, Electron, and other bundled components remain under their own licenses; see `THIRD_PARTY_NOTICES.txt` and `licenses/` before redistributing modified binaries.
