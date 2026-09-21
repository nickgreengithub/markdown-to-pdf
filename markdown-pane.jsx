/* global React, CM, SYNTAX, Library */
/* ============================================================
   Markdown pane — the only place the document is edited.

   CodeMirror 6 with:
   - markdown syntax colouring (the raw marks stay raw)
   - "/" at the start of a line opens the block menu in the body:
     sectioned, scrollable, filtered as you type, Suggested on top
   - a "+" handle on the active line opens the same menu for that line
   - "\" completes the layout directives
   - hover help on any construct, with "change to…" for line-level ones
   - a thumbnail under every line that references an image
   - paste / drop of image files handed to the app
   ============================================================ */
const { useEffect: useEffectMP, useRef: useRefMP } = React;

/* ---------- editor actions (pure functions of the view) ---------- */
const MD = (() => {
  const { EditorSelection } = CM;
  const lineOf = (state, pos) => state.doc.lineAt(pos);

  /* replace the block prefix of every selected line with the item's */
  function setLinePrefix(view, item) {
    const { state } = view;
    const changes = [];
    const seen = new Set();
    let allAlready = true;
    for (const r of state.selection.ranges) {
      const a = lineOf(state, r.from).number, b = lineOf(state, r.to).number;
      for (let n = a; n <= b; n++) {
        if (seen.has(n)) continue; seen.add(n);
        const line = state.doc.line(n);
        if (SYNTAX.detectLine(line.text) !== item.id) allAlready = false;
      }
    }
    seen.forEach((n) => {
      const line = state.doc.line(n);
      const m = SYNTAX.PREFIX_RE.exec(line.text);
      const indent = m ? m[1] : '';
      const cur = m && m[2] ? m[2] : '';
      const next = allAlready ? '' : item.prefix; // toggle off when every line already is this
      changes.push({ from: line.from, to: line.from + indent.length + cur.length, insert: indent + next });
    });
    view.dispatch({ changes, scrollIntoView: true });
    view.focus();
  }
  /* wrap the selection (or insert an empty pair) */
  function wrap(view, item) {
    const { state } = view;
    const tr = state.changeByRange((r) => {
      const sel = state.sliceDoc(r.from, r.to);
      const o = item.open, c = item.close;
      // already wrapped? unwrap
      if (o && sel.startsWith(o) && sel.endsWith(c) && sel.length >= o.length + c.length) {
        const inner = sel.slice(o.length, sel.length - c.length);
        return { changes: { from: r.from, to: r.to, insert: inner }, range: EditorSelection.range(r.from, r.from + inner.length) };
      }
      const before = state.sliceDoc(Math.max(0, r.from - o.length), r.from), after = state.sliceDoc(r.to, r.to + c.length);
      if (o && before === o && after === c) {
        return { changes: [{ from: r.from - o.length, to: r.from }, { from: r.to, to: r.to + c.length }], range: EditorSelection.range(r.from - o.length, r.to - o.length) };
      }
      if (item.id === 'link') {
        const text = sel || 'text';
        const ins = `[${text}](https://)`;
        const urlAt = r.from + text.length + 3;
        return { changes: { from: r.from, to: r.to, insert: ins }, range: EditorSelection.range(urlAt, urlAt + 8) };
      }
      if (item.id === 'footnote') {
        // next free footnote number in the document
        let n = 1; const used = new Set(); const re = /\[\^(\d+)\]/g; let m;
        const src = state.doc.toString();
        while ((m = re.exec(src))) used.add(+m[1]);
        while (used.has(n)) n++;
        const ref = `[^${n}]`;
        const end = state.doc.length;
        const tail = (src.endsWith('\n') ? '' : '\n') + `\n[^${n}]: `;
        return { changes: [{ from: r.to, insert: ref }, { from: end, insert: tail }], range: EditorSelection.cursor(end + tail.length + ref.length) };
      }
      if (item.id === 'br') {
        const line = lineOf(state, r.to);
        return { changes: { from: line.to, insert: '\\\n' }, range: EditorSelection.cursor(line.to + 2) };
      }
      if (!sel) {
        const ins = o + c;
        return { changes: { from: r.from, insert: ins }, range: EditorSelection.cursor(r.from + o.length) };
      }
      return { changes: { from: r.from, to: r.to, insert: o + sel + c }, range: EditorSelection.range(r.from + o.length, r.from + o.length + sel.length) };
    });
    view.dispatch(tr, { scrollIntoView: true });
    view.focus();
  }
  /* insert text on its own line(s); $0 marks the caret */
  function insertBlock(view, text) {
    const { state } = view;
    const r = state.selection.main;
    const line = lineOf(state, r.from);
    const prevBlank = line.number === 1 || !state.doc.line(line.number - 1).text.trim();
    const nextBlank = line.number === state.doc.lines || !state.doc.line(line.number + 1).text.trim();
    const onEmpty = !line.text.trim();
    const lead = onEmpty ? (prevBlank ? '' : '\n') : (line.text.trim() ? '\n\n' : '\n');
    const from = onEmpty ? line.from : line.to;
    let ins = lead + text;
    const isLine = !text.includes('\n') && !text.includes('$0');
    const tailBlank = isLine ? '' : '\n';
    ins += (nextBlank ? '' : '\n') + tailBlank;
    const caret = ins.indexOf('$0');
    const clean = ins.replace('$0', '');
    const to = onEmpty ? line.to : line.to;
    const cursor = caret >= 0 ? from + caret : from + clean.length;
    view.dispatch({ changes: { from, to, insert: clean }, selection: EditorSelection.cursor(cursor), scrollIntoView: true });
    view.focus();
  }
  function apply(view, item) {
    if (!item) return;
    if (item.kind === 'prefix') return setLinePrefix(view, item);
    if (item.kind === 'wrap') return wrap(view, item);
    if (item.kind === 'line') return insertBlock(view, item.line);
    if (item.kind === 'block') return insertBlock(view, item.template);
  }
  /* insert plain text at the caret (image references) */
  function insertAtCaret(view, text, own) {
    if (own) return insertBlock(view, text);
    const r = view.state.selection.main;
    view.dispatch({ changes: { from: r.from, to: r.to, insert: text }, selection: EditorSelection.cursor(r.from + text.length), scrollIntoView: true });
    view.focus();
  }
  return { apply, setLinePrefix, wrap, insertBlock, insertAtCaret };
})();

