# Canvas Agent Guide

Structlnk 0.7.0, 2026-09-21.

## Capabilities

The canvas Agent reads the current KET chemical graph and, when available, its SMILES representation. You can also attach a local chemistry image so a vision-capable model can identify molecules, reactions, text, or layout and produce editable structures. KET context supplies existing atoms, bonds, coordinates, text, and arrows accurately; images are useful for paper screenshots, scans, or structures exported by another application.

The Agent can answer questions about the current canvas or split one instruction into constrained canvas operations: add structures, condition text, and reaction arrows; move, rotate, or align objects; and change atom labels, charges, and bond types by ID. New content without an explicit position is placed in the blank area to the right of existing content. The panel shows a change summary, risk notice, and approval area only when the model proposes a canvas modification. Nothing enters the canvas until **Approve and Apply** is clicked, and the whole batch can be undone once.

## API configuration

1. Click **Agent** in the top bar, then click the gear in the right panel.
2. Choose **OpenAI**, **Claude (Anthropic)**, **DeepSeek**, a local compatible endpoint, or a custom compatible endpoint under **Provider**.
3. For **Claude**, Structlnk fills the Anthropic Messages API, `https://api.anthropic.com/v1`, and the default model `claude-sonnet-4-6`. For **DeepSeek**, it fills Chat Completions, `https://api.deepseek.com`, and `deepseek-flash`.
4. Enter the provider API key. For other providers, check the API root, protocol, and model IDs available to your account.
5. Save the settings, enter a question or edit instruction, and click the send arrow. To use image recognition, click **Image** first; an image-only request will try to convert the depicted structure into editable content.

OpenAI usually uses `https://api.openai.com/v1`. Claude uses the Anthropic Messages API at `/v1/messages`, authenticates with `x-api-key`, and requests structured JSON output. The DeepSeek preset uses the OpenAI-compatible root `https://api.deepseek.com` and sends requests to `/chat/completions`. Other providers should use the official root URL and model ID from their documentation. Remote endpoints must use HTTPS; `localhost`, `127.0.0.1`, and `::1` may use HTTP. When an API address changes, Structlnk does not carry the key saved for the previous address to the new address.

DeepSeek defaults to `deepseek-flash`, which accepts image input. `deepseek-v4-pro` is currently used for text-only requests; with an attached image, Structlnk asks you to switch to `deepseek-flash`. Extended reasoning is off by default and can be enabled for difficult mechanism or valence questions. DeepSeek requests stream their response, and the panel shows elapsed time and received bytes. A single request can wait up to five minutes.

API keys are encrypted with Windows `safeStorage` in the Electron main process and saved in the application-data directory. They are not written to `.chemproj`, KET, export files, or rendered pages. For a plan request, your instruction, current KET/SMILES, project name, style, object counts, and attached image are sent to the configured API. Data handling follows that provider's policy. An image is used only for that request, cleared from the panel after success, and never saved in the project.

## Image recognition

The **Image** button in the lower-left of the Agent input accepts JPEG, PNG, GIF, and WebP. Each image is limited to 10 MB and an 8192-pixel longest edge. A local thumbnail is shown before sending and can be removed. One image may be attached per request; the current canvas context is sent with it, so instructions such as “replace the selected structure with the one in the image” or “add the reaction from the screenshot to the current canvas” are supported.

A single clear molecule can usually be converted to SMILES or Molfile and added to the canvas. Multi-molecule reactions, condition text, and complex layouts may require the model to produce a complete KET structure. Image recognition cannot guarantee bond order, stereochemistry, isotopes, charges, coordination direction, or mechanism arrows. The Agent must put uncertain items in its warning, and the review, approval, and undo workflow remains in place.

## Modification modes

- `add_source`: add a structure from SMILES, Molfile, or another supported source.
- `replace_source`: replace the whole canvas with SMILES, reaction SMILES, Molfile, or RXN.
- `canvas_ops`: combine structure, text, reaction-arrow, move, rotate, align, atom, and bond operations; at most 20 operations per request.
- `replace_ket`: keep the layout while making local atom, bond, text, or arrow changes.
- `set_highlight`: add background highlighting to a specified structure, functional group, or selection.
- `clear_highlight`: clear highlighting from selected objects or the whole canvas.
- `no_change`: answer without modifying the canvas when the instruction is unclear or a safe edit is not possible.

Structlnk checks the response type, size, KET structure, colors, object IDs, coordinates, and operation count. After applying a plan it reads the actual canvas to confirm the result; on failure it restores the pre-application content. Model output is never executed as code and cannot directly access local files.

When lasso or box selection is active, the Agent receives the selected atoms, bonds, text, and arrows as constrained context. The application rejects a whole-canvas replacement while a selection exists; local edits must remain inside the selected IDs and should be reviewed before approval.

The Agent also receives object mappings for atoms, bonds, text, and arrows, together with existing highlight colors. It can therefore understand requests such as “give this benzene ring a pale-yellow background,” “mark the hydroxyl group blue,” or “move the arrow and add the reaction condition.” Existing-object edits are restricted to the selected IDs when a selection exists. New content remains available. Without a selection, the model must identify targets from the object mapping. If no color is supplied, the suggested default is pale yellow `#F4D35E`. Highlighting uses the project's existing color system and does not rewrite molecular KET data or bond orders.

## Example instructions

- `Add an ethanol molecule to the current canvas.`
- `Replace one carbon in the left benzene ring with nitrogen while preserving every other object and coordinate.`
- `Change this single bond to a double bond and check the valence of adjacent atoms.`
- `Keep the reactant and product, add Pd(PPh3)4 above the arrow, and add THF below it.`
- `Add benzene and bromoethane in the blank area on the right, place a reaction arrow between them, and write FeBr3 above the arrow.`
- `Move the selected complex 3 units to the right and rotate it clockwise by 20 degrees.`
- `Give this benzene ring a pale-yellow background.`
- `Mark the selected ligand light blue.`

Specify the structure location, target atom, or content that must be preserved. For a complex canvas, first ask the Agent to describe the objects it recognizes, then send the edit instruction.

## Boundaries

Only images explicitly attached through the Agent panel are sent as vision input. Existing bitmap nodes on the canvas remain KET image nodes and are not automatically extracted and sent again. Canvas context is limited to 2 MB per request and returned KET to 5 MB.

Models can produce incorrect valence, stereochemistry, coordination direction, reaction conditions, or mechanisms. Check the summary before approval and the canvas after applying it; undo immediately when necessary. The Agent assists drawing and does not replace chemical judgment.

API references:

- [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages/create)
- [DeepSeek API](https://api-docs.deepseek.com/)
