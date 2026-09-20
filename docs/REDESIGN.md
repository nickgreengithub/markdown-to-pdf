# Markdown Studio — redesign

Status: implemented. This document is the design the rewrite follows; update it when a
decision changes. Deviations from the first draft are listed at the end.

## Why

The first version edited a `contentEditable` A4 page and derived Markdown from it on
demand. That gave two sources of truth (HTML in `localStorage`, Markdown via `turndown`),
a lossy round trip (image sizing in inline styles, guessed soft-wraps, sanitised paste),
and a print path that re-flowed the document independently of the preview's pagination.
For a tool whose point is planning printed pages, the last one is the structural risk:
nothing pinned a page break placed in the preview to the PDF.

What was right and is kept: the CSS-variable theme model (`expandTheme`, per-level
controls, four themes), a real A4 paginator, the `thead`/`tfoot` print margin trick,
zero build step for the app, and cache-only persistence.

## Layout

```
┌─ top bar ───────────────────────────────────────────────────────────────────┐
│ ◧ Markdown Studio  [Demo ▾]  Theme ▾  Page setup ▾   ▢ ▢▢ ▦   −100%+   🖨   │
├──────────────────────────┬──────────────────────────────────────────────────┤
│ H1 H2 H3 B I S ≡ 1. " ` ▦ 🔗 🖼 ⤓ ␣  ?   │                                    │
│  1 # Title               │      ┌──────────────┐  ┌──────────────┐          │
│  2                       │      │  Page 1      │  │  Page 2      │          │
│  3 Body text **bold**…   │      │              │  │              │          │
│  5 ![](chart-1 "Fig 2")  │      │   ┌────────┐ │  │              │          │
│  6 \pagebreak            │      │   │ popover│ │  │              │          │
│  7 ## Section            │      └───┴────────┴─┘  └──────────────┘          │
│  Markdown: warm, mono,   │   Preview: grey canvas, white A4 sheets,         │
│  no page container       │   read-only; single / spread / grid             │
└──────────────────────────┴──────────────────────────────────────────────────┘
```

- **Markdown pane** (left, CodeMirror 6). Editing happens here and only here. Raw syntax
  stays raw; colouring and gutter marks are the only decoration. Helpers: an insert
  toolbar, new-line / `\` autocomplete listing every block type, hover and gutter-click
  help on tokens with "change to…" variants, and a `?` syntax reference that inserts
  examples at the caret.
- **Preview pane** (right). Read-only, live (debounced). Modes: single, spread (two-up),
  grid (fit several across, forced page breaks marked). Zoom with fit-width / fit-page.
- **Linking.** Rendered blocks carry `data-line`. Caret movement highlights the block and
  keeps it in view; clicking a block moves the caret to its source. Scroll sync both ways.
- **Styling.** Nothing permanent on screen. Click an element in the preview → popover with
  that element's controls (the existing per-level / per-element control set). Theme and
  Page setup live in the top bar. `LEVELS` / `levelKeys` / `expandTheme` are unchanged.
- **Print = preview.** The paginator is the print path: each sheet is a fixed-height A4
  box with `break-after: page`. Tables split at rows, lists at items, code at lines;
  paragraphs move whole.

## Dialect

CommonMark + GFM tables / strikethrough / task lists, plus:

| Write | Meaning |
|---|---|
| `\pagebreak` | Force a new page |
| `\` alone on a line | One blank line of vertical space; repeat for more |
| `\vspace 3` | Three lines of vertical space |
| `![alt](chart-1 "Figure 2. Adoption by sector")` | Library image; the title is the caption (inline markdown allowed) |
| `![alt](chart-1 "…"){width=50% align=right}` | Sizing / alignment; the style popover writes these back |
| `[^1]` / `[^1]: …` | Footnotes |

Directives are pre-processed before markdown-it; unknown `\word` lines pass through as text.

## Images

Paste or drop anywhere → stored in IndexedDB under a short unique name, downscaled
(1800 px long edge), `![](name)` inserted at the caret. The library popover lists
thumbnails with rename / delete / insert / add-from-file / remove-unused. Preview and
print resolve names to object URLs. Demo figures are seeded into the library.

## Persistence

- `localStorage`: markdown, theme id + variable overrides, UI state (split, mode, zoom).
- `IndexedDB`: image blobs.
- Migration: an old `mdv4.html` is converted once with `turndown`; data-URL images are
  moved into the library; the old key is dropped.

## Tech

- **markdown-it** replaces marked (source line maps, plugin system).
- **CodeMirror 6 + markdown-it + plugins are vendored** into `vendor/editor-libs.js` by
  `tools/build-vendor.mjs` (esbuild, dev-only). The app stays build-free; React / Babel
  keep loading from CDN.
- Files: `app.jsx`, `markdown-pane.jsx`, `preview-pane.jsx`, `style-popover.jsx`,
  `paginate.js`, `dialect.js`, `library.js`, `syntax-help.js`, `demo.js`, `themes.js`.
- Favicon: inline SVG data URI.
- Not a target: narrow screens. Below ~900 px the panes stack behind a toggle.

## Phases

1. Scaffold — vendor bundle, favicon, file split, top bar, side-by-side panes.
2. Source-of-truth flip — markdown-it + dialect, `data-line`, migration, sync.
3. CodeMirror pane — highlighting, toolbar, autocomplete, hover help, reference.
4. Image library — IndexedDB, paste/drop, popover, resolution, seeded demo images.
5. Pagination and print — sheet model, `\pagebreak`, splitting, modes, print from sheets.
6. Style popovers — click-to-style, image attribute write-back, top-bar Theme / Page setup.
7. Demo article and polish — full-coverage demo, README, dead-code removal.

## Risks

- Layout must wait for `document.fonts.ready` or page breaks shift after first paint.
- Pagination cost on large documents: debounce; make incremental if needed.
- Table splitting (repeating header rows, rows taller than a page) is the fiddliest piece.

## Deviations from the plan, as built

- Code blocks are not colour-coded (highlight.js was dropped): a highlighted block cannot be
  split across pages cleanly, and print fidelity mattered more.
- `align=left` / `align=right` place a narrower figure at that side without wrapping text
  around it. Floats would put content outside the flow the paginator measures.
- Paragraphs move to the next page whole; there is no widow / orphan splitting yet.
- A `\pagebreak` on the last line leaves a blank trailing page, on purpose.
- The gutter glyph doubles as the "what is this line" affordance; hover help covers inline
  constructs. Both share the same content as the `/` menu and the reference panel.
