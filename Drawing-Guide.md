# Direct Drawing and the Unified Canvas

Structlnk 0.7.0, 2026-09-18.

Chemistry drawing and page layout now share one main canvas. Atoms, bonds, text, reaction arrows, equilibrium arrows, curved mechanism arrows, images, and graphics are managed by the same editor. Saving, undo, and export operate on this single canvas dataset.

## Common tools

- Left: pan, box select, eraser, bond, chain, S-Group, R-Group, reaction plus sign, arrow, shape, text, and image.
- Bottom: benzene and common ring templates.
- Right: H, C, N, O, S, P, halogens, the periodic table, and extended element tools; metals are selected from the periodic table.
- Top bar: new, open, save, undo, redo, project name, drawing style, Agent, export, and language switch.
- Bottom window strip: switch, restore, close, and rename canvas windows; click the pencil or double-click a name to edit it.
- Canvas toolbar: copy, cut, structure cleanup, checks, settings, and zoom.
- Under the top bar: drawing style, unified undo/redo, SMILES append, and fit-to-window.
- Highlight colors: after selecting atoms or bonds, choose one of 16 presets or use the system color picker.

The reaction-arrow button has a drop-down menu. Curved mechanism arrows use the ellipse-arc type; single-electron arrows use the half-arrow type. Tooltips are provided by Ketcher and are mainly in English.

Applying an alternating-double-bond six-membered ring template to an existing ordinary carbon creates a shared-atom structure. Structlnk automatically changes the shared carbon's four bonds to single bonds so valence stays valid and the skeleton carbon remains hidden. Charged, isotopic, radical, aliased, and explicitly labelled carbon atoms are not rewritten.

Copy and paste are in the shared context menu for atoms, bonds, and lines. Box selection also supports Ctrl+C and Ctrl+V. Copy is disabled without a valid selection; paste is disabled when the clipboard contains no recognized Structlnk, ChemDraw, or SMILES data. Canvas copies are stored as KET, placed in the blank area to the right, and kept selected as one group so they can be moved together. Click the canvas once to release the group and edit atoms, bonds, and drawing objects independently.

Custom highlights are stored in project data, restored when switching canvases or reopening projects, and included in undo, redo, and recovery. Clearing highlights does not delete chemical objects.

The **Agent** button sends current KET/SMILES data to the configured model, which proposes reviewable changes. See `Agent-Guide.md` for API settings and limits.

## Data and compatibility

New projects use format version 2 with KET as the core data. Version 1 projects are converted to the unified KET canvas, with the pre-conversion project embedded as `originalProject`. The old file is not overwritten on the first migrated save; the Export menu can also recover the pre-conversion data.

Legacy molecules are migrated from their displayed positions and bond lengths. Text and arrows become KET objects. Legacy arrow-to-molecule bounding-box bindings have no one-to-one KET equivalent, so their visible position is preserved but the binding is not; recheck mechanism arrows after moving a molecule.

Selected CDX/CDXML pages enter the same canvas directly, without an outer object that must be double-clicked. See `ChemDraw-Import-Guide.md` for format boundaries.

## Verification

Seventeen unified-canvas integration checks and three final checks passed. They cover direct bonds, reaction arrows and text, SMILES append, recovery, unified undo/redo, Ctrl+S inside the canvas, version 2 reopening, ACS settings and four exports, four legacy examples, cisplatin coordination bonds, original-project recovery, CDX/CDXML import, close/restart recovery, and protection of old files during migration.

All automated checks use isolated test-data directories; `data/recovery.chemproj` is unchanged before and after testing. See `Validation-Results.md` for the detailed record.
