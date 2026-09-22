# ACS 1996 Compatible Style

This style is available in Structlnk 0.7.0. The parameters were integrated on 2026-09-16 and verified with the unified canvas on 2026-09-17.

Restart Structlnk and choose **ACS 1996 Compatible Style** from the drawing-style selector above the main canvas. Open **Style Notes** to review the parameters; Ctrl+Z can undo a style change.

| Item | Preset |
| --- | --- |
| Default standard bond length | 14.4 pt (5.08 mm) |
| Standard bond width | 0.6 pt |
| Wedge bond width | 2 pt |
| Multiple-bond spacing | 18% of the bond length |
| Hashed wedge spacing | 2.5 pt |
| Atom labels and text | Arial, 10 pt, black; system fallback for CJK text |
| SVG drawing area | 540 × 720 pt |
| PDF | US Letter, 612 × 792 pt, 36 pt margins |
| PNG | 4500 × 6000 px, transparent background, 600 dpi |

The style is saved in the project file. Switching styles preserves KET data, relative atom coordinates, and connectivity; it does not automatically rearrange coordination geometry. The canvas can be panned and zoomed without changing the physical export scale. The 14.4 pt value is the default calibration for new drawing and export; it does not lock every bond coordinate.

To spread out a crowded structure, select the selection tool and drag an individual atom. This manually adjusts adjacent bond lengths and angles. The new coordinates are undoable, saved in `.chemproj`, and used directly for SVG, PNG, and PDF export. Rendering or reopening the project does not reset those coordinates because of the style.

Reaction and mechanism arrows use the chemistry engine's ACS rendering settings. Rich text on the main canvas can keep its own font size. The style changes the export page ratio, so check crowded layouts and arrow endpoints before publishing.

Public parameter reference: [ChemDraw ACS Document 1996 documentation](https://support.revvitysignals.com/hc/en-us/articles/4408234173332). The original name is mentioned only to identify the parameter source. Structlnk independently implements this compatible style from those public parameters, with its own parameter mapping and page logic. It does not copy ChemDraw code, style files, templates, or icons. The bundled Ketcher and Indigo distributions are unmodified.

Compatibility scope: standard bonds, font size, black-and-white display, multiple-bond spacing, and physical export ratios are integrated. Label avoidance, 1.6 pt label padding, some special thick bonds, and complex stereobond appearance remain controlled by the chemistry engine and are not promised to be pixel-identical to ChemDraw. Coordination structures retain their original geometry and are not forced into organic-chain angles.

## Verification

The following 15 checks passed in the Electron application with an isolated test-data directory; the user's recovery file was not used:

1. Existing v1 project loads without mutation.
2. The ACS selector applies the style while preserving exact KET data, including metal geometry.
3. ACS molecule scale and 10 pt captions are correct.
4. Undo restores the original project and redo restores ACS settings.
5. The chemical editor receives ACS settings and manually adjusted atom coordinates remain unchanged.
6. New projects and newly drawn structures inherit the selected style.
7. New captions use 10 pt.
8. Style and calibrated geometry persist in the project file.
9. ACS SVG export works.
10. ACS PNG export works.
11. ACS PDF export works.
12. SVG declares its physical dimensions.
13. Examples inherit ACS settings and curve bindings survive style application.
14. Restart restores the document style.
15. Switching back restores the standard editor, canvas, and export mode.

Final measurements: PDF is one 612 × 792 pt page; the measured standard bond width is 0.599999 pt and the measured caption size is 9.997499 pt after browser rounding. PNG is 4500 × 6000 RGBA with approximately 599.9988 dpi metadata. Indigo floating-point truncation was corrected; at 600 dpi, export calibration uses 120 pixels for 14.4 pt. The interface and rendered PDF were visually checked.

The example is `examples/05-ACS1996-organic-reaction.chemproj`; open it from the application's **Open** command.