/* ---------- help content (tooltip + gutter popover share it) ---------- */
function helpDOM(view, itemId, lineNo) {
  const it = SYNTAX.byId[itemId];
  if (!it) return null;
  const box = document.createElement('div');
  box.className = 'cm-help';
  const h = document.createElement('div'); h.className = 'cm-help-title';
  h.innerHTML = `<span class="cm-help-glyph">${it.glyph}</span>${it.label}`;
  box.appendChild(h);
  const s = document.createElement('code'); s.className = 'cm-help-syntax'; s.textContent = it.syntax; box.appendChild(s);
  const d = document.createElement('div'); d.className = 'cm-help-desc';
  d.innerHTML = it.desc.replace(/`([^`]+)`/g, '<code>$1</code>');
  box.appendChild(d);
  if (lineNo != null && (SYNTAX.SWITCHABLE.includes(itemId))) {
    const row = document.createElement('div'); row.className = 'cm-help-switch';
    const lab = document.createElement('span'); lab.textContent = 'Change to'; row.appendChild(lab);
    SYNTAX.SWITCHABLE.filter((id) => id !== itemId).forEach((id) => {
      const b = document.createElement('button');
      const o = SYNTAX.byId[id];
      b.textContent = o.glyph; b.title = o.label;
      b.onmousedown = (e) => {
        e.preventDefault();
        const line = view.state.doc.line(lineNo + 1);
        view.dispatch({ selection: { anchor: line.from } });
        MD.setLinePrefix(view, o);
      };
      row.appendChild(b);
    });
    box.appendChild(row);
  }
  return box;
}

/* which construct is at a position: line-level first, then the syntax tree */
const INLINE_NODE = { StrongEmphasis: 'bold', Emphasis: 'italic', Strikethrough: 'strike', InlineCode: 'code', Link: 'link', Image: 'image', URL: 'link', FencedCode: 'fence', CodeBlock: 'fence', Table: 'table', HorizontalRule: 'hr', Blockquote: 'quote' };
function constructAt(view, pos) {
  const line = view.state.doc.lineAt(pos);
  const lineKind = SYNTAX.detectLine(line.text);
  let node = CM.syntaxTree(view.state).resolveInner(pos, 1);
  while (node) {
    const id = INLINE_NODE[node.name];
    if (id && (id !== 'quote' && id !== 'table' && id !== 'fence' && id !== 'hr')) return { id, from: node.from, to: node.to };
    node = node.parent;
  }
  if (/\[\^[^\]]+\]/.test(line.text)) {
    const re = /\[\^[^\]]+\](?::)?/g; let m;
    while ((m = re.exec(line.text))) if (pos >= line.from + m.index && pos <= line.from + m.index + m[0].length) return { id: 'footnote', from: line.from + m.index, to: line.from + m.index + m[0].length };
  }
  if (/\{[^}]*\}/.test(line.text)) {
    const re = /\{[^}]*\}/g; let m;
    while ((m = re.exec(line.text))) if (pos >= line.from + m.index && pos <= line.from + m.index + m[0].length) return { id: 'imageAttrs', from: line.from + m.index, to: line.from + m.index + m[0].length };
  }
  if (lineKind && lineKind !== 'p') return { id: lineKind, from: line.from, to: line.to, line: line.number - 1 };
  return null;
}

/* the block menu: sections in display order; Suggested first, everything once */
const MENU = [
  ['Suggested', ['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'image', 'pagebreak']],
  ['Blocks',    ['h4', 'quote', 'fence', 'table', 'hr', 'task', 'vspace', 'footnote']],
  ['Text',      ['bold', 'italic', 'strike', 'code', 'link', 'br', 'imageAttrs']],
];
const libTick = CM.StateEffect.define();

function buildExtensions({ onDocChange, onCaret, onImageFiles }) {
  const { EditorView, keymap, drawSelection, highlightActiveLine, highlightActiveLineGutter, Decoration, ViewPlugin, WidgetType, hoverTooltip, placeholder, gutter, GutterMarker,
    defaultKeymap, history, historyKeymap, indentWithTab, markdown, markdownLanguage, syntaxHighlighting, HighlightStyle, autocompletion, completionKeymap, startCompletion,
    searchKeymap, highlightSelectionMatches, tags: t, Prec } = CM;

  const style = HighlightStyle.define([
    { tag: t.heading1, fontWeight: '700', fontSize: '1.25em', color: 'var(--md-head)' },
    { tag: t.heading2, fontWeight: '700', fontSize: '1.15em', color: 'var(--md-head)' },
    { tag: t.heading3, fontWeight: '700', fontSize: '1.05em', color: 'var(--md-head)' },
    { tag: [t.heading4, t.heading5, t.heading6], fontWeight: '700', color: 'var(--md-head)' },
    { tag: t.strong, fontWeight: '700' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through', color: 'var(--md-muted)' },
    { tag: t.monospace, color: 'var(--md-code)', background: 'var(--md-code-bg)', borderRadius: '3px' },
    { tag: t.processingInstruction, color: 'var(--md-mark)', fontWeight: '600' },
    { tag: t.url, color: 'var(--md-muted)', textDecoration: 'underline', textDecorationColor: 'var(--md-rule)' },
    { tag: t.link, color: 'var(--md-link)' },
    { tag: t.quote, color: 'var(--md-quote)', fontStyle: 'italic' },
    { tag: t.contentSeparator, color: 'var(--md-mark)', fontWeight: '700' },
    { tag: t.atom, color: 'var(--md-mark)' },
    { tag: t.escape, color: 'var(--md-mark)' },
    { tag: t.labelName, color: 'var(--md-mark)' },
  ]);

  /* which lines are inside a fenced code block */
  let inFenceCache = { doc: null, lines: null };
  const fenceLines = (state) => {
    if (inFenceCache.doc === state.doc) return inFenceCache.lines;
    const set = new Set(); let open = false;
    for (let i = 1; i <= state.doc.lines; i++) {
      const tx = state.doc.line(i).text;
      if (/^\s*(```|~~~)/.test(tx)) { open = !open; set.add(i); continue; }
      if (open) set.add(i);
    }
    inFenceCache = { doc: state.doc, lines: set };
    return set;
  };

  /* hover help */
  const hover = hoverTooltip((view, pos) => {
    const c = constructAt(view, pos);
    if (!c) return null;
    return { pos: c.from, end: c.to, above: true, create: () => ({ dom: helpDOM(view, c.id, c.line) || document.createElement('div') }) };
  }, { hoverTime: 350 });

  /* line backgrounds: directives, code, and the hint on an empty active line */
  const lineDeco = ViewPlugin.fromClass(class {
    constructor(view) { this.decorations = this.build(view); }
    update(u) { if (u.docChanged || u.viewportChanged || u.selectionSet || u.focusChanged) this.decorations = this.build(u.view); }
    build(view) {
      const b = new CM.RangeSetBuilder();
      const fences = fenceLines(view.state);
      const cur = view.state.doc.lineAt(view.state.selection.main.head);
      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to;) {
          const line = view.state.doc.lineAt(pos);
          if (!fences.has(line.number)) {
            if (/^\\pagebreak\s*$/.test(line.text)) b.add(line.from, line.from, Decoration.line({ class: 'cm-line-pagebreak' }));
            else if (/^\\(vspace(\s+\d+)?)?\s*$/.test(line.text)) b.add(line.from, line.from, Decoration.line({ class: 'cm-line-vspace' }));
            else if (line.number === cur.number && !line.text && view.hasFocus && view.state.doc.length > 0) b.add(line.from, line.from, Decoration.line({ class: 'cm-line-hint' }));
          } else if (!/^\s*(```|~~~)/.test(line.text)) b.add(line.from, line.from, Decoration.line({ class: 'cm-line-code' }));
          pos = line.to + 1;
        }
      }
      return b.finish();
    }
  }, { decorations: (v) => v.decorations });

  /* the block menu: "/" at the start of a line, "\" for directives, or opened
     explicitly from the line handle */
  let menuOptions;
  menuOptions = (items, slashAt) => items.map(({ it, section, rank, boost }) => ({
    label: it.label, detail: it.syntax.split('\n')[0], type: it.id, boost,
    section: { name: section, rank },
    apply: (view, c, f, to) => {
      anchor = null;
      view.dispatch({ changes: { from: slashAt != null ? slashAt : f, to, insert: '' } });
      MD.apply(view, it);
    },
  }));
  // where a handle-opened menu started, so the typed filter is known without a "/"
  let anchor = null;
  const blockSource = (ctx) => {
    const line = ctx.state.doc.lineAt(ctx.pos);
    const before = line.text.slice(0, ctx.pos - line.from);
    const m = /^(\s*)([\/\\])([\w-]*)$/.exec(before);
    let slashAt = null, from;
    if (m) { slashAt = line.from + m[1].length; from = slashAt + 1; }
    else if (ctx.explicit) { anchor = { line: line.number, from: ctx.pos }; from = ctx.pos; }
    else if (anchor && anchor.line === line.number && ctx.pos >= anchor.from && /^[\w\- ]*$/.test(ctx.state.sliceDoc(anchor.from, ctx.pos))) from = anchor.from;
    else return null;
    let items;
    if (m && m[2] === '\\') items = SYNTAX.ITEMS.filter((i) => i.group === 'Layout').map((it, k) => ({ it, section: 'Layout', rank: 0, boost: 99 - k }));
    else items = MENU.flatMap(([section, ids], r) => ids.map((id, k) => ({ it: SYNTAX.byId[id], section, rank: r, boost: 99 - k })));
    return { from, options: menuOptions(items, slashAt), filter: true, validFor: /^[\w\- ]*$/ };
  };

  /* the "+" handle: visible on the active or hovered line, opens the menu for it */
  class Handle extends GutterMarker {
    toDOM() { const s = document.createElement('span'); s.className = 'cm-handle'; s.textContent = '+'; s.title = 'Change this line, or insert a block'; return s; }
  }
  const handle = new Handle();
  const handleGutter = gutter({
    class: 'cm-handle-gutter',
    lineMarker: () => handle,
    lineMarkerChange: () => false,
    initialSpacer: () => handle,
    domEventHandlers: {
      mousedown(view, line, e) {
        e.preventDefault();
        const l = view.state.doc.lineAt(line.from);
        view.dispatch({ selection: { anchor: l.from } });
        view.focus();
        startCompletion(view);
        return true;
      },
    },
  });

  /* thumbnails under lines that reference images */
  const REF_RE = /!\[[^\]]*\]\(\s*([^)\s"]+)/g;
  class Thumbs extends WidgetType {
    constructor(names) { super(); this.names = names; }
    eq(o) { return o.names.join('|') === this.names.join('|') && o.urls === this.urls; }
    get urls() { return this.names.map((n) => Library.urlFor(n) || (/^(https?:|data:|blob:)/.test(n) ? n : '')).join('|'); }
    toDOM() {
      const box = document.createElement('div'); box.className = 'cm-thumbs';
      this.names.forEach((n) => {
        const url = Library.urlFor(n) || (/^(https?:|data:|blob:)/.test(n) ? n : null);
        if (url) { const im = document.createElement('img'); im.src = url; im.alt = n; im.title = n; im.draggable = false; box.appendChild(im); }
        else { const c = document.createElement('span'); c.className = 'cm-thumb-missing'; c.textContent = n + ' — not in this browser; paste the image again'; box.appendChild(c); }
      });
      return box;
    }
    ignoreEvent() { return true; }
  }
  const thumbDecos = (state) => {
    const b = new CM.RangeSetBuilder();
    const fences = fenceLines(state);
    for (let i = 1; i <= state.doc.lines; i++) {
      const line = state.doc.line(i);
      if (fences.has(i) || line.text.indexOf('![') < 0) continue;
      const names = [...line.text.matchAll(REF_RE)].map((m) => m[1]);
      if (names.length) b.add(line.to, line.to, Decoration.widget({ widget: new Thumbs(names), block: true, side: 1 }));
    }
    return b.finish();
  };
  const thumbs = CM.StateField.define({
    create: (state) => thumbDecos(state),
    update: (v, tr) => (tr.docChanged || tr.effects.some((e) => e.is(libTick)) ? thumbDecos(tr.state) : v),
    provide: (f) => EditorView.decorations.from(f),
  });

  const events = EditorView.domEventHandlers({
    paste(e, view) {
      const files = [...((e.clipboardData && e.clipboardData.files) || [])].filter((f) => /^image\//.test(f.type));
      if (!files.length && e.clipboardData && e.clipboardData.items) {
        for (const it of e.clipboardData.items) if (it.kind === 'file' && /^image\//.test(it.type || '')) { const f = it.getAsFile(); if (f) files.push(f); }
      }
      if (!files.length) return false;
      e.preventDefault();
      onImageFiles(files, view);
      return true;
    },
    drop(e, view) {
      const files = [...((e.dataTransfer && e.dataTransfer.files) || [])].filter((f) => /^image\//.test(f.type));
      if (!files.length) return false;
      e.preventDefault();
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
      if (pos != null) view.dispatch({ selection: { anchor: pos } });
      onImageFiles(files, view);
      return true;
    },
  });

  const shortcuts = SYNTAX.ITEMS.filter((i) => i.key).map((i) => ({ key: i.key, run: (v) => { MD.apply(v, i); return true; } }));

  return [
    handleGutter, highlightActiveLineGutter(), highlightActiveLine(), drawSelection(), history(),
    markdown({ base: markdownLanguage, addKeymap: true }),
    syntaxHighlighting(style),
    EditorView.lineWrapping,
    placeholder('Start writing, or type / for blocks. Paste an image anywhere.'),
    lineDeco, thumbs, hover,
    autocompletion({ override: [blockSource], activateOnTyping: true, icons: true, maxRenderedOptions: 40, defaultKeymap: true, closeOnBlur: true }),
    highlightSelectionMatches(),
    events,
    Prec.high(keymap.of(shortcuts)),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...completionKeymap, indentWithTab]),
    EditorView.updateListener.of((u) => {
      if (u.docChanged) onDocChange(u.state.doc.toString());
      if (u.docChanged || u.selectionSet || u.focusChanged) {
        const head = u.state.selection.main.head;
        if (anchor && u.state.doc.lineAt(head).number !== anchor.line) anchor = null;
        const c = constructAt(u.view, head);
        onCaret(u.state.doc.lineAt(head).number - 1, u.view.hasFocus, {
          line: SYNTAX.detectLine(u.state.doc.lineAt(head).text) || 'p',
          inline: c && !c.line ? c.id : null,
        });
      }
    }),
  ];
}

/* ---------- the pane ---------- */
function MarkdownPane({ initial, onDocChange, onCaret, onImageFiles, onActive, bus }) {
  const host = useRefMP(null);
  const viewRef = useRefMP(null);
  const cbs = useRefMP({});
  cbs.current = { onDocChange, onCaret, onImageFiles, onActive };

  useEffectMP(() => {
    const view = new CM.EditorView({
      state: CM.EditorState.create({
        doc: initial,
        extensions: buildExtensions({
          onDocChange: (d) => cbs.current.onDocChange(d),
          onCaret: (l, f, at) => {
            const it = f ? SYNTAX.byId[at.inline || at.line] : null;
            if (cbs.current.onActive) cbs.current.onActive(it ? it.label : '');
            cbs.current.onCaret(l, f);
          },
          onImageFiles: (files, v) => cbs.current.onImageFiles(files, v),
        }),
      }),
      parent: host.current,
    });
    viewRef.current = view;
    const unsub = Library.subscribe(() => view.dispatch({ effects: libTick.of(null) })); // thumbnails follow the store
    bus.current.md = {
      view,
      getDoc: () => view.state.doc.toString(),
      setDoc: (text) => { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, selection: { anchor: 0 } }); },
      apply: (id) => MD.apply(view, SYNTAX.byId[id]),
      insert: (text, own) => MD.insertAtCaret(view, text, own),
      focus: () => view.focus(),
      blur: () => view.contentDOM.blur(),
      lineCount: () => view.state.doc.lines,
      getLine: (n) => (n >= 0 && n < view.state.doc.lines ? view.state.doc.line(n + 1).text : null),
      setLine: (n, text) => {
        if (n < 0 || n >= view.state.doc.lines) return;
        const l = view.state.doc.line(n + 1);
        view.dispatch({ changes: { from: l.from, to: l.to, insert: text } });
      },
      gotoLine: (n, opts = {}) => {
        const l = view.state.doc.line(Math.min(Math.max(0, n), view.state.doc.lines - 1) + 1);
        view.dispatch({ selection: { anchor: opts.end ? l.to : l.from }, effects: CM.EditorView.scrollIntoView(l.from, { y: opts.y || 'center' }) });
        if (opts.focus) view.focus();
      },
      scrollToLine: (n) => {
        const l = view.state.doc.line(Math.min(Math.max(0, n), view.state.doc.lines - 1) + 1);
        view.dispatch({ effects: CM.EditorView.scrollIntoView(l.from, { y: 'start', yMargin: 12 }) });
      },
      undo: () => CM.undo(view), redo: () => CM.redo(view),
    };
    return () => { unsub(); view.destroy(); bus.current.md = null; };
  }, []);

  return (
    <div className="mdpane">
      <div className="cm-host" ref={host} />
    </div>
  );
}
