/* global React, CM, SYNTAX, FMT_ICONS, HelpIcon, LibraryIcon, CloseIcon */
/* ============================================================
   Markdown pane — the only place the document is edited.

   CodeMirror 6 with:
   - markdown syntax colouring (the raw marks stay raw)
   - a gutter glyph per line saying what block it is; click it for help
     and "change to…" options
   - hover help on any construct
   - "/" (or "\") at the start of a line lists every block type
   - an insert toolbar and a syntax reference panel, both driven by SYNTAX
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
        view.dispatch({ effects: setBlockTip.of(null) });
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

/* gutter-click popover: a tooltip pinned to a line */
const setBlockTip = CM.StateEffect.define();
const blockTipField = CM.StateField.define({
  create: () => null,
  update(v, tr) {
    for (const e of tr.effects) if (e.is(setBlockTip)) return e.value;
    if (tr.docChanged && v) return null;
    return v;
  },
  provide: (f) => CM.showTooltip.from(f),
});

function buildExtensions({ onDocChange, onCaret, onImageFiles, bus }) {
  const { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine, highlightActiveLineGutter, Decoration, ViewPlugin, hoverTooltip, gutter, GutterMarker, placeholder,
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

  /* gutter: one glyph per line, saying what it is */
  class KindMarker extends GutterMarker {
    constructor(id) { super(); this.id = id; }
    eq(o) { return o.id === this.id; }
    toDOM() { const s = document.createElement('span'); s.className = 'cm-kind cm-kind-' + this.id; s.textContent = SYNTAX.byId[this.id].glyph; s.title = SYNTAX.byId[this.id].label + ' — click for options'; return s; }
  }
  const markers = {};
  const markerFor = (id) => (markers[id] || (markers[id] = new KindMarker(id)));
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
  const kindGutter = gutter({
    class: 'cm-kind-gutter',
    lineMarker(view, line) {
      const fences = fenceLines(view.state);
      const l = view.state.doc.lineAt(line.from);
      if (fences.has(l.number)) return /^\s*(```|~~~)/.test(l.text) ? markerFor('fence') : null;
      const id = SYNTAX.detectLine(l.text);
      if (!id || id === 'p') return null;
      return markerFor(id);
    },
    lineMarkerChange: (u) => u.docChanged,
    domEventHandlers: {
      mousedown(view, line, e) {
        e.preventDefault();
        const l = view.state.doc.lineAt(line.from);
        const id = SYNTAX.detectLine(l.text) || 'p';
        const cur = view.state.field(blockTipField);
        if (cur && cur.pos === l.from) { view.dispatch({ effects: setBlockTip.of(null) }); return true; }
        view.dispatch({
          selection: { anchor: l.from },
          effects: setBlockTip.of({ pos: l.from, above: false, strictSide: true, arrow: true, create: () => ({ dom: helpDOM(view, id, l.number - 1) || document.createElement('div') }) }),
        });
        return true;
      },
    },
  });

  /* hover help */
  const hover = hoverTooltip((view, pos) => {
    const c = constructAt(view, pos);
    if (!c) return null;
    return { pos: c.from, end: c.to, above: true, create: () => ({ dom: helpDOM(view, c.id, c.line) || document.createElement('div') }) };
  }, { hoverTime: 350 });

  /* directive lines + the "type / for blocks" hint on an empty active line */
  const lineDeco = ViewPlugin.fromClass(class {
    constructor(view) { this.decorations = this.build(view); }
    update(u) { if (u.docChanged || u.selectionSet || u.viewportChanged || u.focusChanged) this.decorations = this.build(u.view); }
    build(view) {
      const b = new CM.RangeSetBuilder();
      const cur = view.state.doc.lineAt(view.state.selection.main.head);
      const fences = fenceLines(view.state);
      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to;) {
          const line = view.state.doc.lineAt(pos);
          if (!fences.has(line.number)) {
            if (/^\\pagebreak\s*$/.test(line.text)) b.add(line.from, line.from, Decoration.line({ class: 'cm-line-pagebreak' }));
            else if (/^\\(vspace(\s+\d+)?)?\s*$/.test(line.text)) b.add(line.from, line.from, Decoration.line({ class: 'cm-line-vspace' }));
            else if (line.number === cur.number && !line.text && view.hasFocus && view.state.doc.length > 0)
              b.add(line.from, line.from, Decoration.line({ class: 'cm-line-hint' }));
          } else if (!/^\s*(```|~~~)/.test(line.text)) b.add(line.from, line.from, Decoration.line({ class: 'cm-line-code' }));
          pos = line.to + 1;
        }
      }
      return b.finish();
    }
  }, { decorations: (v) => v.decorations });

  /* "/" or "\" at the start of a line → block menu */
  const blockSource = (ctx) => {
    const line = ctx.state.doc.lineAt(ctx.pos);
    const before = line.text.slice(0, ctx.pos - line.from);
    const m = /^(\s*)([\/\\])([\w-]*)$/.exec(before);
    if (!m && !ctx.explicit) return null;
    const isDirective = m && m[2] === '\\';
    // the trigger character stays out of the filter text; apply() removes it
    const slashAt = m ? line.from + m[1].length : null;
    const from = m ? slashAt + 1 : ctx.pos;
    const items = SYNTAX.ITEMS.filter((i) => i.kind !== 'wrap' && i.id !== 'p' && (!isDirective || i.group === 'Page layout'));
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
  shortcuts.push({ key: 'Escape', run: (v) => { if (v.state.field(blockTipField)) { v.dispatch({ effects: setBlockTip.of(null) }); return true; } return false; } });

  return [
    lineNumbers(), kindGutter, highlightActiveLineGutter(), highlightActiveLine(), drawSelection(), history(),
    markdown({ base: markdownLanguage, addKeymap: true }),
    syntaxHighlighting(style),
    EditorView.lineWrapping,
    placeholder('Start writing, or type / for a list of blocks. Paste an image anywhere.'),
    lineDeco, hover, blockTipField,
    autocompletion({ override: [blockSource], activateOnTyping: true, icons: false, maxRenderedOptions: 30, defaultKeymap: true }),
    highlightSelectionMatches(),
    events,
    Prec.high(keymap.of(shortcuts)),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...completionKeymap, indentWithTab]),
    EditorView.updateListener.of((u) => {
      if (u.docChanged) onDocChange(u.state.doc.toString());
      if (u.docChanged || u.selectionSet) {
        const head = u.state.selection.main.head;
        onCaret(u.state.doc.lineAt(head).number - 1, u.view.hasFocus, u.docChanged);
      }
    }),
  ];
}

