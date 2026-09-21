/* global React, ReactDOM, THEMES, expandTheme, Dialect, Library, DEMO, MarkdownPane, PreviewPane, ThemePane, LogoMark, PrintIcon, SingleIcon, SpreadIcon, GridIcon, TurndownService, turndownPluginGfm */
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
  const [ui, setUi] = useState(() => {
    const u = { mode: 'single', zoom: null, split: 0.42, narrow: 'md', tab: 'md', header: '', footer: '', thOpen: { page: true }, ...getJSON(LS.ui, {}) };
    if (u.pageNumbers === 'bottom' && !u.footer) u.footer = '{page}'; // the previous page-numbers switch
    delete u.pageNumbers;
    return u;
  });
  const [toast, setToast] = useState('');
  const [stats, setStats] = useState({ pages: 1, words: 0 });
  const [fitZoom, setFitZoom] = useState(1);
  const [currentLine, setCurrentLine] = useState(null);
  const [editorFocused, setEditorFocused] = useState(false);
  const [pageFocus, setPageFocus] = useState(null);   // { line, kind } of the block last clicked on the page
  const [docDlg, setDocDlg] = useState(false);
  const [construct, setConstruct] = useState('');     // what is under the caret, for the pane header
  const bus = useRef({});
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
    const t = setTimeout(() => setHtml(dialect.render(md)), 20); // render is a few ms; keep the preview close behind the caret
    return () => clearTimeout(t);
  }, [md, libTick, ready]);
  const usedImages = useMemo(() => new Set(dialect.images(md).map((i) => i.name)), [md]);
  const unusedImages = useMemo(() => Library.list().filter((i) => !usedImages.has(i.name)), [usedImages, libTick]);

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
      bus.current.md.insert(names.map((n) => `![](${n}){width=50% align=left}`).join('\n\n'), true);
      flash(names.length === 1 ? `Added ${names[0]} to the library` : `Added ${names.length} images`);
    }
  }, [flash]);
  useEffect(() => {
    const imgs = (dt) => [...((dt && dt.files) || [])].filter((f) => /^image\//.test(f.type));
    const onPaste = (e) => { if (e.defaultPrevented || e.target.closest('.cm-editor, input, textarea')) return; const f = imgs(e.clipboardData); if (f.length) { e.preventDefault(); addImages(f); } };
    const onDrop = (e) => { if (e.defaultPrevented || e.target.closest('.cm-editor')) return; const f = imgs(e.dataTransfer); if (f.length) { e.preventDefault(); addImages(f); } };
    const onOver = (e) => { if (e.target.closest('.cm-editor')) return; if (imgs(e.dataTransfer).length || (e.dataTransfer && [...e.dataTransfer.types].includes('Files'))) e.preventDefault(); };
    window.addEventListener('paste', onPaste); window.addEventListener('drop', onDrop); window.addEventListener('dragover', onOver);
    return () => { window.removeEventListener('paste', onPaste); window.removeEventListener('drop', onDrop); window.removeEventListener('dragover', onOver); };
  }, [addImages]);

  /* ---- preview interactions: a click jumps the caret to the source and,
     when the Theme tab is showing, brings that element's section into view ---- */
  const onBlockClick = (info) => {
    if (!info) { setPageFocus(null); return; }
    if (bus.current.md) bus.current.md.gotoLine(info.line, { y: 'center' });
    setCurrentLine(info.line);
    setPageFocus({ line: info.line, kind: info.kind, at: Date.now() });
  };
  // the tag above an outlined block: open its controls in the Theme tab
  const onEditStyle = useCallback(({ kind, line }) => {
    setU({ tab: 'theme' });
    setPageFocus({ line, kind, at: Date.now() });
  }, []);
  const onCaret = useCallback((line, focused) => { setCurrentLine(line); setEditorFocused(focused); if (focused) setPageFocus(null); }, []);
  // the outline on the page exists while the editor has focus, or after a click on the page
  const highlightLine = editorFocused ? currentLine : (pageFocus ? pageFocus.line : null);
  const onScrollLine = useCallback((line) => { if (bus.current.md && !bus.current.md.view.hasFocus) bus.current.md.scrollToLine(line); }, []);
  const onPages = useCallback((n, text) => {
    const words = (text.trim().match(/\S+/g) || []).length;
    setStats((s) => (s.pages === n && s.words === words ? s : { pages: n, words })); // same numbers: no re-render
  }, []);
  const onFitZoom = useCallback((z) => setFitZoom(z), []);

  // image attributes live in the markdown; the Theme tab edits them on the caret's line
  const caretImage = useMemo(() => {
    const m = bus.current.md;
    if (currentLine == null || !m) return null;
    const text = m.getLine(currentLine);
    if (!text) return null;
    const ref = /!\[[^\]]*\]\(\s*([^)\s"]+)/.exec(text);
    if (!ref) return null;
    const name = ref[1];
    return {
      name, attrs: Dialect.getImageAttrs(text, name) || {},
      set: (patch) => { const cur = m.getLine(currentLine); const next = Dialect.setImageAttrs(cur, name, patch); if (next != null && next !== cur) m.setLine(currentLine, next); },
    };
  }, [currentLine, md]);

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
      if (e.key === 'Escape') setDocDlg(false);
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

  const loadSample = async (sample) => {
    const isSample = DEMO.SAMPLES.some((x) => x.md === md);
    if (md.trim() && !isSample && !confirm('Replace the current document? There is no undo for this.')) return;
    setDocDlg(false);
    if (sample.id === 'demo') await DEMO.seed(Library);
    bus.current.md.setDoc(sample.md); setMd(sample.md);
    if (sample.theme) { const t = getTheme(sample.theme); setThemeId(t.id); setVars(expandTheme(t.vars)); }
    setU({ tab: 'md' });
    if (!sample.md) bus.current.md.focus(); else flash(sample.label + ' loaded');
  };

  const zoomShown = ui.zoom == null ? fitZoom : ui.zoom;
  const nudge = (d) => setU({ zoom: Math.max(0.15, Math.min(2.5, Math.round((zoomShown + d) * 100) / 100)) });
  // one object per change of vars: the preview re-paginates when this identity changes
  const pageVars = useMemo(() => { const o = {}; Object.keys(vars).forEach((k) => { o['--' + k] = vars[k]; }); return o; }, [vars]);

  if (!ready) return <div className="app booting" />;
  return (
    <div className={'app narrow-' + ui.narrow}>
      <header className="topbar">
        <div className="tb-left">
          <span className="brand" title="Markdown Studio"><LogoMark /></span>
          <button className="fmt pill" onClick={() => setDocDlg(true)}>New document</button>
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
          <div className="pane-head">
            <button className={'pane-tab' + (ui.tab === 'md' ? ' on' : '')} onClick={() => setU({ tab: 'md' })}>Markdown</button>
            <button className={'pane-tab' + (ui.tab === 'theme' ? ' on' : '')} onClick={() => setU({ tab: 'theme' })}>Theme<span className="pane-tab-sub">{getTheme(themeId).name}</span></button>
            {ui.tab === 'md'
              ? <><span className="pane-note">{construct}</span><span className="pane-hint">Type / for blocks</span></>
              : <span className="pane-hint">Click anything on the page to find its controls</span>}
          </div>
          <div className="pane-body" style={{ display: ui.tab === 'md' ? undefined : 'none' }}>
            <MarkdownPane initial={initialMd} bus={bus} onDocChange={setMd} onCaret={onCaret} onImageFiles={(files) => addImages(files)} onActive={setConstruct} />
          </div>
          {ui.tab === 'theme' && (
            <ThemePane themeId={themeId} applyTheme={applyTheme} vars={vars} setVar={setVar} onReset={resetKeys}
              focus={pageFocus} caretImage={caretImage} header={ui.header} footer={ui.footer} setHeader={(v) => setU({ header: v })} setFooter={(v) => setU({ footer: v })}
              open={ui.thOpen || {}} setOpen={(o) => setU({ thOpen: o })} />
          )}
        </div>
        <div className="divider" onMouseDown={onDividerDown} title="Drag to resize" />
        <div className="pane pane-pv">
          <div className="pane-head pane-head-pv">
            <span className="pane-title">Preview</span>
            <span className="pane-note">A4 · {stats.pages} {stats.pages === 1 ? 'page' : 'pages'} · {stats.words} words</span>
            <span className="pane-hint">Click anything on the page to go to its source</span>
          </div>
          <PreviewPane html={html} vars={pageVars} mode={ui.mode} zoom={ui.zoom} header={ui.header} footer={ui.footer}
            currentLine={highlightLine} caretDriven={editorFocused} onBlockClick={onBlockClick} onEditStyle={onEditStyle} onScrollLine={onScrollLine}
            onPages={onPages} onFitZoom={onFitZoom} bus={bus} />
        </div>
      </div>

      {docDlg && (
        <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setDocDlg(false); }}>
          <div className="dlg" role="dialog">
            <div className="dlg-head"><span className="dlg-title">New document</span><button className="fmt ico" title="Close (Esc)" onClick={() => setDocDlg(false)}>✕</button></div>
            <div className="dlg-cards">
              {DEMO.SAMPLES.map((x) => (
                <button className="dlg-card" key={x.id} onClick={() => loadSample(x)}>
                  <span className="dlg-card-label">{x.label}</span>
                  <span className="dlg-card-note">{x.note}</span>
                  {x.theme && <span className="dlg-card-theme">{getTheme(x.theme).name} theme</span>}
                </button>
              ))}
            </div>
            <div className="dlg-foot">
              <span>Everything stays in this browser — nothing is uploaded or saved elsewhere.</span>
              {unusedImages.length > 0 && <button className="fmt small" onClick={() => { if (confirm(`Delete ${unusedImages.length} image${unusedImages.length === 1 ? '' : 's'} the document no longer references?`)) unusedImages.forEach((i) => Library.remove(i.name)); }}>Remove {unusedImages.length} unused image{unusedImages.length === 1 ? '' : 's'}</button>}
            </div>
          </div>
        </div>
      )}
      <div className={'toast' + (toast ? ' show' : '')}>{toast}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
