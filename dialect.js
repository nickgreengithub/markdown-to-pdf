/* ============================================================
   Dialect — the Markdown the app understands, and how it renders.

   CommonMark + GFM tables / strikethrough / task lists, plus:
     \pagebreak                       force a new page
     \                                one blank line of vertical space (repeatable)
     \vspace 3                        three lines of vertical space
     ![alt](name "Caption *md*")      a library image; the title is the caption
     ![alt](name "…"){width=50% align=right}
     [^1] … [^1]: …                   footnotes

   Every block-level element carries data-line (0-based source line of its
   first line) and data-line-end, which the preview uses to link a rendered
   block back to its source and vice versa.

   This file has no DOM dependencies so it can be unit-tested in node:
   it only needs `markdownit` and `markdownitFootnote` on the global.
   ============================================================ */
(function (root) {
  const MarkdownIt = root.markdownit;
  const footnote = root.markdownitFootnote;

  const DIRECTIVE_RE = /^\\(pagebreak|vspace(?:\s+(\d{1,2}))?|)\s*$/;

  /* ---- \pagebreak, \vspace N and a lone "\" as block-level directives ---- */
  function directiveRule(state, startLine, endLine, silent) {
    if (state.sCount[startLine] - state.blkIndent >= 4) return false; // indented code
    const pos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    if (state.src.charCodeAt(pos) !== 0x5c /* \ */) return false;
    const m = DIRECTIVE_RE.exec(state.src.slice(pos, max));
    if (!m) return false;
    if (silent) return true;
    const token = state.push('directive', 'div', 0);
    token.map = [startLine, startLine + 1];
    token.block = true;
    if (m[1] === 'pagebreak') token.meta = { kind: 'pagebreak' };
    else token.meta = { kind: 'vspace', n: m[2] ? Math.max(1, parseInt(m[2], 10)) : 1 };
    state.line = startLine + 1;
    return true;
  }
  function renderDirective(tokens, idx) {
    const t = tokens[idx];
    const line = t.map ? ` data-line="${t.map[0]}" data-line-end="${t.map[1]}"` : '';
    if (t.meta.kind === 'pagebreak') return `<div class="pagebreak"${line}></div>\n`;
    return `<div class="vspace" style="--n:${t.meta.n}"${line}></div>\n`;
  }

  /* ---- ![alt](src "title"){width=50% align=right} ---- */
  const ATTR_RE = /^\{([^}]*)\}/;
  function parseAttrs(s) {
    const out = {};
    s.trim().split(/\s+/).forEach((kv) => {
      const i = kv.indexOf('=');
      if (i > 0) out[kv.slice(0, i)] = kv.slice(i + 1).replace(/^"|"$/g, '');
    });
    return out;
  }
  function imageAttrsRule(state) {
    state.tokens.forEach((blk) => {
      if (blk.type !== 'inline' || !blk.children) return;
      const ch = blk.children;
      for (let i = 0; i < ch.length - 1; i++) {
        if (ch[i].type !== 'image' || ch[i + 1].type !== 'text') continue;
        const m = ATTR_RE.exec(ch[i + 1].content);
        if (!m) continue;
        const attrs = parseAttrs(m[1]);
        ch[i].meta = Object.assign({}, ch[i].meta, { attrs, attrSrc: m[0] });
        ch[i + 1].content = ch[i + 1].content.slice(m[0].length);
        if (!ch[i + 1].content) { ch.splice(i + 1, 1); }
      }
    });
  }

  /* ---- a paragraph that is only an image becomes a <figure> ---- */
  function figureRule(state) {
    const T = state.tokens;
    for (let i = 0; i + 2 < T.length; i++) {
      if (T[i].type !== 'paragraph_open' || T[i + 1].type !== 'inline' || T[i + 2].type !== 'paragraph_close') continue;
      const ch = T[i + 1].children || [];
      const solid = ch.filter((c) => !(c.type === 'text' && !c.content.trim()) && c.type !== 'softbreak');
      if (solid.length !== 1 || solid[0].type !== 'image') continue;
      const img = solid[0];
      T[i].tag = 'figure'; T[i + 2].tag = 'figure';
      T[i].type = 'figure_open'; T[i + 2].type = 'figure_close';
      img.meta = Object.assign({}, img.meta, { figure: true });
      const a = (img.meta && img.meta.attrs) || {};
      const cls = ['figure'];
      if (a.align === 'left' || a.align === 'right') cls.push('align-' + a.align);
      T[i].attrJoin('class', cls.join(' '));
      if (a.width) T[i].attrSet('style', `--fig-width:${a.width}`);
      if (T[i + 1].children.length !== 1) T[i + 1].children = [img];
    }
  }

  /* ---- "- [ ] task" / "- [x] done" ---- */
  function taskListRule(state) {
    const T = state.tokens;
    for (let i = 2; i < T.length; i++) {
      if (T[i].type !== 'inline' || T[i - 1].type !== 'paragraph_open' || T[i - 2].type !== 'list_item_open') continue;
      const ch = T[i].children;
      if (!ch || !ch.length || ch[0].type !== 'text') continue;
      const m = /^\[([ xX])\]\s+/.exec(ch[0].content);
      if (!m) continue;
      ch[0].content = ch[0].content.slice(m[0].length);
      const box = new state.Token('html_inline', '', 0);
      box.content = `<input type="checkbox" disabled${m[1] === ' ' ? '' : ' checked'}> `;
      ch.unshift(box);
      T[i - 2].attrJoin('class', 'task-list-item');
      // mark the enclosing list
      for (let j = i - 3; j >= 0; j--) {
        if (T[j].type === 'bullet_list_open' && T[j].level === T[i - 2].level - 1) {
          if (!/contains-task-list/.test(T[j].attrGet('class') || '')) T[j].attrJoin('class', 'contains-task-list');
          break;
        }
      }
    }
  }

  /* ---- data-line on every block that has a source map ---- */
  function lineMapRule(state) {
    state.tokens.forEach((t) => {
      if (!t.map || !t.block || t.hidden) return;
      if (t.nesting === -1) return;
      if (t.type === 'inline') return;
      t.attrSet('data-line', String(t.map[0]));
      t.attrSet('data-line-end', String(t.map[1]));
    });
  }

  function make(opts) {
    const o = Object.assign({ resolveImage: (src) => src }, opts || {});
    const md = new MarkdownIt({ html: false, linkify: false, typographer: false, breaks: false });
    if (footnote) md.use(footnote);
    md.block.ruler.before('paragraph', 'directive', directiveRule, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
    md.core.ruler.push('image_attrs', imageAttrsRule);
    md.core.ruler.push('task_lists', taskListRule);
    md.core.ruler.push('figures', figureRule);
    md.core.ruler.push('line_map', lineMapRule);
    md.renderer.rules.directive = renderDirective;
    // captions render with a plain instance: the footnote plugin's tail rule
    // would otherwise dump the footnote list into every caption
    const capMd = new MarkdownIt({ html: false, breaks: false });

    md.renderer.rules.image = (tokens, idx, options, env, self) => {
      const t = tokens[idx];
      const src = t.attrGet('src') || '';
      const alt = self.renderInlineAsText(t.children || [], options, env);
      const title = t.attrGet('title');
      const a = (t.meta && t.meta.attrs) || {};
      const url = o.resolveImage(src);
      const inFigure = !!(t.meta && t.meta.figure);
      let html;
      if (url) {
        const style = !inFigure && a.width ? ` style="width:${md.utils.escapeHtml(a.width)}"` : '';
        html = `<img src="${md.utils.escapeHtml(url)}" alt="${md.utils.escapeHtml(alt)}" data-src="${md.utils.escapeHtml(src)}"${style}>`;
      } else {
        html = `<span class="img-missing" data-src="${md.utils.escapeHtml(src)}"><b>${md.utils.escapeHtml(src || 'image')}</b> is not in the image library</span>`;
      }
      if (inFigure && title) html += `<figcaption>${capMd.renderInline(title)}</figcaption>`;
      return html;
    };
    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const t = tokens[idx];
      const info = t.info ? md.utils.unescapeAll(t.info).trim().split(/\s+/)[0] : '';
      const attrs = self.renderAttrs(t);
      const lang = info ? ` class="language-${md.utils.escapeHtml(info)}"` : '';
      return `<pre${attrs}><code${lang}>${md.utils.escapeHtml(t.content)}</code></pre>\n`;
    };
    md.renderer.rules.code_block = (tokens, idx, options, env, self) => {
      const t = tokens[idx];
      return `<pre${self.renderAttrs(t)}><code>${md.utils.escapeHtml(t.content)}</code></pre>\n`;
    };

    return {
      md,
      render: (src) => md.render(String(src || '')),
      /* the image references a document makes: [{name, line}] */
      images: (src) => {
        const out = [];
        md.parse(String(src || ''), {}).forEach((t) => {
          if (t.type !== 'inline' || !t.children) return;
          t.children.forEach((c) => { if (c.type === 'image') out.push({ name: c.attrGet('src'), line: t.map ? t.map[0] : -1 }); });
        });
        return out;
      },
    };
  }

  /* Rewrite the {…} attributes of the image `name` on source line `line`
     (0-based). Returns the new line text, or null if no such image there. */
  function setImageAttrs(lineText, name, attrs) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(!\\[[^\\]]*\\]\\(\\s*${esc}(?:\\s+"[^"]*")?\\s*\\))(\\{[^}]*\\})?`);
    const m = re.exec(lineText);
    if (!m) return null;
    const cur = m[2] ? parseAttrs(m[2].slice(1, -1)) : {};
    const next = Object.assign({}, cur, attrs);
    Object.keys(next).forEach((k) => { if (next[k] == null || next[k] === '') delete next[k]; });
    const s = Object.keys(next).map((k) => `${k}=${next[k]}`).join(' ');
    return lineText.slice(0, m.index) + m[1] + (s ? `{${s}}` : '') + lineText.slice(m.index + m[0].length);
  }
  function getImageAttrs(lineText, name) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`!\\[[^\\]]*\\]\\(\\s*${esc}(?:\\s+"[^"]*")?\\s*\\)(\\{[^}]*\\})?`);
    const m = re.exec(lineText);
    if (!m) return null;
    return m[1] ? parseAttrs(m[1].slice(1, -1)) : {};
  }

  root.Dialect = { make, setImageAttrs, getImageAttrs, parseAttrs, DIRECTIVE_RE };
})(typeof window !== 'undefined' ? window : globalThis);
