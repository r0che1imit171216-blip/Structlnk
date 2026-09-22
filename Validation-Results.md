# Structlnk Validation Results

This document records the local verification completed for Structlnk 0.7.0. Tests ran on Windows x64 with Electron 44.4.1, Ketcher 3.18.0, and Indigo 1.46.0 unless a section says otherwise. External model APIs and user API keys were not used; Agent service tests used local mock endpoints.

## 0.7.0: English documentation and repository release

The source repository was organized with an English README, English filenames, third-party notices, an MIT license for the Structlnk shell, and a GitHub Release containing the Windows installer. The installer is unsigned and may trigger SmartScreen on first launch.

Selected regression tests passed after the repository reorganization:

- ACS geometry and manual atom-coordinate preservation.
- Agent canvas operations, Claude requests, image payloads, and highlight operations.
- ChemDraw clipboard format detection.
- Bottom-window rename and recovery behavior.
- Custom highlight colors, undo/redo, and project persistence.
- Chinese/English shell switching and restart persistence.
- Direct runtime launch with `runtime/electron.exe`.
- JavaScript syntax checks for `app/main.cjs` and `app/agent-service.cjs`.

## 0.6.x: Agent, canvas, and interface changes

The following local Electron checks passed:

- `canvas_ops` can add SMILES/Molfile structures, editable text, reaction and equilibrium arrows, moves, rotations, alignment, atom edits, and bond edits.
- Selection context restricts existing-object edits to selected IDs.
- `set_highlight` and `clear_highlight` use the project highlight system without rewriting KET or bond order.
- JPEG, PNG, GIF, and WebP attachments are checked by extension, size, dimensions, and file magic before being sent.
- OpenAI Responses, OpenAI-compatible Chat Completions, Claude Messages, and DeepSeek payloads are assembled with the expected authentication and structured-output rules.
- API keys are encrypted with Windows `safeStorage` and do not appear in configuration files.
- Multi-canvas creation, minimization, switching, closing, rename, recovery metadata, and project save paths survive restart.
- Unified right-click copy/paste supports Structlnk KET, native ChemDraw data, CDX/CDXML, and SMILES fallback; image-only clipboard content is rejected.
- The English shell switches all supported outer panels while Ketcher upstream tooltips remain mainly English.

## 0.5.x: Configurable model APIs

DeepSeek provider presets were checked with local mock responses. The tests verified provider selection, Chat Completions protocol, the official root URL, default model, persistence, request URL construction, Bearer authentication, JSON Object fallback, and encrypted key storage. Real account limits, model availability, billing, and provider-side output quality remain outside local verification.

OpenAI Responses and compatible Chat Completions tests also verified HTTPS enforcement for remote endpoints, local HTTP exceptions, `store: false`, JSON Schema validation, KET validation, response size limits, and approval-gated application. Applying a plan creates an undo entry; `no_change` leaves project data unchanged.

## 0.4.x: Unified canvas and valence correction

The unified-canvas suite verified direct bond drawing, reaction arrows, rich text, SMILES append without clearing existing content, automatic recovery, unified undo/redo, Ctrl+S, version 2 reopening, ACS settings, SVG/PNG/PDF/KET export, legacy project migration, cisplatin coordination bonds, CDX/CDXML import, close/restart recovery, and protection of original files.

The alternating-double-bond ring regression was reproduced through real editor interaction. The fix identifies two shared ordinary carbon atoms, changes the four shared bonds to single bonds, remains idempotent, leaves normal biphenyl unchanged, preserves charged and non-alternating rings, hides the shared carbon label, and supports undo/redo and ACS style.

## 0.3.x: ChemDraw import

The import suite covered native CDX preview and cancellation, ChemDraw 20 CDXML structures and arrows, import undo/redo, editable reaction content, ChemDraw 13 binary CDX, separate project saving, protection against overwriting the original, embedded CDX raster images, multipage CDX/CDXML, ACS physical scale, invalid CDX, custom XML entities, SVG sanitization, directed metal coordination bonds, enhanced stereochemistry, UTF-16 XML, empty pages, and restart recovery.

The native Windows clipboard test used the ChemDraw 2022 `benzene.cdx` sample and produced six atoms and six editable bonds. Tests used isolated data directories; the user's recovery file remained unchanged. User-provided historical drawings have not been tested, so all ChemDraw features are not guaranteed to round-trip.

## 0.2.x and 0.1.x baseline

ACS export was checked for physical SVG dimensions, 4500 × 6000 RGBA PNG, 600 dpi metadata, 612 × 792 pt PDF, 0.6 pt bond width, 10 pt captions, style persistence, and manual coordinates. Legacy examples retained atoms, independent text, arrows, and coordination geometry.

The baseline suite verified metal examples, directed N–Pt and P–Pd coordination bonds, SMILES and stereochemistry round-trip, multiline Unicode text, curve control points, arrow endpoint bindings, undo/redo, object duplication and deletion, native project save and backup, SVG/PNG/PDF export, unsafe-ID rejection, SVG sanitization, blocked external network requests in the offline application, and restart recovery.

## Known limitations

Structlnk is a technical prototype rather than a complete ChemDraw replacement. Office round-trip editing, atom-level arrow binding, lossless CDX/CDXML round-trip, 3D coordination validation, multipage Structlnk projects, and collaborative editing are not implemented. Font metrics, special layout, spectra, tables, OLE objects, and complex mechanism arrows may change during import.

Arrows currently follow relative molecule positions and should be checked after chemical-editor layout changes. Automatic recovery includes only content confirmed on the page. The `sources/` archives are for license review and maintenance; normal runtime does not require them.
