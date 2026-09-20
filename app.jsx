/* global React, ReactDOM, THEMES, expandTheme, Dialect, Library, DEMO, MarkdownPane, PreviewPane, StylePopover, HoverMenu, RowStep, Toggle, RowIcon, LogoMark, PrintIcon, SingleIcon, SpreadIcon, GridIcon, CloseIcon, LibraryIcon, TurndownService, turndownPluginGfm */
/* ============================================================
   App — top bar, the two panes, persistence, print.
   Markdown text is the only source of truth; everything else derives.
   ============================================================ */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

const LS = { md: 'ms.md', theme: 'ms.theme', vars: 'ms.vars', ui: 'ms.ui', legacyHtml: 'mdv4.html' };
const get = (k, f) => { try { const v = localStorage.getItem(k); return v == null ? f : v; } catch { return f; } };
const getJSON = (k, f) => { try { const v = localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch { return f; } };
const set = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch { return false; } };
const getTheme = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
const isMac = navigator.platform.includes('Mac');

/* ---- one-time migration from the previous (HTML-first) version ---- */
async function migrateLegacy() {
  const html = get(LS.legacyHtml, null);
  if (html == null) return null;
  let md = null;
  try {
    if (window.TurndownService) {
      const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*', hr: '---' });
      if (window.turndownPluginGfm) td.use(window.turndownPluginGfm.gfm);
      md = td.turndown(html);
    } else {
      md = new DOMParser().parseFromString(html, 'text/html').body.innerText;
    }
    // embedded images → library
    const re = /!\[([^\]]*)\]\((data:image\/[^)\s]+)\)/g;
    const found = [...md.matchAll(re)];
    for (const m of found) {
      const blob = Library.dataURLToBlob(m[2]);
      if (!blob) continue;
      const name = await Library.add(new File([blob], 'image.png', { type: blob.type }), 'image').catch(() => null);
      if (name) md = md.replace(m[0], `![${m[1]}](${name})`);
    }
  } catch { md = null; }
  try { localStorage.removeItem(LS.legacyHtml); localStorage.removeItem('mdv2.title'); } catch {}
  return md;
}

