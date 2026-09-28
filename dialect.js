/* ============================================================
   Dialect — the Markdown the app understands, and how it renders.

   CommonMark + GFM tables / strikethrough / task lists, plus:
     \pagebreak                       force a new page
     \                                one blank line of vertical space (repeatable)
     \vspace 3                        three lines of vertical space
     \toc                             a table of contents of the headings after it
     Table: Caption                   next to a table, a caption for it
     ## Heading {-}                   a heading left out of automatic numbering
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

  const DIRECTIVE_RE = /^\\(pagebreak|toc|vspace(?:\s+(\d{1,2}))?|)\s*$/;

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
    else if (m[1] === 'toc') token.meta = { kind: 'toc' };
    else token.meta = { kind: 'vspace', n: m[2] ? Math.max(1, parseInt(m[2], 10)) : 1 };
    state.line = startLine + 1;
    return true;
  }
  const escH = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function renderDirective(tokens, idx, options, env) {
    const t = tokens[idx];
    const line = t.map ? ` data-line="${t.map[0]}" data-line-end="${t.map[1]}"` : '';
    if (t.meta.kind === 'pagebreak') return `<div class="pagebreak"${line}></div>\n`;
    if (t.meta.kind === 'toc') {
      // the headings that follow the directive, H1–H3; page numbers are filled in after pagination
      const after = ((env && env.headings) || []).filter((h) => h.line > t.map[0] && h.level <= 3);
      if (!after.length) return `<div class="toc toc-empty"${line}>Contents: add headings below this line</div>\n`;
      const top = Math.min(...after.map((h) => h.level));
      const items = after.map((h) => `<li class="toc-l${h.level} toc-d${h.level - top}"><span class="toc-t">${h.num ? `<span class="toc-n">${h.num}</span>` : ''}${escH(h.text)}</span><span class="toc-dots"></span><span class="toc-pg" data-sec="${h.line}"></span></li>`).join('');
      return `<ul class="toc"${line}>${items}</ul>\n`;
    }
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

  /* ---- headings: data-sec (for the contents), optional numbers ----
     env.numbering: 'h1' numbers from Heading 1 (1, 1.1, …), 'h2' leaves
     Heading 1 as a title and numbers from Heading 2; anything else, none. */
  const UNNUM_RE = /\s*\{(?:-|\.unnumbered)\}\s*$/;
  function headingRule(state) {
    const env = state.env || {};
    const from = env.numbering === 'h1' ? 1 : env.numbering === 'h2' ? 2 : 0;
    const count = [0, 0, 0, 0, 0, 0, 0];
    const list = [];
    const T = state.tokens;
    for (let i = 0; i < T.length; i++) {
      const t = T[i];
      if (t.type !== 'heading_open' || t.level !== 0 || !t.map) continue;
      const lvl = Math.min(4, +t.tag.slice(1));
      const inl = T[i + 1];
      let num = '';
      // the heading that titles a \toc ("## Contents" right above it) is not numbered
      const titlesToc = T[i + 3] && T[i + 3].type === 'directive' && T[i + 3].meta && T[i + 3].meta.kind === 'toc';
      // Pandoc's "## Appendix {-}" (or {.unnumbered}): never numbered
      let unnumbered = false;
      const tail = inl && inl.children && inl.children[inl.children.length - 1];
      if (tail && tail.type === 'text' && UNNUM_RE.test(tail.content)) { tail.content = tail.content.replace(UNNUM_RE, ''); unnumbered = true; }
      const text = inl && inl.children ? inl.children.filter((c) => c.type === 'text' || c.type === 'code_inline').map((c) => c.content).join('') : (inl ? inl.content : '');
      if (from && lvl >= from && !titlesToc && !unnumbered) {
        count[lvl]++;
        for (let k = lvl + 1; k < count.length; k++) count[k] = 0;
        num = count.slice(from, lvl + 1).map((n) => n || 1).join('.');
        if (inl && inl.children) {
          const sp = new state.Token('html_inline', '', 0);
          sp.content = `<span class="hnum">${num}</span>`;
          inl.children.unshift(sp);
        }
      }
      t.attrSet('data-sec', String(t.map[0]));
      list.push({ level: lvl, text, num, line: t.map[0] });
    }
    env.headings = list;
  }

  /* ---- "Table: Caption" in a paragraph right before or after a table ---- */
  const TCAP_RE = /^(?:Table)?:\s+/;
  function tableCaptionRule(state) {
    const T = state.tokens;
    for (let i = 0; i + 2 < T.length; i++) {
      if (T[i].type !== 'paragraph_open' || T[i].level !== 0 || T[i + 1].type !== 'inline' || T[i + 2].type !== 'paragraph_close') continue;
      const ch = T[i + 1].children || [];
      if (!ch.length || ch[0].type !== 'text' || !TCAP_RE.test(ch[0].content)) continue;
      const before = T[i + 3] && T[i + 3].type === 'table_open';
      const after = i > 0 && T[i - 1].type === 'table_close';
      if (!before && !after) continue;
      ch[0].content = ch[0].content.replace(TCAP_RE, '');
      T[i].attrJoin('class', 'tcap ' + (before ? 'tcap-above keep-next' : 'tcap-below'));
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
    md.core.ruler.push('headings', headingRule);
    md.core.ruler.push('table_captions', tableCaptionRule);
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
      render: (src, env) => md.render(String(src || ''), Object.assign({}, env || {})),
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