/* ---------- the pane ---------- */
function MarkdownPane({ initial, onDocChange, onCaret, onImageFiles, bus, onOpenLibrary, helpOpen, setHelpOpen }) {
  const host = useRefMP(null);
  const viewRef = useRefMP(null);
  const cbs = useRefMP({});
  cbs.current = { onDocChange, onCaret, onImageFiles };

  useEffectMP(() => {
    const view = new CM.EditorView({
      state: CM.EditorState.create({
        doc: initial,
        extensions: buildExtensions({
          onDocChange: (d) => cbs.current.onDocChange(d),
          onCaret: (l, f, c) => cbs.current.onCaret(l, f, c),
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

  const tools = ['h1', 'h2', 'h3', '|', 'bold', 'italic', 'strike', '|', 'ul', 'ol', 'quote', '|', 'table', 'link', 'image', '|', 'pagebreak', 'vspace'];
  const run = (id) => { const v = viewRef.current; if (!v) return; if (id === 'image') { onOpenLibrary(); return; } MD.apply(v, SYNTAX.byId[id]); };

  return (
    <div className="mdpane">
      <div className="mdbar">
        <div className="mdbar-tools">
          {tools.map((id, i) => id === '|'
            ? <span key={i} className="fmt-sep" />
            : (() => { const it = SYNTAX.byId[id]; const Ico = it.tool && FMT_ICONS[it.tool]; return (
              <button key={id} className={'fmt' + (Ico ? ' ico' : ' h')} title={it.label + (it.key ? '  (' + it.key.replace('Mod', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl') + ')' : '') + ' — ' + it.syntax.split('\n')[0]}
                onMouseDown={(e) => { e.preventDefault(); run(id); }}>
                {Ico ? <Ico /> : it.tool || it.glyph}
              </button>); })())}
        </div>
        <div className="mdbar-right">
          <button className="fmt ico" title="Image library" onMouseDown={(e) => { e.preventDefault(); onOpenLibrary(); }}><LibraryIcon /></button>
          <button className={'fmt ico' + (helpOpen ? ' active' : '')} title="Syntax reference" onMouseDown={(e) => { e.preventDefault(); setHelpOpen(!helpOpen); }}><HelpIcon /></button>
        </div>
      </div>
      <div className="mdbody">
        <div className="cm-host" ref={host} />
        {helpOpen && <SyntaxReference onInsert={(id) => run(id)} onClose={() => setHelpOpen(false)} />}
      </div>
    </div>
  );
}

function SyntaxReference({ onInsert, onClose }) {
  return (
    <div className="mdhelp">
      <div className="mdhelp-head">
        <span>Syntax reference</span>
        <button className="fmt ico" onClick={onClose} title="Close"><CloseIcon /></button>
      </div>
      <div className="mdhelp-intro">Click any entry to insert it at the caret. Type <code>/</code> at the start of a line for the same list.</div>
      <div className="mdhelp-scroll">
        {SYNTAX.GROUPS.map((g) => (
          <div className="mdhelp-group" key={g.label}>
            <div className="mdhelp-gtitle">{g.label}</div>
            {g.items.map((it) => (
              <button className="mdhelp-row" key={it.id} onMouseDown={(e) => { e.preventDefault(); onInsert(it.id); }} title={it.desc.replace(/`/g, '')}>
                <span className="mdhelp-glyph">{it.glyph}</span>
                <span className="mdhelp-text">
                  <span className="mdhelp-label">{it.label}</span>
                  <code className="mdhelp-syntax">{it.syntax.split('\n').map((l, i) => <span key={i}>{l}{i < it.syntax.split('\n').length - 1 ? <span className="mdhelp-nl">⏎</span> : null}</span>)}</code>
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
