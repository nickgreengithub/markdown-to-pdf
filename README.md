# Markdown Studio

A minimalist, browser-only WYSIWYG Markdown editor that renders to a print-ready A4
page. Open a `.md` file, style it with live theme controls, and export to PDF (via
the browser's Print dialog) or HTML — all client-side, no build step, no backend.

## Features

- WYSIWYG editing on an A4 canvas with live page-break guides
- `RAW` (Markdown) / `CSS` (theme variables) / `DOC` (themed editor) views
- Rich theming: fonts, per-heading styles, colors, page margins, element styles
- Open `.md` / `.zip` (with images) and Save `.md` / `.zip`
- Paste or insert images (embedded while editing, bundled into a zip on save)
- Per-image sizing (½ / ¾ / Full) and alignment
- Print / Export to PDF with correct per-page margins and no browser stamps

## Running locally

It's a static site. Any static file server works; a no-cache helper is included:

```bash
python3 serve.py
# then open http://127.0.0.1:8765
```

## Deploying

The app is plain static files (`index.html` plus `editor.jsx`, `editor.css`,
`doc.css`, `themes.js`, `sample.js`). JSX is compiled in the browser via Babel,
so it can be served directly from GitHub Pages with no build step.
