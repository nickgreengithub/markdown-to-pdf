/* global React, CM, SYNTAX */
/* ============================================================
   Markdown pane — the only place the document is edited.

   CodeMirror 6 with:
   - markdown syntax colouring (the raw marks stay raw)
   - hover help on any construct, with "change to…" for line-level ones
   - "\" at the start of a line completes the layout directives
   - a palette under the editor showing every construct at once; the one
     under the caret lights up, and clicking one inserts it
   - paste / drop of image files handed to the app (→ image library)
   ============================================================ */
const { useState: useStateMP, useEffect: useEffectMP, useRef: useRefMP } = React;

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

function buildExtensions({ onDocChange, onCaret, onImageFiles, bus }) {
  const { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine, highlightActiveLineGutter, Decoration, ViewPlugin, hoverTooltip, placeholder,
    defaultKeymap, history, historyKeymap, indentWithTab, markdown, markdownLanguage, markdownKeymap, syntaxHighlighting, HighlightStyle, autocompletion, completionKeymap,
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

  /* which lines are inside a fenced code block (they get a flat background) */
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

  /* directive lines and code-block lines get a background */
  const lineDeco = ViewPlugin.fromClass(class {
    constructor(view) { this.decorations = this.build(view); }
    update(u) { if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view); }
    build(view) {
      const b = new CM.RangeSetBuilder();
      const fences = fenceLines(view.state);
      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to;) {
          const line = view.state.doc.lineAt(pos);
          if (!fences.has(line.number)) {
            if (/^\\pagebreak\s*$/.test(line.text)) b.add(line.from, line.from, Decoration.line({ class: 'cm-line-pagebreak' }));
            else if (/^\\(vspace(\s+\d+)?)?\s*$/.test(line.text)) b.add(line.from, line.from, Decoration.line({ class: 'cm-line-vspace' }));
          } else if (!/^\s*(```|~~~)/.test(line.text)) b.add(line.from, line.from, Decoration.line({ class: 'cm-line-code' }));
          pos = line.to + 1;
        }
      }
      return b.finish();
    }
  }, { decorations: (v) => v.decorations });

  /* "\\" at the start of a line → the layout directives (completes what is being typed) */
  const blockSource = (ctx) => {
    const line = ctx.state.doc.lineAt(ctx.pos);
    const before = line.text.slice(0, ctx.pos - line.from);
    const m = /^(\s*)(\\)([\w-]*)$/.exec(before);
    if (!m) return null;
    // the backslash stays out of the filter text; apply() removes it
    const slashAt = line.from + m[1].length;
    const from = slashAt + 1;
    const items = SYNTAX.ITEMS.filter((i) => i.group === 'Layout');
    return {
      from,
      options: items.map((i) => ({
        label: i.label, detail: i.syntax.split('\n')[0], type: 'block', info: i.desc.replace(/`/g, ''),
        boost: i.group === 'Headings' ? 2 : 0,
        apply: (view, c, f, to) => {
          view.dispatch({ changes: { from: slashAt != null ? slashAt : f, to, insert: '' } });
          MD.apply(view, i);
        },
      })),
      filter: true,
      validFor: /^[\w-]*$/,
    };
  };

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
    lineNumbers(), highlightActiveLineGutter(), highlightActiveLine(), drawSelection(), history(),
    markdown({ base: markdownLanguage, addKeymap: true }),
    syntaxHighlighting(style),
    EditorView.lineWrapping,
    placeholder('Start writing. Paste an image anywhere.'),
    lineDeco, hover,
    autocompletion({ override: [blockSource], activateOnTyping: true, icons: false, maxRenderedOptions: 30, defaultKeymap: true }),
    highlightSelectionMatches(),
    events,
    Prec.high(keymap.of(shortcuts)),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...completionKeymap, indentWithTab]),
    EditorView.updateListener.of((u) => {
      if (u.docChanged) onDocChange(u.state.doc.toString());
      if (u.docChanged || u.selectionSet || u.focusChanged) {
        const head = u.state.selection.main.head;
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
function MarkdownPane({ initial, onDocChange, onCaret, onImageFiles, bus, palette, setPalette }) {
  const host = useRefMP(null);
  const viewRef = useRefMP(null);
  const cbs = useRefMP({});
  const [active, setActive] = useStateMP({ line: null, inline: null, focused: false });
  cbs.current = { onDocChange, onCaret, onImageFiles };

  useEffectMP(() => {
    const view = new CM.EditorView({
      state: CM.EditorState.create({
        doc: initial,
        extensions: buildExtensions({
          onDocChange: (d) => cbs.current.onDocChange(d),
          onCaret: (l, f, at) => { setActive({ ...at, focused: f }); cbs.current.onCaret(l, f); },
          onImageFiles: (files, v) => cbs.current.onImageFiles(files, v),
        }),
      }),
      parent: host.current,
    });
    viewRef.current = view;
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
    return () => { view.destroy(); bus.current.md = null; };
  }, []);

  const run = (id) => { const v = viewRef.current; if (v) MD.apply(v, SYNTAX.byId[id]); };
  return (
    <div className="mdpane">
      <div className="cm-host" ref={host} />
      <Palette active={active} onInsert={run} mode={palette} setMode={setPalette} />
    </div>
  );
}

/* Every construct, always visible. The chip for the construct under the
   caret is lit; clicking a chip inserts or toggles it. */
function Palette({ active, onInsert, mode, setMode }) {
  const isMac = navigator.platform.includes('Mac');
  const lit = (it) => active.focused && (it.id === active.line || it.id === active.inline || (it.id === 'vspace' && active.line === 'vspaceN'));
  return (
    <div className={'palette' + (mode === 'compact' ? ' compact' : '')}>
      <div className="pal-groups">
        {SYNTAX.GROUPS.map((g) => (
          <div className="pal-group" key={g.label}>
            <span className="pal-glabel">{g.label}</span>
            {g.items.map((it) => (
              <button key={it.id} className={'pal-chip' + (lit(it) ? ' on' : '')}
                title={it.desc.replace(/`/g, '') + (it.key ? '  (' + it.key.replace('Mod', isMac ? '⌘' : 'Ctrl') + ')' : '')}
                onMouseDown={(e) => { e.preventDefault(); onInsert(it.id); }}>
                <span className="pal-glyph">{it.glyph}</span>
                <span className="pal-label">{it.label}</span>
                <code className="pal-syntax">{it.syntax.split('\n')[0]}</code>
              </button>
            ))}
          </div>
        ))}
      </div>
      <button className="pal-toggle" title={mode === 'compact' ? 'Show syntax' : 'Compact'} onMouseDown={(e) => { e.preventDefault(); setMode(mode === 'compact' ? 'full' : 'compact'); }}>
        {mode === 'compact' ? '▴' : '▾'}
      </button>
    </div>
  );
}
