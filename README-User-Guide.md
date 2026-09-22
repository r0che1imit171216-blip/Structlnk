# Structlnk · Research Group Chemistry Workspace

Version 0.7.0, an offline Windows x64 desktop prototype.

## Launch

Double-click **Launch Structlnk.vbs** in this folder. The application includes its runtime and does not require Node.js, Python, or ChemDraw. You can also run `runtime/electron.exe` directly.

## Installation and updates

`dist/Structlnk-Setup-0.7.0-x64.exe` is the Windows x64 installer. It installs by default to `%LOCALAPPDATA%\Programs\Structlnk`, requires no administrator rights, and creates a Start Menu shortcut. A desktop shortcut can be selected during setup.

Run a newer installer in the same location to upgrade. API settings, interface language, and recovery data are stored in `%APPDATA%\Structlnk`; upgrading or uninstalling application files does not remove those user files. The current installer is not signed with a commercial certificate, so Windows may display a SmartScreen warning the first time it runs.

## Direct drawing

Drawing and page layout are combined. The canvas tools around the main editor are the complete drawing interface; there is no separate structure window and no “place into canvas” step.

1. Use the left-side selection, bond, chain, S-Group, arrow, text, and image tools. Common ring templates are at the bottom; elements and the periodic table are on the right.
2. Bonds, rings, text, reaction arrows, equilibrium arrows, and curved mechanism arrows can be selected, moved, and edited on the same canvas.
3. The SMILES field appends a structure without clearing existing content.
4. Ctrl+S saves the complete current canvas. Changes are also written to a recovery copy automatically.
5. **Fit to Window** shows all content. Panning and zooming do not change ACS physical export scale.

The compact ChemDraw-style top bar places new, open, save, and undo on the left; the project name in the center; and style, Agent, export, language, and help on the right. The old example sidebar has been removed and **New** is in the top bar.

Multiple projects or imported pages can be open at once. The bottom window strip switches, restores, and closes canvases. Click the pencil or double-click a canvas name to rename it; Enter or focus loss saves, and Esc cancels. Minimized canvases can be renamed without restoring them. Each canvas has its own name, undo history, save path, and recovery copy.

The main canvas uses one context menu. Right-clicking an atom, bond, or line shows copy and paste together with object-editing options. Actions that are unavailable are disabled. Box-select atoms and bonds, press **Ctrl+C**, then press **Ctrl+V** to paste an editable copy into the blank area on the right. The pasted group remains selected so it can be moved as one unit; click the canvas once to release the group and edit individual atoms and bonds.

Click **Colors** beside the SMILES toolbar to highlight selected atoms and bonds. The panel provides 16 presets and a system color picker. Colors are saved with `.chemproj`, recovery data, and multi-canvas state, and support undo, redo, and clear-all.

The **EN / Chinese** button switches the application shell and saves the choice locally. Workspace, help, ACS style, ChemDraw import, and Agent settings follow the selected language. Project names, canvas text, and model output are user content and are not automatically translated. The embedded Ketcher tooltips are supplied by the upstream build and are mainly English.

## Canvas Agent

Click **Agent** to let a configured model read the current canvas KET/SMILES and answer questions or propose natural-language edits. The Agent can add structures, editable text, reaction arrows, moves, rotations, alignments, atom changes, bond changes, and background highlights. New content without an explicit position is placed in the blank area to the right.

Ordinary answers appear directly. A canvas modification shows a summary and warning, and changes enter the canvas only after **Approve and Apply** is clicked. The whole batch becomes one undoable operation. Providers include OpenAI, Claude (Anthropic), DeepSeek, local endpoints, and custom compatible APIs. See `Agent-Guide.md` for configuration, data handling, and limits.

## Saving, undo, and export

- Undo and redo cover chemical content and drawing-style changes.
- `.chemproj` is the complete editable project format. Version 0.4.0 and later store the unified canvas as KET.
- SVG, transparent PNG, and PDF are intended for figures; KET exports preserve editable chemistry.
- Saving an existing project keeps a `.bak` copy. **Project Save As** can create a new path.
- Recovery includes the current main canvas and is written before the application closes.

## Opening ChemDraw files

**Open** accepts `.cdx` and `.cdxml`. Select a page and drawing style in the preview, review object counts, and open the selected page directly in the main canvas.

You can also copy a molecule or reaction in ChemDraw with Ctrl+C and choose **Paste** from the Structlnk canvas context menu. Native ChemDraw CDX/CDXML data is detected automatically and converted into editable content. If the clipboard contains only EMF or PNG pixels, paste remains disabled. SMILES text can be appended directly.

Multipage files can be imported one page at a time. Complex mechanism arrows, fonts, spectra, tables, OLE attachments, and special layout may change or be omitted. Compare the imported page with the original; Structlnk never overwrites the original ChemDraw file. See `ChemDraw-Import-Guide.md`.

## ACS 1996 Compatible Style

Choose **ACS 1996 Compatible Style** from the drawing-style selector. The style uses a 14.4 pt calibrated standard bond length, 0.6 pt standard line width, 18% multiple-bond spacing, 2 pt wedge width, 2.5 pt hashed-wedge spacing, and Arial 10 pt labels in black and white.

The SVG area is 540 × 720 pt, PDF is US Letter with 36 pt margins, and transparent PNG is 4500 × 6000 px at 600 dpi. If content exceeds the ACS drawing area, export stops with a warning instead of silently cropping. The style preserves manual atom coordinates, so the selection tool can be used to adjust crowded bond lengths and angles. See `ACS-Style-Notes.md`.

This is an independent implementation from public parameters. It does not copy ChemDraw code, style files, templates, icons, or artwork. The original parameter name is used only as a compatibility reference.

## File layout

- `app/`: application source; `unified.js` is the unified-canvas entry point, `clipboard-import.cjs` handles ChemDraw clipboard detection, and `agent-service.cjs` handles model APIs.
- `app/vendor/ketcher/`: unmodified Ketcher 3.18.0 standalone build.
- `runtime/`: official Electron 44.4.1 Windows x64 runtime in the full distribution.
- `examples/`: editable organic-reaction, metal-complex, catalytic-cycle, mechanism, and ACS examples.
- `licenses/` and `THIRD_PARTY_NOTICES.txt`: third-party licenses, notices, and dependency inventories.
- `Agent-Guide.md`: API configuration, modification workflow, data scope, and boundaries.
- `Validation-Results.md`: verification scope and results.

## Scope and limitations

Organic reactions, metal complexes, catalytic cycles, and mechanisms are represented by editable examples. The examples and Agent assist drawing but do not replace chemical judgment. Check bond order, stereochemistry, charge, coordination direction, and mechanism arrows after importing or using image recognition.

Structlnk is an independent technical prototype, not a complete ChemDraw replacement. Office round-trip editing, lossless CDX/CDXML round-tripping, 3D coordination validation, multipage Structlnk projects, and multi-user editing are not implemented.

The application shell and example layouts are independently authored and do not use ChemDraw code, icons, or template libraries. Ketcher and Indigo use Apache 2.0; Electron uses MIT; other dependencies follow their own licenses. See `THIRD_PARTY_NOTICES.txt` and `licenses/` before redistributing a modified build.
