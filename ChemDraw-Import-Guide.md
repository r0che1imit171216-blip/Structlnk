# Opening ChemDraw Files

Structlnk 0.7.0, 2026-09-18.

## Import steps

1. Restart Structlnk and click **Open** in the top bar.
2. Select the original `.cdx` or `.cdxml` file; uppercase extensions are also accepted.
3. Select a page in the import window. For a multipage file, import one page at a time.
4. Review the conversion preview, object count, and warnings. Choose **Standard Drawing** or **ACS 1996 Compatible Style**, then click **Open Selected Page**.
5. The selected page enters the main canvas. Use the tools around the canvas to edit atoms, bonds, text, arrows, and images.
6. Press Ctrl+S to save as `.chemproj`. The project can be reopened for editing; saving the project never overwrites the original `.cdx` or `.cdxml` file.

Click **Cancel** in the import window to keep the current canvas. After opening a page, Ctrl+Z undoes the complete replacement.

## Pasting from the clipboard

1. In ChemDraw, select the molecule or reaction and press Ctrl+C.
2. Return to Structlnk and choose **Paste** from the canvas context menu. The option detects native ChemDraw data automatically and is disabled when no editable chemical data is available.
3. Check the import preview and object count, then click **Open Selected Page**.

Structlnk prefers native `ChemDraw Interchange Format` CDX, and also supports CDXML, CDX embedded in `Native`, and SMILES fallback. If the clipboard contains only an EMF or PNG preview, Structlnk refuses the import because those pixels cannot be edited as atoms and bonds.

## What is preserved

- Atoms, bonds, connectivity, stereochemistry, reaction arrows, independent text, and some graphics recognized by Ketcher/Indigo.
- Converted PNG and other embedded bitmaps remain image nodes; they are not automatically converted into editable chemistry.
- The selected page becomes one KET main-canvas dataset. Molecules, text, arrows, and supported graphics can be selected and edited there.
- Standard mode scales content proportionally to the page. ACS 1996 Compatible Style uses Structlnk's independently implemented bond calibration and physical scale; imported atoms can still be dragged to adjust local bond lengths and angles. Oversized content produces a warning about the drawing area. Rich text remains subject to the chemistry engine's conversion and layout rules.
- Page selection and object counts use public format information. Chemical conversion uses the open-source engines bundled with the application. No ChemDraw runtime or cloud conversion service is required.

## Current boundaries

This is editable import, not a lossless ChemDraw replacement. Fonts, paragraphs, special bonds, curved mechanism arrows, fishhook direction, arrow curvature, nested abbreviations, spectra, tables, OLE attachments, and complex layout may differ or be omitted. Object counts can reveal some problems but cannot prove that the original is fully preserved. Compare the imported canvas with the original.

The current build reads native clipboard data copied directly from ChemDraw and recognizes standard CDX data inside `Native`. It does not guarantee recovery from every Word/PowerPoint version or historical OLE object. Screenshots, PDF, PNG, and EMF-only clipboard content are not interpreted as chemistry. The main canvas cannot be written back to CDX/CDXML without loss.

A Structlnk project remains one page. Multipage ChemDraw files can be imported page by page and saved separately; logical CDX/CDXML pages may differ from printed pages. Input files and converted projects are limited to 40 MB.

If a CDX file cannot be read, save the required page as CDXML in ChemDraw and try again. The original file is never modified; corrupt files and pages without convertible content do not replace the current canvas.

## Verification scope

Tests used Indigo 1.46.0 fixtures retained with the project and self-generated multipage and metal-complex samples. Coverage includes ChemDraw 13 binary CDX, ChemDraw 20 CDXML, UTF-16 CDXML, text and reaction arrows, embedded bitmaps, coordination-bond direction, relative coordination geometry, enhanced stereochemistry labels, cancel and undo, save/reopen, and restart recovery.

The 0.3.0 import suite passed 20 checks. Version 0.4.0 additionally verified that CDX/CDXML pages enter the unified canvas and remain editable. Version 0.5.7 used the ChemDraw 2022 benzene sample to verify native Windows clipboard reading; the converted structure contained six atoms and six editable bonds. The visible import window, imported canvas, and embedded-image PNG export were checked. All tests used isolated data directories, and the user's recovery files were unchanged. User-provided historical drawings have not yet been tested, so compatibility with every ChemDraw object is not guaranteed.

Detailed records are in `Validation-Results.md`.

Format interface reference: [Ketcher project documentation](https://github.com/epam/ketcher/blob/master/README.md). The verification environment used Ketcher 3.18.0 and Indigo 1.46.0.
