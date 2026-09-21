# Markdown Studio

A browser-only Markdown editor that renders onto real A4 pages and prints to PDF.
Write on the left, see the pages on the right, click anything on a page to style it.
No build step, no backend, no accounts: everything stays in your browser.

## What it does

- **Markdown pane** (CodeMirror 6): syntax colouring with the raw marks kept raw. Type `/`
  at the start of a line for the block menu (Suggested on top, filter as you type), or
  click the `+` that appears beside the current line to change what that line is. Hover
  any construct for help. Lines that reference an image show a thumbnail beneath them.
- **Preview pane**: the document paginated onto A4 sheets, live. Single, two-up and grid
  views; zoom or fit-to-width. Tables continue across pages with the header repeated;
  lists and code blocks split at items and lines; a heading is never left at the bottom
  of a page. The caret's block is outlined and kept in view; clicking a block moves the
  caret to its source.
- **Print = preview**: the PDF is made from the very sheets you see, so a page break in
  the preview is a page break on paper. Running header and footer on every page, with
  `{page}` and `{pages}`.
- **Styling**: the left pane's THEME tab holds the theme picker and every control —
  page, each heading level, body text, lists, quote, code, table, rule, images, captions,
  links, footnotes, colours — all on one page, grouped like the block menu. Click an
  element on the page and its section scrolls into view. Four themes.
- **Images**: paste or drop an image anywhere; it is stored in your browser under a short
  name and `![](name)` lands at the caret, with a thumbnail under the line. Add a quoted
  title for the caption. Nothing to manage; "Remove unused images" lives in the Document
  menu.
- **Persistence**: cache only — the markdown and your style choices live in
  `localStorage`, images in IndexedDB. Nothing is uploaded or saved anywhere else.

## The dialect

CommonMark + GFM tables, strikethrough and task lists, plus:

| Write | Meaning |
|---|---|
| `\pagebreak` | Force a new page |
| `\` alone on a line | One blank line of vertical space; repeat for more |
| `\vspace 3` | Three blank lines of vertical space |
| `text\` at the end of a line | A line break without a new paragraph |
| `![alt](name "Figure 2. Caption")` | An image from the library; the title is the caption (inline markdown allowed) |
| `![alt](name "…"){width=50% align=right}` | Width and alignment — the style popover writes these for you |
| `[^1]` … `[^1]: note` | Footnotes, collected at the end |

**New document** offers a blank page, a demo article that uses every element, and a
sample résumé with its own compact theme.

## Running locally

It's a static site. Any static file server works; a no-cache helper is included:

```bash
python3 serve.py
# then open http://127.0.0.1:8765
```

## Files

| File | Role |
|---|---|
| `index.html` | Loads everything; React and Babel from a CDN, JSX compiled in the browser |
| `app.jsx` | Top bar, split layout, persistence, print, image library dialog |
| `markdown-pane.jsx` | The CodeMirror editor, toolbar, help, autocomplete |
| `preview-pane.jsx` | Sheets, view modes, click-to-source, scroll sync |
| `style-popover.jsx` | Per-element style controls |
| `dialect.js` | markdown-it pipeline: directives, captions, image attributes, footnotes, source-line maps |
| `paginate.js` | Lays rendered blocks onto A4 sheets, splitting where allowed |
| `library.js` | The IndexedDB image store |
| `syntax-help.js` | The single list of constructs the toolbar, autocomplete, help and reference share |
| `themes.js` | Fonts, themes, and the CSS-variable model behind every style control |
| `demo.js` | The demo article and its figures |
| `doc.css` / `editor.css` | Document typography and print / app chrome |
| `vendor/editor-libs.js` | CodeMirror 6 + markdown-it, bundled once by `tools/build-vendor.mjs` |

To update the vendored editor libraries: `cd tools && npm install && npm run build`, then
commit `vendor/editor-libs.js`. The app itself never runs a build.

The design and its reasoning are in [`docs/REDESIGN.md`](docs/REDESIGN.md).

## Deploying

Plain static files — serve the repository root from GitHub Pages or any web server.
