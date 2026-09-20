/* ============================================================
   Syntax help — the one list of everything the dialect can do.
   The insert toolbar, the "/" autocomplete, the hover / gutter help
   and the reference panel all read from this, so they never disagree.

   kind:  'prefix'   line-level; toggled by adding/removing `prefix`
          'wrap'     inline; wraps the selection in open/close
          'line'     a standalone line inserted on its own line
          'block'    a multi-line template inserted on its own lines
   ============================================================ */
window.SYNTAX = (() => {
  const G = { text: 'Text', headings: 'Headings', lists: 'Lists', blocks: 'Blocks', media: 'Media', layout: 'Layout' };
  const ITEMS = [
    { id: 'p',  group: G.text, kind: 'prefix', prefix: '', glyph: '¶', label: 'Body text', syntax: 'plain text', desc: 'A paragraph. Leave one blank line between paragraphs.', tool: 'Body' },
    { id: 'h1', group: G.headings, kind: 'prefix', prefix: '# ',    glyph: 'H1', label: 'Heading 1', syntax: '# Heading',    desc: 'The document title. Use once.', tool: 'H1' },
    { id: 'h2', group: G.headings, kind: 'prefix', prefix: '## ',   glyph: 'H2', label: 'Heading 2', syntax: '## Heading',   desc: 'A section.', tool: 'H2' },
    { id: 'h3', group: G.headings, kind: 'prefix', prefix: '### ',  glyph: 'H3', label: 'Heading 3', syntax: '### Heading',  desc: 'A sub-section.', tool: 'H3' },
    { id: 'h4', group: G.headings, kind: 'prefix', prefix: '#### ', glyph: 'H4', label: 'Heading 4', syntax: '#### Heading', desc: 'A minor heading.' },

    { id: 'bold',   group: G.text, kind: 'wrap', open: '**', close: '**', glyph: 'B', label: 'Bold',          syntax: '**bold**',   desc: 'Strong emphasis.', tool: 'bold', key: 'Mod-b' },
    { id: 'italic', group: G.text, kind: 'wrap', open: '*',  close: '*',  glyph: 'I', label: 'Italic',        syntax: '*italic*',   desc: 'Emphasis.', tool: 'italic', key: 'Mod-i' },
    { id: 'strike', group: G.text, kind: 'wrap', open: '~~', close: '~~', glyph: 'S', label: 'Strikethrough', syntax: '~~struck~~', desc: 'Crossed-out text.', tool: 'strike' },
    { id: 'code',   group: G.text, kind: 'wrap', open: '`',  close: '`',  glyph: '<>', label: 'Inline code',  syntax: '`code`',     desc: 'Monospace, inline.' },
    { id: 'link',   group: G.text, kind: 'wrap', open: '[',  close: '](https://)', glyph: '🔗', label: 'Link', syntax: '[text](https://…)', desc: 'A hyperlink. Printed links keep their colour but are not clickable on paper.', tool: 'link', key: 'Mod-k' },
    { id: 'br',     group: G.text, kind: 'wrap', open: '', close: '\\', glyph: '↵', label: 'Line break', syntax: 'text\\', desc: 'A backslash at the very end of a line breaks the line without starting a new paragraph. Two trailing spaces do the same.' },
    { id: 'footnote', group: G.text, kind: 'wrap', open: '', close: '[^1]', glyph: '¹', label: 'Footnote', syntax: '[^1] … [^1]: note', desc: 'A numbered reference. Put the note itself on its own line anywhere: `[^1]: The note.` Notes are collected at the end of the document.', after: '\n\n[^1]: ' },

    { id: 'ul',   group: G.lists, kind: 'prefix', prefix: '- ',     glyph: '•',  label: 'Bullet list',   syntax: '- item',       desc: 'One item per line. Indent two spaces to nest.', tool: 'bullet' },
    { id: 'ol',   group: G.lists, kind: 'prefix', prefix: '1. ',    glyph: '1.', label: 'Numbered list', syntax: '1. item',      desc: 'Numbers renumber themselves; `1.` on every line is fine.', tool: 'ordered' },
    { id: 'task', group: G.lists, kind: 'prefix', prefix: '- [ ] ', glyph: '☐',  label: 'Task list',     syntax: '- [ ] to do', desc: '`- [x]` for a ticked box.' },

    { id: 'quote', group: G.blocks, kind: 'prefix', prefix: '> ', glyph: '❝', label: 'Quote', syntax: '> quoted', desc: 'A block quotation. Every line of it starts with `>`.', tool: 'quote' },
    { id: 'fence', group: G.blocks, kind: 'block', template: '```\n$0\n```', glyph: '{ }', label: 'Code block', syntax: '```\ncode\n```', desc: 'Verbatim, monospace. A language name after the opening fence (```js) is kept for readers but not colour-coded in print.' },
    { id: 'table', group: G.blocks, kind: 'block', template: '| Column | Column | Column |\n|---|---|---|\n| $0 |  |  |\n|  |  |  |', glyph: '▦', label: 'Table', syntax: '| a | b |\n|---|---|\n| 1 | 2 |', desc: 'Header row, a `|---|` separator, then rows. Use `|:--|` / `|--:|` / `|:-:|` in the separator to align a column left / right / centre. Long tables continue onto the next page with the header repeated.', tool: 'table' },
    { id: 'hr',    group: G.blocks, kind: 'line', line: '---', glyph: '—', label: 'Rule', syntax: '---', desc: 'A horizontal rule.' },

    { id: 'image', group: G.media, kind: 'block', template: '![$0](name "Figure 1. Caption")', glyph: '🖼', label: 'Image', syntax: '![alt](name "Caption")', desc: 'An image from the library, by name. The quoted title becomes the caption (it may contain *markdown*). Paste or drop an image anywhere to add it to the library and insert its name here.', tool: 'image' },
    { id: 'imageAttrs', group: G.media, kind: 'wrap', open: '', close: '{width=50% align=right}', glyph: '⇔', label: 'Image size & alignment', syntax: '![…](name "…"){width=50% align=right}', desc: 'Directly after an image: `width=` 25%–100%, `align=` left, center or right. The style popover in the preview writes these for you.' },

    { id: 'pagebreak', group: G.layout, kind: 'line', line: '\\pagebreak', glyph: '⤓', label: 'Page break', syntax: '\\pagebreak', desc: 'Everything after this line starts on a new page.', tool: 'pagebreak' },
    { id: 'vspace',    group: G.layout, kind: 'line', line: '\\', glyph: '␣', label: 'Blank line', syntax: '\\  ·  \\vspace 3', desc: 'A backslash alone on a line leaves one blank line of space. Repeat it for more, or write `\\vspace 3` for three. Space that would fall at the very end of a page is dropped.', tool: 'vspace' },
    { id: 'vspaceN',   group: G.layout, kind: 'line', line: '\\vspace 3', glyph: '␣₃', label: 'Vertical space', syntax: '\\vspace 3', desc: 'Three blank lines of space (any number from 1 to 99).', hidden: true },
  ];
  const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
  const GROUPS = [G.headings, G.text, G.lists, G.blocks, G.media, G.layout].map((g) => ({ label: g, items: ITEMS.filter((i) => i.group === g && !i.hidden) }));

  /* what block a source line is, from its text alone */
  function detectLine(text) {
    const t = text || '';
    if (/^\\pagebreak\s*$/.test(t)) return 'pagebreak';
    if (/^\\vspace(\s+\d+)?\s*$/.test(t)) return 'vspaceN';
    if (/^\\\s*$/.test(t)) return 'vspace';
    const h = /^(#{1,6})\s/.exec(t);
    if (h) return h[1].length <= 4 ? 'h' + h[1].length : 'h4';
    if (/^\s*[-*+]\s+\[[ xX]\]\s/.test(t)) return 'task';
    if (/^\s*[-*+]\s+/.test(t)) return 'ul';
    if (/^\s*\d+[.)]\s+/.test(t)) return 'ol';
    if (/^\s*>\s?/.test(t)) return 'quote';
    if (/^\s*```/.test(t) || /^\s*~~~/.test(t)) return 'fence';
    if (/^\s*\|.*\|\s*$/.test(t)) return 'table';
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(t)) return 'hr';
    if (/^\s*!\[[^\]]*\]\([^)]*\)/.test(t)) return 'image';
    if (/^\s*\[\^[^\]]+\]:/.test(t)) return 'footnote';
    if (!t.trim()) return null;
    return 'p';
  }
  /* the line-prefix items a line can be switched between */
  const SWITCHABLE = ['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'task', 'quote'];
  const PREFIX_RE = /^(\s*)(#{1,6}\s+|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+|>\s?)?/;

  return { ITEMS, byId, GROUPS, detectLine, SWITCHABLE, PREFIX_RE };
})();