/* ---- image library dialog ---- */
function LibraryDialog({ onClose, onInsert, used, flash }) {
  const [items, setItems] = useState(Library.list());
  const [renaming, setRenaming] = useState(null);
  const fileRef = useRef(null);
  useEffect(() => Library.subscribe(() => setItems(Library.list())), []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const unused = items.filter((i) => !used.has(i.name));
  const addFiles = async (files) => {
    for (const f of files) {
      try { await Library.add(f); } catch { flash('Could not read ' + f.name); }
    }
  };
  const kb = (n) => (n > 900000 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB');
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onDragOver={(e) => { e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); addFiles([...e.dataTransfer.files].filter((f) => /^image\//.test(f.type))); }}>
      <div className="libdlg">
        <div className="libdlg-head">
          <span className="libdlg-title">Image library <span className="libdlg-count">{items.length}</span></span>
          <div className="libdlg-actions">
            <button className="fmt small" onClick={() => fileRef.current && fileRef.current.click()}>Add image…</button>
            {unused.length > 0 && <button className="fmt small" title="Delete images the document does not reference" onClick={() => { if (confirm(`Delete ${unused.length} unused image${unused.length === 1 ? '' : 's'}?`)) unused.forEach((i) => Library.remove(i.name)); }}>Remove unused ({unused.length})</button>}
            <button className="fmt ico" onClick={onClose} title="Close"><CloseIcon /></button>
          </div>
        </div>
        <div className="libdlg-hint">Refer to an image by name: <code>![alt](name "Caption")</code>. Pasting or dropping an image anywhere in the app adds it here and inserts it at the caret.</div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }} />
        {items.length === 0 ? (
          <div className="libdlg-empty">No images yet. Paste one, drop one here, or use “Add image…”.</div>
        ) : (
          <div className="libgrid">
            {items.map((it) => (
              <div className={'libcard' + (used.has(it.name) ? '' : ' unused')} key={it.name}>
                <div className="libthumb" onClick={() => onInsert(it.name)} title="Insert"><img src={it.url} alt={it.name} /></div>
                <div className="libmeta">
                  {renaming === it.name
                    ? <input className="librename" autoFocus defaultValue={it.name}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') { try { await Library.rename(it.name, e.target.value); } catch (err) { flash(err.message === 'name taken' ? 'That name is taken' : 'Could not rename'); } setRenaming(null); }
                          if (e.key === 'Escape') setRenaming(null);
                        }} onBlur={() => setRenaming(null)} />
                    : <button className="libname" title="Rename" onClick={() => setRenaming(it.name)}>{it.name}</button>}
                  <span className="libdim">{it.w && it.h ? `${it.w}×${it.h} · ` : ''}{kb(it.size)}{used.has(it.name) ? '' : ' · unused'}</span>
                </div>
                <div className="libbtns">
                  <button className="fmt small primary" onClick={() => onInsert(it.name)}>Insert</button>
                  <button className="fmt small" onClick={() => { if (confirm(`Delete “${it.name}”?`)) Library.remove(it.name); }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const t0 = THEMES[0];
  const [ready, setReady] = useState(false);
  const [initialMd, setInitialMd] = useState('');
  const [md, setMd] = useState('');
  const [libTick, setLibTick] = useState(0);
  const [themeId, setThemeId] = useState(() => get(LS.theme, get('mdv2.theme', t0.id)));
  const [vars, setVars] = useState(() => {
    const persisted = getJSON(LS.vars, getJSON('mdv2.vars', null)); // the previous version's key, if any
    const base = expandTheme(getTheme(get(LS.theme, get('mdv2.theme', t0.id))).vars);
    return persisted ? { ...base, ...persisted, paper: '#ffffff' } : base;
  });
  const [ui, setUi] = useState(() => ({ mode: 'single', zoom: null, split: 0.42, palette: 'full', pageNumbers: 'none', narrow: 'md', ...getJSON(LS.ui, {}) }));
  const [libOpen, setLibOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [stats, setStats] = useState({ pages: 1, words: 0 });
  const [currentLine, setCurrentLine] = useState(null);
  const [editorFocused, setEditorFocused] = useState(false);
  const [popover, setPopover] = useState(null);
  const bus = useRef({});
  const fitRef = useRef(1);
  const splitRef = useRef(null);

  const flash = useCallback((m) => { setToast(m); clearTimeout(flash._t); flash._t = setTimeout(() => setToast(''), 1600); }, []);
  const setU = (patch) => setUi((u) => ({ ...u, ...patch }));

  /* ---- boot: library, then the document (stored → migrated → demo) ---- */
  useEffect(() => {
    (async () => {
      try { await Library.load(); } catch {}
      let text = get(LS.md, null);
      if (text == null) text = await migrateLegacy();
      if (text == null) { await DEMO.seed(Library); text = DEMO.md; }
      setInitialMd(text); setMd(text); setReady(true);
    })();
    return Library.subscribe(() => setLibTick((n) => n + 1));
  }, []);

  /* ---- persistence ---- */
  useEffect(() => { if (ready && !set(LS.md, md)) flash('Too large to autosave — print to PDF now'); }, [md, ready]);
  useEffect(() => { set(LS.theme, themeId); }, [themeId]);
  useEffect(() => { set(LS.vars, vars); }, [vars]);
  useEffect(() => { set(LS.ui, ui); }, [ui]);

  /* ---- render ---- */
  const dialect = useMemo(() => Dialect.make({ resolveImage: (src) => Library.urlFor(src) || (/^(https?:|data:|blob:)/.test(src) ? src : null) }), []);
  const [html, setHtml] = useState('');
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setHtml(dialect.render(md)), 90);
    return () => clearTimeout(t);
  }, [md, libTick, ready]);
  const usedImages = useMemo(() => new Set(dialect.images(md).map((i) => i.name)), [md]);

  const setVar = (k, v) => setVars((p) => ({ ...p, [k]: v }));
  const applyTheme = (t) => { setThemeId(t.id); setVars(expandTheme(t.vars)); flash(t.name + ' theme'); };
  const resetKeys = (keys) => { const base = expandTheme(getTheme(themeId).vars); setVars((p) => { const n = { ...p }; keys.forEach((k) => { if (k in base) n[k] = base[k]; }); return n; }); };

  /* ---- images arriving from anywhere ---- */
  const addImages = useCallback(async (files) => {
    const names = [];
    for (const f of files) {
      try { names.push(await Library.add(f)); } catch { flash('Could not read that image'); }
    }
    if (names.length && bus.current.md) {
      bus.current.md.insert(names.map((n) => `![](${n})`).join('\n\n'), true);
      flash(names.length === 1 ? `Added ${names[0]} to the library` : `Added ${names.length} images`);
    }
  }, [flash]);
  useEffect(() => {
    const imgs = (dt) => [...((dt && dt.files) || [])].filter((f) => /^image\//.test(f.type));
    const onPaste = (e) => { if (e.defaultPrevented || e.target.closest('.cm-editor, input, textarea')) return; const f = imgs(e.clipboardData); if (f.length) { e.preventDefault(); addImages(f); } };
    const onDrop = (e) => { if (e.defaultPrevented || e.target.closest('.cm-editor, .libdlg')) return; const f = imgs(e.dataTransfer); if (f.length) { e.preventDefault(); addImages(f); } };
    const onOver = (e) => { if (e.target.closest('.cm-editor, .libdlg')) return; if (imgs(e.dataTransfer).length || (e.dataTransfer && [...e.dataTransfer.types].includes('Files'))) e.preventDefault(); };
    window.addEventListener('paste', onPaste); window.addEventListener('drop', onDrop); window.addEventListener('dragover', onOver);
    return () => { window.removeEventListener('paste', onPaste); window.removeEventListener('drop', onDrop); window.removeEventListener('dragover', onOver); };
  }, [addImages]);

  /* ---- preview interactions ---- */
  const onBlockClick = (info) => {
    if (!info) { setPopover(null); return; }
    if (bus.current.md) bus.current.md.gotoLine(info.line, { y: 'center' });
    setCurrentLine(info.line);
    const r = info.anchor.getBoundingClientRect();
    setPopover({ target: info.kind, line: info.line, lineEnd: info.lineEnd, imgName: info.imgName, anchorRect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom } });
  };
  const onCaret = useCallback((line, focused) => { setCurrentLine(line); setEditorFocused(focused); }, []);
  // the outline on the page exists only while the editor has focus or a popover is open
  const highlightLine = popover ? popover.line : (editorFocused ? currentLine : null);
  const onScrollLine = useCallback((line) => { if (bus.current.md && !bus.current.md.view.hasFocus) bus.current.md.scrollToLine(line); }, []);
  const onPages = useCallback((n, text) => setStats({ pages: n, words: (text.trim().match(/\S+/g) || []).length }), []);

  // image attributes live in the markdown; the popover edits them there
  const imgCtx = useMemo(() => {
    if (!popover || popover.target !== 'image' || !popover.imgName || !bus.current.md) return null;
    const m = bus.current.md;
    let ln = popover.line, text = null;
    for (let n = popover.line; n < (popover.lineEnd || popover.line + 1); n++) { const t = m.getLine(n); if (t && Dialect.getImageAttrs(t, popover.imgName)) { ln = n; text = t; break; } }
    const missing = !Library.has(popover.imgName) && !/^(https?:|data:|blob:)/.test(popover.imgName);
    if (text == null) return { name: popover.imgName, attrs: {}, set: () => {}, missing };
    return {
      name: popover.imgName, attrs: Dialect.getImageAttrs(text, popover.imgName) || {}, missing,
      set: (patch) => { const cur = m.getLine(ln); const next = Dialect.setImageAttrs(cur, popover.imgName, patch); if (next != null && next !== cur) m.setLine(ln, next); },
    };
  }, [popover, md]);

  /* ---- print: the preview's sheets, verbatim ---- */
  const doPrint = () => {
    const clone = bus.current.pv && bus.current.pv.sheetsClone();
    if (!clone) return;
    const old = document.getElementById('print-root'); if (old) old.remove();
    const pr = document.createElement('div'); pr.id = 'print-root';
    Object.keys(vars).forEach((k) => pr.style.setProperty('--' + k, vars[k]));
    clone.querySelectorAll('.is-current').forEach((n) => n.classList.remove('is-current'));
    clone.querySelectorAll('.cur-tag').forEach((n) => n.remove());
    pr.appendChild(clone);
    document.body.appendChild(pr);
    const cleanup = () => { const n = document.getElementById('print-root'); if (n) n.remove(); window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };
  const printRef = useRef(doPrint); printRef.current = doPrint;
  useEffect(() => {
    let el = document.getElementById('print-page-style');
    if (!el) { el = document.createElement('style'); el.id = 'print-page-style'; document.head.appendChild(el); }
    el.textContent = '@page { size: A4; margin: 0; }';
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); printRef.current(); }
      if (e.altKey && !mod && /^[1-4]$/.test(e.key)) { const t = THEMES[+e.key - 1]; if (t) { e.preventDefault(); applyTheme(t); } }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---- divider drag ---- */
  const onDividerDown = (e) => {
    e.preventDefault();
    const host = splitRef.current; if (!host) return;
    const rect = host.getBoundingClientRect();
    const move = (ev) => setU({ split: Math.min(0.7, Math.max(0.22, (ev.clientX - rect.left) / rect.width)) });
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); document.body.classList.remove('dragging'); };
    document.body.classList.add('dragging');
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };

  const loadDemo = async () => {
    if (md.trim() && md !== DEMO.md && !confirm('Replace the current document with the demo article?')) return;
    await DEMO.seed(Library);
    bus.current.md.setDoc(DEMO.md); setMd(DEMO.md); flash('Demo article loaded');
  };
  const startBlank = () => {
    if (md.trim() && !confirm('Clear the document? (There is no undo for this.)')) return;
    bus.current.md.setDoc(''); setMd(''); bus.current.md.focus();
  };

  const zoomShown = ui.zoom == null ? fitRef.current : ui.zoom;
  const nudge = (d) => setU({ zoom: Math.max(0.15, Math.min(2.5, Math.round((zoomShown + d) * 100) / 100)) });
  const pageVars = {}; Object.keys(vars).forEach((k) => { pageVars['--' + k] = vars[k]; });

  if (!ready) return <div className="app booting" />;
  return (
    <div className={'app narrow-' + ui.narrow}>
      <header className="topbar">
        <div className="tb-left">
          <span className="brand"><LogoMark /><span>Markdown Studio</span></span>
          <button className="fmt tb-btn" title="Image library" onClick={() => setLibOpen(true)}><LibraryIcon /><span>Images</span></button>
          <HoverMenu className="tsel-menu" button={<span>Document</span>}>
            {(close) => (
              <div className="tsel-group">
                <button className="tsel-item" onClick={() => { close(); loadDemo(); }}><span className="tsel-name">Load the demo article</span><span className="tsel-cur">every element</span></button>
                <button className="tsel-item" onClick={() => { close(); startBlank(); }}><span className="tsel-name">Start blank</span></button>
                <button className="tsel-item" onClick={() => { close(); setLibOpen(true); }}><span className="tsel-name">Image library…</span></button>
                <div className="tsel-note">Everything is kept in this browser only — nothing is uploaded or saved elsewhere.</div>
              </div>
            )}
          </HoverMenu>
        </div>
        <div className="tb-center">
          <HoverMenu className="tsel-menu" button={<span><span className="tb-k">Theme</span> {getTheme(themeId).name}</span>}>
            {(close) => (
              <div className="tsel-group">
                {THEMES.map((t, i) => (
                  <button key={t.id} className={'tsel-item' + (t.id === themeId ? ' sel' : '')} onClick={() => { applyTheme(t); close(); }}>
                    <span className="tsel-aa" style={{ background: t.vars.paper, color: t.vars.ink, fontFamily: t.vars['font-head'] }}>Aa</span>
                    <span className="tsel-name">{t.name}<span className="tsel-note-inl">{t.note}</span></span>
                    <span className="tsel-cur">{t.id === themeId ? 'current' : (isMac ? '⌥' : 'Alt+') + (i + 1)}</span>
                  </button>
                ))}
                <div className="tsel-note">Applying a theme resets every style to that theme.</div>
              </div>
            )}
          </HoverMenu>
          <HoverMenu className="tsel-menu tsel-page" button={<span><span className="tb-k">Page</span> A4 · {parseFloat(vars['pad-y'])}/{parseFloat(vars['pad-x'])} mm</span>}>
            <div className="insp pagesetup">
              <div className="irow"><span className="ir-label"><RowIcon name="padY" /><span className="ir-lt">Margin top/bottom</span></span><div className="ir-ctl"><RowStep value={vars['pad-y']} unit="mm" step={1} min={5} max={45} onChange={(v) => setVar('pad-y', v)} /></div></div>
              <div className="irow"><span className="ir-label"><RowIcon name="padX" /><span className="ir-lt">Margin sides</span></span><div className="ir-ctl"><RowStep value={vars['pad-x']} unit="mm" step={1} min={5} max={45} onChange={(v) => setVar('pad-x', v)} /></div></div>
              <div className="irow"><span className="ir-label"><RowIcon name="size" /><span className="ir-lt">Base size</span></span><div className="ir-ctl"><RowStep value={vars['fs-base']} unit="px" step={0.5} min={9} max={24} onChange={(v) => setVar('fs-base', v)} /></div></div>
              <div className="irow"><span className="ir-label"><RowIcon name="lh" /><span className="ir-lt">Line height</span></span><div className="ir-ctl"><RowStep value={vars['lh']} step={0.02} min={1} max={2.4} onChange={(v) => setVar('lh', v)} /></div></div>
              <div className="irow"><span className="ir-label"><RowIcon name="spaceB" /><span className="ir-lt">Paragraph gap</span></span><div className="ir-ctl"><RowStep value={vars['para']} unit="em" step={0.05} min={0} max={2.5} onChange={(v) => setVar('para', v)} /></div></div>
              <div className="irow"><span className="ir-label"><RowIcon name="marker" /><span className="ir-lt">Page numbers</span></span><div className="ir-ctl"><Toggle on={ui.pageNumbers !== 'none'} onChange={(o) => setU({ pageNumbers: o ? 'bottom' : 'none' })} /></div></div>
            </div>
          </HoverMenu>
        </div>
        <div className="tb-right">
          <div className="seg modes">
            {[['single', SingleIcon, 'Single page'], ['spread', SpreadIcon, 'Two-up'], ['grid', GridIcon, 'Grid — plan page breaks']].map(([m, I, t]) => (
              <button key={m} className={ui.mode === m ? 'sel' : ''} title={t} onClick={() => setU({ mode: m, zoom: null })}><I /></button>
            ))}
          </div>
          <div className="zoom-pill">
            <button onClick={() => nudge(-0.1)} title="Zoom out">−</button>
            <button className="zv" onClick={() => setU({ zoom: null })} title="Fit to width">{Math.round(zoomShown * 100)}%</button>
            <button onClick={() => nudge(0.1)} title="Zoom in">+</button>
          </div>
          <div className="seg narrow-only">
            <button className={ui.narrow === 'md' ? 'sel' : ''} onClick={() => setU({ narrow: 'md' })}>Edit</button>
            <button className={ui.narrow === 'pv' ? 'sel' : ''} onClick={() => setU({ narrow: 'pv' })}>Preview</button>
          </div>
          <button className="fmt primary-fmt" title={'Print / save as PDF  (' + (isMac ? '⌘' : 'Ctrl+') + 'P)'} onClick={doPrint}><PrintIcon /><span>Print</span></button>
        </div>
      </header>

      <div className="split" ref={splitRef}>
        <div className="pane pane-md" style={{ width: (ui.split * 100) + '%' }}>
          <MarkdownPane initial={initialMd} bus={bus} onDocChange={setMd} onCaret={onCaret} onImageFiles={(files) => addImages(files)}
            palette={ui.palette} setPalette={(m) => setU({ palette: m })} />
        </div>
        <div className="divider" onMouseDown={onDividerDown} title="Drag to resize" />
        <div className="pane pane-pv">
          <PreviewPane html={html} vars={pageVars} mode={ui.mode} zoom={ui.zoom} pageNumbers={ui.pageNumbers}
            currentLine={highlightLine} caretDriven={editorFocused} onBlockClick={onBlockClick} onScrollLine={onScrollLine}
            onPages={onPages} onFitZoom={(z) => { fitRef.current = z; if (ui.zoom == null) setUi((u) => ({ ...u })); }} bus={bus} />
          <div className="pvfoot">
            <span>A4 · {stats.pages} {stats.pages === 1 ? 'page' : 'pages'} · {stats.words} words</span>
            <span className="pvfoot-hint">Click anything on the page to style it</span>
          </div>
        </div>
      </div>

      {popover && (
        <StylePopover target={popover.target} anchorRect={popover.anchorRect} bounds={bus.current.pv && bus.current.pv.root() ? bus.current.pv.root().getBoundingClientRect() : null}
          vars={vars} setVar={setVar} onReset={resetKeys} img={imgCtx} line={popover.line}
          onClose={() => setPopover(null)} onSwitch={(t) => setPopover((p) => ({ ...p, target: t }))}
          onGoto={(l) => bus.current.md && bus.current.md.gotoLine(l, { focus: true })}
          onOpenLibrary={() => { setPopover(null); setLibOpen(true); }} />
      )}
      {libOpen && <LibraryDialog onClose={() => setLibOpen(false)} used={usedImages} flash={flash}
        onInsert={(name) => { setLibOpen(false); bus.current.md.insert(`![](${name} "Caption")`, true); }} />}
      <div className={'toast' + (toast ? ' show' : '')}>{toast}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
