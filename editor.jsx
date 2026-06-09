/* global React, ReactDOM, marked, hljs, TurndownService, turndownPluginGfm, THEMES, FONTS, SAMPLE_MD, LEVELS, levelKeys, expandTheme, getTheme, CSS_ORDER */
const { useState, useEffect, useRef, useCallback, forwardRef, memo } = React;

const LS = { html: 'mdv4.html', theme: 'mdv2.theme', vars: 'mdv2.vars', zoom: 'mdv2.zoom3', rawZoom: 'mdv2.rawZoom2', open: 'mdv2.open', side: 'mdv2.side', seed: 'mdv.seed' };
const get = (k, f) => { try { const v = localStorage.getItem(k); return v == null ? f : v; } catch { return f; } };
const getJSON = (k, f) => { try { const v = localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch { return f; } };
const set = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch {} };

/* One-time seed: clear any previously saved document so the bundled sample shows.
   Bump SEED_VERSION whenever the default sample should be re-seeded. */
const SEED_VERSION = 'hyperloop-2';
(function seedSampleOnce() {
  try {
    if (get(LS.seed, null) !== SEED_VERSION) {
      localStorage.removeItem(LS.html);
      localStorage.removeItem('mdv2.title');
      set(LS.seed, SEED_VERSION);
    }
  } catch {}
})();

const getTheme = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
const escHTML = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const COLOR_SETS = {
  ink:    ['#1b1d22', '#13161b', '#2a2a2a', '#1c1a16', '#22303a', '#102a43'],
  accent: ['#2f64e6', '#0e8f6e', '#b8402a', '#8a2b21', '#6d4bd0', '#444444'],
  muted:  ['#6b7280', '#7d7368', '#9a9a9a', '#5b6470', '#8a8f98', '#a89f92'],
  rule:   ['#e6e8ec', '#eae3da', '#e1e6ea', '#dfe2e5', '#d8dde3', '#cdd3da'],
  codebg: ['#f4f5f8', '#f4f0e7', '#f4f7f9', '#f7f7f7', '#eef1f5', '#f0ece4'],
};

if (window.marked) marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });
const initialHTML = () => {
  const stored = get(LS.html, null);
  if (stored != null) return reflowHTML(stored);
  return window.marked ? marked.parse(SAMPLE_MD) : SAMPLE_MD;
};

/* ----- markdown <-> html helpers ---------------------------------------- */
const mdToHTML = (md) => (window.marked ? marked.parse(md || '') : escHTML(md || ''));
/* Un-wrap soft-wrapped prose: join a line onto the previous one when the previous
   line is "long" (i.e. it was hard-wrapped at a column), so paragraphs reflow and
   justify. Short lines (metadata, etc.) and structural lines keep their breaks. */
const WRAP_MIN = 62;
const isProseLine = (s) => s != null && s.trim() !== '' && !/^(\s*([-*+]|\d+\.|>|#{1,6}\s|\|)|```|~~~|    |\t)/.test(s);
function dewrap(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = out.length ? out[out.length - 1] : null;
    if (prev != null && isProseLine(prev) && isProseLine(line)
        && prev.replace(/\s+$/, '').length >= WRAP_MIN
        && !/ {2}$/.test(prev) && !/\\$/.test(prev)) {
      out[out.length - 1] = prev.replace(/\s+$/, '') + ' ' + line.replace(/^\s+/, '');
    } else {
      out.push(line);
    }
  }
  return out.join('\n');
}
const mdFileToHTML = (md) => mdToHTML(dewrap(md));
/* Same idea as dewrap, but applied to already-rendered HTML: within a paragraph,
   a <br> that follows a long run of text is a soft wrap → replace it with a space;
   a <br> after a short run (e.g. metadata) is intentional → keep it. Idempotent. */
function reflowHTML(html) {
  try {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('p, li').forEach((block) => {
      let lineLen = 0;
      Array.from(block.childNodes).forEach((node) => {
        if (node.nodeType === 1 && node.tagName === 'BR') {
          if (lineLen >= WRAP_MIN) { block.replaceChild(doc.createTextNode(' '), node); }
          else { lineLen = 0; }
        } else {
          lineLen += (node.textContent || '').length;
        }
      });
    });
    return doc.body.innerHTML;
  } catch { return html; }
}
let _td = null;
function htmlToMD(html) {
  if (!window.TurndownService) return html;
  if (!_td) {
    _td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*', hr: '---' });
    if (window.turndownPluginGfm) _td.use(window.turndownPluginGfm.gfm);
  }
  return _td.turndown(html || '');
}

/* ----- paste: always adopt page styling, never foreign HTML/CSS -------- */
const looksLikeMarkdown = (text) => {
  const t = String(text || '').trim();
  if (t.length < 2) return false;
  return /^#{1,6}\s/m.test(t) || /^```/m.test(t) || /^>\s/m.test(t)
    || /^\s*[-*+]\s/m.test(t) || /^\s*\d+\.\s/m.test(t) || /^\|.+\|/m.test(t)
    || /\[.+?\]\(.+?\)/.test(t) || /^---\s*$/m.test(t);
};
const htmlLooksStyled = (html) => /background(-color)?\s*:|hljs|monaco|class="[^"]*(?:highlight|token|cm-|language-)/i.test(html)
  || /<(?:pre|code|div|span)[^>]+style/i.test(html);
const ALLOWED_TAGS = new Set(['H1','H2','H3','H4','H5','H6','P','BR','UL','OL','LI','BLOCKQUOTE','PRE','CODE','TABLE','THEAD','TBODY','TR','TH','TD','A','STRONG','B','EM','I','S','DEL','HR','IMG','SUP','SUB']);
function unwrapNode(node) {
  const parent = node.parentNode;
  if (!parent) return;
  while (node.firstChild) parent.insertBefore(node.firstChild, node);
  parent.removeChild(node);
}
function flattenPre(pre, doc) {
  const text = (pre.textContent || '').replace(/\n$/, '');
  pre.innerHTML = '';
  const code = doc.createElement('code');
  code.textContent = text;
  pre.appendChild(code);
}
function sanitizePastedHTML(html) {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  doc.body.querySelectorAll('script, style, meta, link, head').forEach((n) => n.remove());
  const clean = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType !== 1) return;
      const tag = child.tagName;
      if (tag === 'SPAN' || tag === 'FONT' || !ALLOWED_TAGS.has(tag)) { unwrapNode(child); clean(node); return; }
      if (tag === 'DIV') { unwrapNode(child); clean(node); return; }
      [...child.attributes].forEach((a) => {
        if (tag === 'A' && a.name === 'href') return;
        if (tag === 'IMG' && (a.name === 'src' || a.name === 'alt')) return;
        child.removeAttribute(a.name);
      });
      if (tag === 'PRE') flattenPre(child, doc);
      clean(child);
    });
  };
  clean(doc.body);
  return reflowHTML(doc.body.innerHTML);
}
function pasteToHTML(plain, html) {
  if (plain && (looksLikeMarkdown(plain) || (html && htmlLooksStyled(html))))
    return reflowHTML(mdFileToHTML(plain));
  if (html) return sanitizePastedHTML(html);
  return reflowHTML(mdToHTML(plain));
}

const ICON = { w: 17, h: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const PrintIcon = () => (
  <svg width={ICON.w} height={ICON.h} viewBox={ICON.viewBox} fill={ICON.fill} stroke={ICON.stroke} strokeWidth={ICON.strokeWidth} strokeLinecap={ICON.strokeLinecap} strokeLinejoin={ICON.strokeLinejoin}>
    <path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 14h12v7H6z" />
  </svg>
);
const ChevLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
);
const ChevRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
);
const MarkdownIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="6" width="19" height="12" rx="2.4" />
    <path d="M6 15V9l2.6 2.8L11.2 9v6" />
    <path d="M16.4 9v6M16.4 15l-1.9-2.1M16.4 15l1.9-2.1" />
  </svg>
);
const DocumentIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h6" />
  </svg>
);

/* ============================ Editable A4 surface ============================
   Memoized + ref-forwarded so React never reconciles (and never wipes) the
   contenteditable content. All live state flows through `bus` (a stable ref). */
const EditorSurface = memo(forwardRef(function EditorSurface({ bus }, ref) {
  const docRef = useRef(null);
  const pageLocal = useRef(null);
  const [sheets, setSheets] = useState({ tops: [0], h: 0, gap: 0 }); // A4 page sheets behind the content
  const [selBox, setSelBox] = useState(null); // overlay box over the targeted image
  const selIdx = useRef(null);
  const setPage = (node) => {
    pageLocal.current = node;
    if (typeof ref === 'function') ref(node); else if (ref) ref.current = node;
  };
  useEffect(() => {
    const el = docRef.current;
    const pageEl = pageLocal.current;
    const highlight = () => { if (window.hljs) el.querySelectorAll('pre code').forEach((c) => { try { hljs.highlightElement(c); } catch {} }); };

    /* ---- pagination: lay content out onto real A4 sheets with whitespace ---- */
    const contentBlocks = () => Array.prototype.filter.call(el.children, (n) => n.nodeType === 1 && !n.classList.contains('pg-spacer'));
    const clearSpacers = () => el.querySelectorAll('.pg-spacer').forEach((n) => n.remove());
    // clean HTML for persistence/output: never include the layout spacers
    const cleanedHTML = () => {
      const c = el.cloneNode(true);
      c.querySelectorAll('.pg-spacer').forEach((n) => n.remove());
      return c.innerHTML;
    };
    let lastSig = '';
    let busy = false;
    const layout = () => {
      const mmPx = pageEl.offsetWidth / 210;
      const A4h = mmPx * 297;
      const padY = parseFloat(getComputedStyle(el).paddingTop) || 0;
      const C = A4h - 2 * padY;                 // usable content height per page
      const gap = Math.round(mmPx * 7);         // visual gutter between sheets
      if (C <= 60) { setSheets({ tops: [0], h: Math.round(A4h) || 0, gap }); return; }
      const topOf = (p) => padY + p * (A4h + gap);          // content-area top of page p
      const botOf = (p) => topOf(p) + C;                    // content-area bottom of page p
      const EPS = 1.5;
      const pageOfTop = (y) => Math.max(0, Math.floor((y - padY + EPS) / (A4h + gap)));
      // place block b so its top lands at `want` (only ever pushes downward)
      const pushTo = (b, want) => {
        const cur = b.offsetTop;
        if (want <= cur + 0.5) return;
        const sp = document.createElement('div');
        sp.className = 'pg-spacer';
        sp.setAttribute('contenteditable', 'false');
        sp.style.height = (want - cur) + 'px';
        el.insertBefore(sp, b);
        for (let it = 0; it < 4; it++) {     // converge despite margin collapsing
          const d = want - b.offsetTop;
          if (Math.abs(d) < 0.6) break;
          sp.style.height = Math.max(0, parseFloat(sp.style.height) + d) + 'px';
        }
      };
      // save the caret so re-inserting spacers doesn't move it
      let caret = null;
      const s0 = window.getSelection();
      if (s0 && s0.rangeCount && el.contains(s0.anchorNode))
        caret = { a: s0.anchorNode, ao: s0.anchorOffset, f: s0.focusNode, fo: s0.focusOffset };
      clearSpacers();
      let page = 0;
      const blocks = contentBlocks();
      for (let bi = 0; bi < blocks.length; bi++) {
        const b = blocks[bi];
        let top = b.offsetTop;
        let h = b.offsetHeight;
        let p = Math.max(page, pageOfTop(top));
        // a block "fits" only if it sits inside page p's content area without overflowing
        const fits = top >= topOf(p) - EPS && top + h <= botOf(p) + EPS;
        if (!fits) {
          if (h <= C + EPS) {
            p += 1; pushTo(b, topOf(p));        // move the whole block onto the next page
          } else if (top > topOf(p) + EPS) {
            p += 1; pushTo(b, topOf(p));        // oversized: start it at a page top, then it spans
          }
          top = b.offsetTop; h = b.offsetHeight;
        }
        page = Math.max(page, p, pageOfTop(top + Math.max(0, h - EPS)));
      }
      if (caret) { try { const s = window.getSelection(); const r = document.createRange(); r.setStart(caret.a, caret.ao); r.setEnd(caret.f, caret.fo); s.removeAllRanges(); s.addRange(r); } catch {} }
      const count = page + 1;
      const tops = [];
      for (let i = 0; i < count; i++) tops.push(Math.round(i * (A4h + gap)));
      setSheets({ tops, h: Math.round(A4h), gap });
      if (bus.current.reportPages) bus.current.reportPages(count);
      positionSel();
    };
    const recompute = () => {
      if (!pageEl || busy) return;
      const padY = parseFloat(getComputedStyle(el).paddingTop) || 0;
      const sig = Math.round(pageEl.offsetWidth) + '|' + Math.round(padY) + '|'
        + contentBlocks().map((b) => Math.round(b.offsetHeight)).join(',');
      if (sig === lastSig) return;
      lastSig = sig;
      busy = true;
      try { layout(); } finally { busy = false; }
    };
    const relayout = () => { lastSig = ''; recompute(); }; // force after content replace

    // draw/refresh the highlight box over the currently targeted image
    const positionSel = () => {
      const i = selIdx.current;
      if (i == null) { setSelBox(null); return; }
      const im = el.querySelectorAll('img')[i];
      if (!im) { setSelBox(null); return; }
      setSelBox({ top: im.offsetTop, left: im.offsetLeft, width: im.offsetWidth, height: im.offsetHeight, n: i + 1 });
    };
    const stored = get(LS.html, null);
    if (stored != null) {
      el.innerHTML = reflowHTML(stored);
      highlight(); bus.current.report(el); relayout();
    } else {
      // first run (or after a cache reset): start from the bundled sample report
      el.innerHTML = mdToHTML(SAMPLE_MD);
      highlight(); bus.current.report(el); relayout();
    }
    const ro = new ResizeObserver(() => recompute());
    ro.observe(el); ro.observe(pageEl);
    requestAnimationFrame(() => relayout()); // re-run once App has wired report callbacks
    const onInput = () => { set(LS.html, cleanedHTML()); bus.current.report(el); recompute(); };
    el.addEventListener('input', onInput);
    // selecting an image by clicking it (native click selection is unreliable in contenteditable)
    const onClick = (e) => {
      const img = e.target && e.target.closest && e.target.closest('img');
      if (!img || !el.contains(img)) return;
      try { const r = document.createRange(); r.selectNode(img); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch {}
    };
    el.addEventListener('click', onClick);
    const insertImg = (url) => {
      if (el.querySelectorAll('img').length >= 99) { if (bus.current.flash) bus.current.flash('Maximum 99 images'); return false; }
      el.focus();
      document.execCommand('insertHTML', false, `<img src="${url}" alt="" />`);
      set(LS.html, cleanedHTML());
      bus.current.report(el);
      relayout();
      return true;
    };
    const onPaste = (e) => {
      const cd = e.clipboardData;
      if (!cd) return;
      const items = cd.items || [];
      for (const it of items) {
        if (it.type && it.type.indexOf('image/') === 0) {
          const file = it.getAsFile();
          if (!file) continue;
          e.preventDefault();
          const fr = new FileReader();
          fr.onload = () => insertImg(String(fr.result));
          fr.readAsDataURL(file);
          return;
        }
      }
      const plain = cd.getData('text/plain') || '';
      const html = cd.getData('text/html') || '';
      if (!plain && !html) return;
      e.preventDefault();
      const insert = pasteToHTML(plain, html);
      el.focus();
      document.execCommand('insertHTML', false, insert);
      if (window.hljs) el.querySelectorAll('pre code').forEach((c) => { try { hljs.highlightElement(c); } catch {} });
      set(LS.html, cleanedHTML());
      bus.current.report(el);
      relayout();
    };
    el.addEventListener('paste', onPaste);
    bus.current.focus = () => el.focus();
    bus.current.insertImage = insertImg;
    bus.current.imageCount = () => el.querySelectorAll('img').length;
    bus.current.getImageWidth = (i) => {
      const im = el.querySelectorAll('img')[i];
      return im ? (im.style.width || '100%') : '100%';
    };
    bus.current.setImageWidth = (i, w) => {
      const im = el.querySelectorAll('img')[i];
      if (!im) return;
      im.style.width = w;
      set(LS.html, cleanedHTML());
      bus.current.report(el);
      relayout();
      positionSel();
      requestAnimationFrame(() => { relayout(); positionSel(); }); // re-fit once the image height settles
    };
    bus.current.getImageAlign = (i) => {
      const im = el.querySelectorAll('img')[i];
      if (!im) return 'center';
      const l = im.style.marginLeft, r = im.style.marginRight;
      if (l === 'auto' && r === 'auto') return 'center';
      if (l === 'auto') return 'right';
      if (r === 'auto') return 'left';
      return 'center';
    };
    bus.current.setImageAlign = (i, a) => {
      const im = el.querySelectorAll('img')[i];
      if (!im) return;
      im.style.marginLeft = a === 'left' ? '0' : 'auto';
      im.style.marginRight = a === 'right' ? '0' : 'auto';
      set(LS.html, cleanedHTML());
      relayout();
      positionSel();
    };
    bus.current.highlightImage = (i) => { selIdx.current = i; positionSel(); };
    bus.current.getDoc = () => cleanedHTML();
    bus.current.setDoc = (html) => {
      el.innerHTML = reflowHTML(html); // join soft-wrapped lines so prose justifies, on every path
      highlight();
      set(LS.html, cleanedHTML());
      bus.current.report(el);
      relayout();
    };
    return () => { el.removeEventListener('input', onInput); el.removeEventListener('paste', onPaste); el.removeEventListener('click', onClick); ro.disconnect(); };
  }, []);
  const stackH = sheets.h ? sheets.tops[sheets.tops.length - 1] + sheets.h : undefined;
  return (
    <div className="page" ref={setPage} style={{ height: stackH ? stackH + 'px' : undefined }}>
      {sheets.tops.map((top, i) => (
        <div className="sheet" key={i} contentEditable={false} style={{ top: top + 'px', height: sheets.h + 'px' }}>
          <span className="sheet-label">Page {i + 1}</span>
        </div>
      ))}
      <div className="doc" contentEditable suppressContentEditableWarning ref={docRef} spellCheck={false} />
      {selBox && (
        <div className="img-sel-box" contentEditable={false}
          style={{ top: selBox.top + 'px', left: selBox.left + 'px', width: selBox.width + 'px', height: selBox.height + 'px' }}>
          <span className="img-sel-tag">Image {String(selBox.n).padStart(2, '0')}</span>
        </div>
      )}
    </div>
  );
}));

/* ============================ Sidebar controls ============================ */
function Section({ title, children }) {
  return (
    <div className="side-section">
      <div className="side-head"><span className="t">{title}</span></div>
      <div className="side-body">{children}</div>
    </div>
  );
}
const Field = ({ label, value, children }) => (
  <div className="field">
    <div className="field-row"><label>{label}</label>{value != null && <span className="v">{value}</span>}</div>
    {children}
  </div>
);
function Seg({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.v} className={value === o.v ? 'sel' : ''} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}
function Chips({ value, options, onChange, disabled }) {
  const cur = (value || '').toLowerCase();
  return (
    <div className="chips">
      {options.map((c) => (
        <button key={c} className={'chip' + (c.toLowerCase() === cur ? ' sel' : '')} style={{ background: c }} title={c} disabled={disabled} onClick={() => onChange(c)} />
      ))}
      <input type="color" value={/^#([0-9a-f]{6})$/i.test(cur) ? cur : '#000000'} disabled={disabled} onChange={(e) => onChange(e.target.value)} title="Custom" />
    </div>
  );
}

/* ===================== Theme picker (hover dropdown) ===================== */
function ThemeMenu({ currentId, onApply }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const closeT = useRef(null);
  const cancelClose = () => { if (closeT.current) { clearTimeout(closeT.current); closeT.current = null; } };
  const openNow = () => { cancelClose(); setOpen(true); };
  const closeSoon = () => { cancelClose(); closeT.current = setTimeout(() => setOpen(false), 180); };
  useEffect(() => () => cancelClose(), []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const cur = getTheme(currentId);
  return (
    <div className="tsel" ref={ref} onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button className={'tsel-btn' + (open ? ' open' : '')} onClick={() => (open ? setOpen(false) : openNow())}>
        <span>{cur.name}</span>
        <span className="tsel-chev">▾</span>
      </button>
      {open && (
        <div className="tsel-pop">
          <div className="tsel-group">
            <div className="tsel-glabel">Themes</div>
            {THEMES.map((t) => (
              <button key={t.id} className={'tsel-item' + (t.id === currentId ? ' sel' : '')}
                onClick={() => { onApply(t); setOpen(false); }}>
                <span className="tsel-aa" style={{ background: t.vars.paper, color: t.vars.ink, fontFamily: t.vars['font-head'] }}>Aa</span>
                <span className="tsel-name">{t.name}</span>
                {t.id === currentId && <span className="tsel-cur">current</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Per-level text-style panel (tabbed) ===================== */
const CASES = ['none', 'uppercase', 'capitalize'];
const CASE_GLYPH = { none: 'Aa', uppercase: 'AG', capitalize: 'Ab' };

function MiniStep({ label, value, unit, step, min, max, onChange }) {
  const num = parseFloat(value);
  const cur = Number.isFinite(num) ? num : 0;
  const dp = (step % 1 !== 0) ? String(step).split('.')[1].length : 0;
  const clampSet = (nv) => {
    let v = nv;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    onChange((dp ? v.toFixed(dp).replace(/\.?0+$/, '') : Math.round(v)) + (unit || ''));
  };
  return (
    <div className="ministep">
      <span className="ml">{label}</span>
      <div className="ministep-ctl">
        <button onClick={() => clampSet(cur - step)} title="Decrease">−</button>
        <input type="number" value={Number.isFinite(num) ? num : ''} step={step} min={min} max={max}
          onChange={(e) => onChange((e.target.value === '' ? '0' : e.target.value) + (unit || ''))} />
        <button onClick={() => clampSet(cur + step)} title="Increase">+</button>
      </div>
    </div>
  );
}

const Toggle = ({ on, onChange, disabled }) => (
  <span className="toggle"><button className={on ? 'on' : ''} disabled={disabled} onClick={() => onChange(!on)} /></span>
);

function LevelPanel({ lvl, vars, setVar }) {
  const k = levelKeys(lvl.key);
  const cs = vars[k.case] || 'none';
  const cycle = () => { const i = CASES.indexOf(cs); setVar(k.case, CASES[(i + 1) % CASES.length]); };
  const barOn = k.bar ? (vars[k.bar] !== '0' && vars[k.bar] != null && parseFloat(vars[k.bar]) !== 0) : false;
  return (
    <div className="lvl-panel">
      <select className="cell-font" value={vars[k.font]} onChange={(e) => setVar(k.font, e.target.value)}>
        {FONTS.map((f) => <option key={f.label} value={f.stack}>{f.label}</option>)}
      </select>
      <div className="lvl-grid">
        <MiniStep label="Size" unit="px" step={0.5} min={6} value={vars[k.size]} onChange={(v) => setVar(k.size, v)} />
        <MiniStep label="Weight" step={50} min={100} max={900} value={vars[k.weight]} onChange={(v) => setVar(k.weight, v)} />
        <MiniStep label="Line height" step={0.02} min={0.8} value={vars[k.lh]} onChange={(v) => setVar(k.lh, v)} />
        <MiniStep label="Letter" unit="em" step={0.005} value={vars[k.track]} onChange={(v) => setVar(k.track, v)} />
        <MiniStep label="Space above" unit="em" step={0.05} min={0} value={vars[k.spaceA]} onChange={(v) => setVar(k.spaceA, v)} />
        <MiniStep label="Space below" unit="em" step={0.05} min={0} value={vars[k.spaceB]} onChange={(v) => setVar(k.spaceB, v)} />
      </div>
      <div className="lvl-pills">
        <button className="pill" title={'Case: ' + cs} onClick={cycle}>
          <span className="pk">Case</span>
          <span className="pv">{CASE_GLYPH[cs] || 'Aa'}</span>
        </button>
        {k.bar && (
          <button className={'pill' + (barOn ? ' on' : '')} title="Toggle under-bar" onClick={() => setVar(k.bar, barOn ? '0' : '1')}>
            <span className="pk">Under-bar</span>
            <span className="pv">{barOn ? 'On' : 'Off'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ===================== Element-style panels (body section) ===================== */
function QuotePanel({ vars, setVar }) {
  const italic = (vars['bq-style'] || 'italic') !== 'normal';
  return (
    <div className="lvl-panel elt-panel">
      <Field label="Border color"><Chips value={vars['bq-border']} options={COLOR_SETS.accent} onChange={(v) => setVar('bq-border', v)} /></Field>
      <Field label="Text color"><Chips value={vars['bq-color']} options={COLOR_SETS.muted} onChange={(v) => setVar('bq-color', v)} /></Field>
      <div className="lvl-grid one">
        <MiniStep label="Border width" unit="px" step={1} min={0} max={12} value={vars['bq-border-w']} onChange={(v) => setVar('bq-border-w', v)} />
      </div>
      <div className="lvl-pills">
        <button className={'pill' + (italic ? ' on' : '')} title="Toggle italic" onClick={() => setVar('bq-style', italic ? 'normal' : 'italic')}>
          <span className="pk">Italic</span>
          <span className="pv">{italic ? 'On' : 'Off'}</span>
        </button>
      </div>
    </div>
  );
}
function LinkPanel({ vars, setVar }) {
  const ul = (vars['link-deco'] || 'none') === 'underline';
  return (
    <div className="lvl-panel elt-panel">
      <Field label="Color"><Chips value={vars['link-color']} options={COLOR_SETS.accent} onChange={(v) => setVar('link-color', v)} /></Field>
      <div className="lvl-pills">
        <button className={'pill' + (ul ? ' on' : '')} title="Toggle underline" onClick={() => setVar('link-deco', ul ? 'none' : 'underline')}>
          <span className="pk">Underline</span>
          <span className="pv">{ul ? 'On' : 'Off'}</span>
        </button>
      </div>
    </div>
  );
}
function ListPanel({ vars, setVar }) {
  return (
    <div className="lvl-panel elt-panel">
      <Field label="Marker color"><Chips value={vars['list-marker']} options={COLOR_SETS.muted} onChange={(v) => setVar('list-marker', v)} /></Field>
      <div className="lvl-grid">
        <MiniStep label="Item spacing" unit="em" step={0.05} min={0} value={vars['list-gap']} onChange={(v) => setVar('list-gap', v)} />
        <MiniStep label="Indent" unit="em" step={0.1} min={0} value={vars['list-indent']} onChange={(v) => setVar('list-indent', v)} />
      </div>
    </div>
  );
}
function TablePanel({ vars, setVar }) {
  return (
    <div className="lvl-panel elt-panel">
      <Field label="Header fill"><Chips value={vars['tbl-head-bg']} options={COLOR_SETS.codebg} onChange={(v) => setVar('tbl-head-bg', v)} /></Field>
      <Field label="Border color"><Chips value={vars['tbl-border']} options={COLOR_SETS.rule} onChange={(v) => setVar('tbl-border', v)} /></Field>
      <div className="lvl-grid">
        <MiniStep label="Cell pad ↕" unit="em" step={0.05} min={0} value={vars['tbl-pad-y']} onChange={(v) => setVar('tbl-pad-y', v)} />
        <MiniStep label="Cell pad ↔" unit="em" step={0.05} min={0} value={vars['tbl-pad-x']} onChange={(v) => setVar('tbl-pad-x', v)} />
      </div>
    </div>
  );
}

/* ============================ Format toolbar ============================ */
const TABLE_HTML = '<table><thead><tr><th>Header</th><th>Header</th><th>Header</th></tr></thead><tbody>'
  + '<tr><td>Cell</td><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td><td>Cell</td></tr></tbody></table><p><br></p>';
const TOOL = [
  { type: 'block', tag: 'P', label: 'Body', title: 'Body text', cls: 'h' },
  { type: 'block', tag: 'H1', label: 'H1', title: 'Heading 1', cls: 'h' },
  { type: 'block', tag: 'H2', label: 'H2', title: 'Heading 2', cls: 'h' },
  { type: 'block', tag: 'H3', label: 'H3', title: 'Heading 3', cls: 'h' },
  { sep: true },
  { type: 'cmd', cmd: 'bold', icon: 'bold', title: 'Bold' },
  { type: 'cmd', cmd: 'italic', icon: 'italic', title: 'Italic' },
  { type: 'cmd', cmd: 'strikeThrough', icon: 'strike', title: 'Strikethrough' },
  { sep: true },
  { type: 'cmd', cmd: 'insertUnorderedList', icon: 'bullet', title: 'Bullet list' },
  { type: 'cmd', cmd: 'insertOrderedList', icon: 'ordered', title: 'Numbered list' },
  { type: 'block', tag: 'BLOCKQUOTE', icon: 'quote', title: 'Quote' },
  { type: 'table', icon: 'table', title: 'Insert table' },
  { type: 'link', icon: 'link', title: 'Link' },
  { type: 'image', icon: 'image', title: 'Insert image' },
];
const ImageIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m4 17 5-5 4 4 3-3 4 4" />
  </svg>
);
const LinkIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 14.5 14.5 9.5" />
    <path d="M11 6.5 12.6 4.9a3.6 3.6 0 0 1 5.1 5.1L16 11.7" />
    <path d="M13 17.5 11.4 19.1a3.6 3.6 0 0 1-5.1-5.1L8 12.3" />
  </svg>
);
const BulletIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
const OrderedIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 6h10M10 12h10M10 18h10" />
    <path d="M3.6 5.2 5 4.6V10" strokeWidth="1.7" />
    <path d="M3.4 14.6c.3-.7 1-1 1.7-.9.8.1 1.2.8.9 1.5-.3.8-2.6 2-2.6 2.8H6" strokeWidth="1.7" />
  </svg>
);
const QuoteIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5v14" strokeWidth="2.6" />
    <path d="M10 8h10M10 13h10M10 18h6" strokeWidth="2" />
  </svg>
);
const TableIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4.5" width="18" height="15" rx="1.6" />
    <path d="M3 9.5h18M9 9.5v10M15 9.5v10" />
  </svg>
);
const BoldIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 5h6.2a3.2 3.2 0 0 1 0 6.4H7zM7 11.4h7a3.3 3.3 0 0 1 0 6.6H7z" />
  </svg>
);
const ItalicIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5h7M6 19h7M14.5 5 9.5 19" />
  </svg>
);
const StrikeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12h16" />
    <path d="M16.5 7.5C15.4 6.2 13.8 5.5 12 5.5c-2.5 0-4.1 1.3-4.1 3.1 0 1.2.8 2 2.3 2.6" />
    <path d="M7.7 16.2c1 1.5 2.6 2.3 4.4 2.3 2.6 0 4.2-1.3 4.2-3.2" />
  </svg>
);
const FMT_ICONS = { bold: BoldIcon, italic: ItalicIcon, strike: StrikeIcon, bullet: BulletIcon, ordered: OrderedIcon, quote: QuoteIcon, table: TableIcon, link: LinkIcon, image: ImageIcon };
const toolKey = (t) => t.type === 'block' ? 'block:' + t.tag : t.type === 'cmd' ? 'cmd:' + t.cmd : (t.type === 'link' || t.type === 'table') ? t.type : '';

/* Which toolbar tools match the current selection in the WYSIWYG document.
   Inline state is read from real wrapper tags (<b>/<strong>, <em>/<i>, ...)
   rather than queryCommandState, which falsely reports CSS-driven styles
   (e.g. a blockquote's italic font). */
function docActive(docEl) {
  const set = new Set();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !docEl.contains(sel.anchorNode)) return set;
  let node = sel.anchorNode;
  let el = node && node.nodeType === 3 ? node.parentElement : node;
  let inBlockquote = false, inUL = false, inOL = false, firstBlock = '', onImage = false, imgEl = null;
  // an image selected by click reports the anchor as its parent + an offset
  if (node && node.nodeType === 1) {
    const c = node.childNodes[sel.anchorOffset] || node.childNodes[sel.anchorOffset - 1];
    if (c && c.nodeName === 'IMG') { onImage = true; imgEl = c; }
    else if (node.nodeName === 'IMG') { onImage = true; imgEl = node; }
  }
  while (el && el !== docEl) {
    const tag = el.tagName;
    if (tag === 'EM' || tag === 'I') set.add('cmd:italic');
    if (tag === 'STRONG' || tag === 'B') set.add('cmd:bold');
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') set.add('cmd:strikeThrough');
    if (tag === 'A') set.add('link');
    if (tag === 'IMG') { onImage = true; imgEl = el; }
    if (tag === 'TABLE') set.add('table');
    if (tag === 'BLOCKQUOTE') inBlockquote = true;
    if (tag === 'UL') inUL = true;
    if (tag === 'OL') inOL = true;
    if (!firstBlock && /^(H1|H2|H3|H4|H5|H6|P)$/.test(tag)) firstBlock = tag;
    el = el.parentElement;
  }
  if (inUL) set.add('cmd:insertUnorderedList');
  if (inOL) set.add('cmd:insertOrderedList');
  if (!inUL && !inOL) {
    const block = inBlockquote ? 'BLOCKQUOTE' : firstBlock;
    if (/^H[123]$/.test(block) || block === 'BLOCKQUOTE' || block === 'P') set.add('block:' + block);
  }
  // sidebar-sync markers (ignored by the toolbar)
  set.add('lvl:' + (/^H[1-4]$/.test(firstBlock) ? firstBlock : 'P'));
  if (onImage) {
    set.add('el:image');
    const idx = imgEl ? Array.prototype.indexOf.call(docEl.querySelectorAll('img'), imgEl) : -1;
    if (idx >= 0) set.add('imgidx:' + idx);
  } else if (set.has('link')) set.add('el:link');
  else if (inUL || inOL) set.add('el:list');
  else if (inBlockquote) set.add('el:quote');
  else if (set.has('table')) set.add('el:table');
  return set;
}

/* Same idea for the raw markdown textarea, inferred from syntax around the caret. */
function rawActive(ta) {
  const set = new Set();
  if (!ta || ta.selectionStart == null) return set;
  const val = ta.value, start = ta.selectionStart, end = ta.selectionEnd;
  const lineStart = val.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = val.indexOf('\n', start); if (lineEnd === -1) lineEnd = val.length;
  const line = val.slice(lineStart, lineEnd);
  const h = line.match(/^(#{1,6})\s/);
  if (h) { const n = h[1].length; if (n <= 3) set.add('block:H' + n); }
  else if (/^\s*>\s?/.test(line)) set.add('block:BLOCKQUOTE');
  else if (/^\s*[-*+]\s+/.test(line)) set.add('cmd:insertUnorderedList');
  else if (/^\s*\d+\.\s+/.test(line)) set.add('cmd:insertOrderedList');
  else set.add('block:P');
  const selText = val.slice(start, end);
  const wraps = (m) => (selText.length >= 2 * m.length && selText.startsWith(m) && selText.endsWith(m))
    || (val.slice(Math.max(0, start - m.length), start) === m && val.slice(end, end + m.length) === m);
  if (wraps('**') || wraps('__')) set.add('cmd:bold');
  if (wraps('~~')) set.add('cmd:strikeThrough');
  const italic = () => {
    if (/^([*_])(?!\1)[\s\S]*[^*_]\1$/.test(selText) || /^([*_])[^*_]\1$/.test(selText)) return true;
    const b1 = val.slice(Math.max(0, start - 1), start), a1 = val.slice(end, end + 1);
    const b2 = val.slice(Math.max(0, start - 2), start), a2 = val.slice(end, end + 2);
    return (b1 === '*' && a1 === '*' && b2 !== '**' && a2 !== '**') || (b1 === '_' && a1 === '_' && b2 !== '__' && a2 !== '__');
  };
  if (italic()) set.add('cmd:italic');
  if (/\[[^\]]*\]\([^)]*\)/.test(selText)) set.add('link');
  if (/^\s*\|.*\|/.test(line)) set.add('table');
  // sidebar-sync markers
  set.add('lvl:' + (h && h[1].length <= 4 ? 'H' + h[1].length : 'P'));
  if (set.has('link')) set.add('el:link');
  else if (set.has('cmd:insertUnorderedList') || set.has('cmd:insertOrderedList')) set.add('el:list');
  else if (set.has('block:BLOCKQUOTE')) set.add('el:quote');
  else if (set.has('table')) set.add('el:table');
  return set;
}

function FormatBar({ exec, active, onPrint, disabled }) {
  const on = (t) => active && active.has(toolKey(t));
  return (
    <div className="format-bar">
      <div className={'fb-center' + (disabled ? ' is-disabled' : '')}>
        {TOOL.map((t, i) => t.sep
          ? <span key={i} className="fmt-sep" />
          : <button key={i} className={'fmt' + (t.cls ? ' ' + t.cls : '') + (t.icon ? ' ico' : '') + (on(t) ? ' active' : '')} title={t.title} disabled={disabled}
              onMouseDown={(e) => { e.preventDefault(); exec(t); }}>
              {t.icon ? React.createElement(FMT_ICONS[t.icon]) : t.em ? <em>I</em> : t.label}
            </button>)}
      </div>
      <div className="fb-right">
        <button className="fmt primary-fmt" title="Print / PDF  (⌘P)" onClick={onPrint}><PrintIcon /></button>
      </div>
    </div>
  );
}

/* ============================ Markdown syntax guide ============================ */
const MD_GUIDE = [
  ['Headings', [
    ['# Heading 1', 'Top-level title'],
    ['## Heading 2', 'Section'],
    ['### Heading 3', 'Sub-section'],
    ['#### Heading 4', 'Minor heading'],
  ]],
  ['Emphasis', [
    ['**bold**', 'Bold text'],
    ['*italic*', 'Italic text'],
    ['~~strike~~', 'Strikethrough'],
    ['`code`', 'Inline code'],
  ]],
  ['Lists', [
    ['- item', 'Bullet list'],
    ['1. item', 'Numbered list'],
    ['- [ ] task', 'Unchecked task'],
    ['- [x] done', 'Checked task'],
  ]],
  ['Blocks', [
    ['> quote', 'Blockquote'],
    ['```\\ncode\\n```', 'Fenced code block'],
    ['---', 'Horizontal rule'],
  ]],
  ['Links & media', [
    ['[text](url)', 'Hyperlink'],
    ['![alt](url)', 'Image'],
  ]],
  ['Tables', [
    ['| A | B |', 'Header row'],
    ['|---|---|', 'Separator'],
    ['| 1 | 2 |', 'Data row'],
  ]],
];
function MarkdownGuide() {
  return (
    <div className="md-guide">
      <div className="md-guide-intro">Markdown syntax reference</div>
      {MD_GUIDE.map(([group, rows]) => (
        <div className="mg-group" key={group}>
          <div className="mg-title">{group}</div>
          {rows.map(([syntax, desc]) => (
            <div className="mg-row" key={syntax}>
              <code className="mg-syntax">{syntax.replace(/\\n/g, '\u23ce')}</code>
              <span className="mg-desc">{desc}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ============================ App ============================ */
const FOOT_LABEL = { raw: 'MARKDOWN' };
const TARGET_LABEL = {
  h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4', p: 'Body text',
  quote: 'Blockquote', link: 'Link', list: 'List', table: 'Table', image: 'Image',
};
const TARGET_GROUPS = [
  { label: 'Text', items: [{ key: 'h1' }, { key: 'h2' }, { key: 'h3' }, { key: 'h4' }, { key: 'p' }] },
  { label: 'Elements', items: [{ key: 'quote', icon: 'quote' }, { key: 'link', icon: 'link' }, { key: 'list', icon: 'bullet' }, { key: 'table', icon: 'table' }] },
];
const COLOR_OPTS = { accent: COLOR_SETS.accent, muted: COLOR_SETS.muted, rule: COLOR_SETS.rule, codebg: COLOR_SETS.codebg };

/* Custom, on-design target picker (opens on hover or click). */
function TargetMenu({ value, current, vars, onChange, numLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const closeT = useRef(null);
  const cancelClose = () => { if (closeT.current) { clearTimeout(closeT.current); closeT.current = null; } };
  const openNow = () => { cancelClose(); setOpen(true); };
  const closeSoon = () => { cancelClose(); closeT.current = setTimeout(() => setOpen(false), 180); };
  useEffect(() => () => cancelClose(), []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className="tsel" ref={ref} onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button className={'tsel-btn' + (open ? ' open' : '')} onClick={() => (open ? setOpen(false) : openNow())}>
        <span>{TARGET_LABEL[value]}{value === 'image' && numLabel ? ' ' + numLabel : ''}</span>
        {!current
          ? <span className="tsel-cur tsel-cur-btn tsel-cur-none">no selection</span>
          : current === value
            ? <span className="tsel-cur tsel-cur-btn"><span className="tsel-dot" />selected</span>
            : <span className="tsel-cur tsel-cur-btn">in doc: {TARGET_LABEL[current]}</span>}
        <span className="tsel-chev">▾</span>
      </button>
      {open && (
        <div className="tsel-pop">
          {TARGET_GROUPS.map((g) => (
            <div className="tsel-group" key={g.label}>
              <div className="tsel-glabel">{g.label}</div>
              {g.items.map((it) => {
                const lvl = /^(h[1-4]|p)$/.test(it.key);
                const k = lvl ? levelKeys(it.key) : null;
                return (
                  <button key={it.key} className={'tsel-item' + (it.key === value ? ' sel' : '')}
                    onClick={() => { onChange(it.key); setOpen(false); }}>
                    {it.icon
                      ? <span className="tsel-ic">{React.createElement(FMT_ICONS[it.icon])}</span>
                      : <span className="tsel-prev" style={{ fontFamily: vars[k.font], fontWeight: vars[k.weight] }}>Ag</span>}
                    <span className="tsel-name">{TARGET_LABEL[it.key]}</span>
                    {it.key === current && <span className="tsel-cur">selection</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* small monochrome glyphs that prefix each inspector row label */
const PARAM_ICONS = {
  font: <><path d="M4 19 10 5h1.6L18 19" /><path d="M6.4 14h8.2" /></>,
  size: <><path d="M3 18 6.5 9 10 18" /><path d="M4 15.2h5" /><path d="M14.5 18 17 11.5 19.5 18" /><path d="M15.4 16h3.2" /></>,
  weight: <path d="M7 5h6a3 3 0 0 1 0 6H7zM7 11h7a3 3 0 0 1 0 6H7z" />,
  lh: <><path d="M10 6h10M10 12h10M10 18h10" /><path d="M4 5v14" /><path d="m2.4 7 1.6-2 1.6 2" /><path d="m2.4 17 1.6 2 1.6-2" /></>,
  letter: <><path d="M5 5v14M19 5v14" /><path d="M9 12h6" /><path d="m9 12 2-2M9 12l2 2" /><path d="m15 12-2-2M15 12l2 2" /></>,
  spaceA: <><path d="M4 4h16" /><path d="M12 7v4" /><path d="m9.5 9 2.5 2.5L14.5 9" /><rect x="6" y="14" width="12" height="6" rx="1.2" /></>,
  spaceB: <><rect x="6" y="4" width="12" height="6" rx="1.2" /><path d="M12 13v4" /><path d="m9.5 15 2.5 2.5 2.5-2.5" /><path d="M4 20h16" /></>,
  case: <><path d="M3 18 6 9l3 9" /><path d="M4 15h4" /><circle cx="16" cy="14.5" r="3.3" /><path d="M19.3 11.2v6.3" /></>,
  bar: <><path d="M6.5 13 9.5 6l3 7" /><path d="M7.6 11h3.8" /><path d="M4 19h16" strokeWidth="2.6" /></>,
  italic: <path d="M10 5h6M8 19h6M14.5 5 9.5 19" />,
  underline: <><path d="M7 5v6a5 5 0 0 0 10 0V5" /><path d="M6 20h12" /></>,
  color: <path d="M12 3.5c3.5 4 5.5 6.7 5.5 9.5a5.5 5.5 0 0 1-11 0c0-2.8 2-5.5 5.5-9.5z" />,
  border: <rect x="4.5" y="4.5" width="15" height="15" rx="2" />,
  borderw: <><path d="M4 8h16" strokeWidth="1.1" /><path d="M4 15h16" strokeWidth="3.4" /></>,
  marker: <><circle cx="6" cy="12" r="2.3" fill="currentColor" stroke="none" /><path d="M11 12h9" /></>,
  gap: <><path d="M9 7h11M9 17h11" /><circle cx="5" cy="7" r="1.5" fill="currentColor" stroke="none" /><circle cx="5" cy="17" r="1.5" fill="currentColor" stroke="none" /><path d="M5 10.5v3" /></>,
  indent: <><path d="M10 6h10M10 12h10M10 18h10" /><path d="m4 9 3 3-3 3z" fill="currentColor" stroke="none" /></>,
  fill: <><rect x="4" y="5" width="16" height="14" rx="1.5" /><path d="M4 10h16" /><rect x="5" y="6" width="14" height="3.4" fill="currentColor" stroke="none" opacity=".3" /></>,
  padY: <><rect x="4" y="5" width="16" height="14" rx="1.5" /><path d="M12 7.5v3M12 13.5v3" /></>,
  padX: <><rect x="4" y="5" width="16" height="14" rx="1.5" /><path d="M7.5 12h3M13.5 12h3" /></>,
  width: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M8 12h8" /><path d="m8 12 2-2M8 12l2 2" /><path d="m16 12-2-2M16 12l2 2" /></>,
  align: <path d="M5 6h14M5 12h9M5 18h14" />,
};
function RowIcon({ name }) {
  const inner = PARAM_ICONS[name];
  if (!inner) return null;
  return (
    <svg className="ir-ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{inner}</svg>
  );
}

/* font picker — hover dropdown that previews each face in its own typeface */
function FontMenu({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const closeT = useRef(null);
  const cancelClose = () => { if (closeT.current) { clearTimeout(closeT.current); closeT.current = null; } };
  const openNow = () => { if (disabled) return; cancelClose(); setOpen(true); };
  const closeSoon = () => { cancelClose(); closeT.current = setTimeout(() => setOpen(false), 180); };
  useEffect(() => () => cancelClose(), []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const cur = FONTS.find((f) => f.stack === value);
  return (
    <div className={'tsel tsel-font' + (disabled ? ' is-disabled' : '')} ref={ref} onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button className={'tsel-btn' + (open ? ' open' : '')} disabled={disabled} onClick={() => (open ? setOpen(false) : openNow())}>
        <span style={{ fontFamily: disabled ? undefined : value }}>{disabled ? '—' : (cur ? cur.label : 'Font')}</span>
        <span className="tsel-chev">▾</span>
      </button>
      {open && (
        <div className="tsel-pop">
          <div className="tsel-group">
            {FONTS.map((f) => (
              <button key={f.label} className={'tsel-item' + (f.stack === value ? ' sel' : '')}
                onClick={() => { onChange(f.stack); setOpen(false); }}>
                <span className="tsel-name" style={{ fontFamily: f.stack, fontSize: '14px' }}>{f.label}</span>
                {f.stack === value && <span className="tsel-cur">current</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* The unified, single-row style inspector. Every target shows the same row
   set; controls that don't apply to the current target are disabled. */
function inspectorRows(target) {
  // image is special: it's only reachable by clicking an image, and only sizes/aligns.
  // pad with empty rows so the inspector keeps the same height as every other style.
  if (target === 'image') {
    const rows = [
      { label: 'Width', icon: 'width', type: 'imgwidth', v: 'img', opts: [['50%', '\u00bd'], ['75%', '\u00be'], ['100%', 'Full']] },
      { label: 'Align', icon: 'align', type: 'imgalign', v: 'img', opts: [['left', '\u2190'], ['center', '\u2194'], ['right', '\u2192']] },
    ];
    const std = inspectorRows('p').length;
    let n = 0;
    while (rows.length < std) rows.push({ label: '', type: 'fill', v: null, _k: 'fill' + (n++) });
    return rows;
  }
  const lvl = /^(h[1-4]|p)$/.test(target);
  const k = lvl ? levelKeys(target) : {};
  return [
    { label: 'Font',        icon: 'font',   type: 'font',  v: lvl ? k.font : null },
    { label: 'Size',        icon: 'size',   type: 'step',  v: lvl ? k.size : null, unit: 'px', step: 0.5, min: 6 },
    { label: 'Weight',      icon: 'weight', type: 'step',  v: lvl ? k.weight : null, step: 50, min: 100, max: 900 },
    { label: 'Line height', icon: 'lh',     type: 'step',  v: lvl ? k.lh : null, step: 0.02, min: 0.8 },
    { label: 'Letter',      icon: 'letter', type: 'step',  v: lvl ? k.track : null, unit: 'em', step: 0.005 },
    { label: 'Space above', icon: 'spaceA', type: 'step',  v: lvl ? k.spaceA : null, unit: 'em', step: 0.05, min: 0 },
    { label: 'Space below', icon: 'spaceB', type: 'step',  v: lvl ? k.spaceB : null, unit: 'em', step: 0.05, min: 0 },
    { label: 'Case',        icon: 'case',   type: 'case',  v: lvl ? k.case : null },
    { label: 'Under-bar',   icon: 'bar',    type: 'toggle', v: lvl ? k.bar : null, on: '1', off: '0' },
    { label: 'Italic',      icon: 'italic', type: 'toggle', v: target === 'quote' ? 'bq-style' : null, on: 'italic', off: 'normal' },
    { label: 'Underline',   icon: 'underline', type: 'toggle', v: target === 'link' ? 'link-deco' : null, on: 'underline', off: 'none' },
    { label: 'Text color',  icon: 'color',  type: 'color', v: target === 'quote' ? 'bq-color' : target === 'link' ? 'link-color' : null, opts: target === 'link' ? 'accent' : 'muted' },
    { label: 'Border color',icon: 'border', type: 'color', v: target === 'quote' ? 'bq-border' : target === 'table' ? 'tbl-border' : null, opts: target === 'table' ? 'rule' : 'accent' },
    { label: 'Border width',icon: 'borderw',type: 'step',  v: target === 'quote' ? 'bq-border-w' : null, unit: 'px', step: 1, min: 0, max: 12 },
    { label: 'Marker color',icon: 'marker', type: 'color', v: target === 'list' ? 'list-marker' : null, opts: 'muted' },
    { label: 'Item spacing',icon: 'gap',    type: 'step',  v: target === 'list' ? 'list-gap' : null, unit: 'em', step: 0.05, min: 0 },
    { label: 'Indent',      icon: 'indent', type: 'step',  v: target === 'list' ? 'list-indent' : null, unit: 'em', step: 0.1, min: 0 },
    { label: 'Header fill', icon: 'fill',   type: 'color', v: target === 'table' ? 'tbl-head-bg' : null, opts: 'codebg' },
    { label: 'Cell pad \u2195', icon: 'padY', type: 'step', v: target === 'table' ? 'tbl-pad-y' : null, unit: 'em', step: 0.05, min: 0 },
    { label: 'Cell pad \u2194', icon: 'padX', type: 'step', v: target === 'table' ? 'tbl-pad-x' : null, unit: 'em', step: 0.05, min: 0 },
  ];
}
function RowStep({ value, unit, step, min, max, disabled, onChange }) {
  const num = parseFloat(value);
  const cur = Number.isFinite(num) ? num : 0;
  const dp = (step % 1 !== 0) ? String(step).split('.')[1].length : 0;
  const fmt = (x) => (dp ? x.toFixed(dp).replace(/\.?0+$/, '') : String(Math.round(x))) + (unit || '');
  const clamp = (x) => { if (min != null) x = Math.max(min, x); if (max != null) x = Math.min(max, x); return x; };
  const disp = (disabled || !Number.isFinite(num)) ? '—' : (dp ? +num.toFixed(dp) : num) + (unit || '');
  return (
    <div className="rstep">
      <button disabled={disabled} onClick={() => onChange(fmt(clamp(cur - step)))} title="Decrease">−</button>
      <span className="rv">{disp}</span>
      <button disabled={disabled} onClick={() => onChange(fmt(clamp(cur + step)))} title="Increase">+</button>
    </div>
  );
}
function RowControl({ row, vars, setVar, disabled, img }) {
  const v = row.v;
  const val = v ? vars[v] : undefined;
  if (row.type === 'imgwidth')
    return (
      <div className="ir-seg">
        {row.opts.map(([opt, lab]) => (
          <button key={opt} className={'ir-seg-b' + (!disabled && img && img.width === opt ? ' on' : '')}
            disabled={disabled || !(img && img.count)} onClick={() => img.setWidth(opt)}>{lab}</button>
        ))}
      </div>
    );
  if (row.type === 'imgalign') {
    const off = disabled || !(img && img.count) || (img && img.width === '100%'); // alignment is moot at full width
    return (
      <div className="ir-seg">
        {row.opts.map(([opt, lab]) => (
          <button key={opt} className={'ir-seg-b' + (!off && img && img.align === opt ? ' on' : '')}
            title={opt} disabled={off} onClick={() => img.setAlign(opt)}>{lab}</button>
        ))}
      </div>
    );
  }
  if (row.type === 'font')
    return <FontMenu value={val || ''} disabled={disabled} onChange={(stack) => setVar(v, stack)} />;
  if (row.type === 'step')
    return <RowStep value={val} unit={row.unit} step={row.step} min={row.min} max={row.max} disabled={disabled} onChange={(nv) => setVar(v, nv)} />;
  if (row.type === 'case') {
    const cs = val || 'none';
    const cycle = () => { const i = CASES.indexOf(cs); setVar(v, CASES[(i + 1) % CASES.length]); };
    return <button className="ir-btn" disabled={disabled} onClick={cycle}>{disabled ? '—' : (CASE_GLYPH[cs] || 'Aa')}</button>;
  }
  if (row.type === 'toggle') {
    const on = !disabled && val != null && val !== row.off && val !== '0';
    return <Toggle on={on} disabled={disabled} onChange={(o) => setVar(v, o ? row.on : row.off)} />;
  }
  if (row.type === 'color')
    return <Chips value={disabled ? '' : val} options={COLOR_OPTS[row.opts] || COLOR_SETS.accent} disabled={disabled} onChange={(c) => setVar(v, c)} />;
  return null;
}
function Inspector({ target, vars, setVar, img }) {
  return (
    <div className="insp">
      {inspectorRows(target).map((r) => {
        const off = !r.v;
        return (
          <div className={'irow' + (off ? ' off' : '') + (r.type === 'font' ? ' wide' : '') + (r.type === 'fill' ? ' fill' : '')} key={r._k || r.label}>
            <span className="ir-label">{r.icon && <RowIcon name={r.icon} />}<span className="ir-lt">{r.label}</span></span>
            <div className="ir-ctl"><RowControl row={r} vars={vars} setVar={setVar} disabled={off} img={img} /></div>
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const t0 = THEMES[0];
  const [themeId, setThemeId] = useState(() => get(LS.theme, t0.id));
  const [vars, setVars] = useState(() => {
    const persisted = getJSON(LS.vars, null);
    const base = expandTheme(getTheme(get(LS.theme, t0.id)).vars);
    return persisted ? { ...base, ...persisted, paper: '#ffffff' } : base;
  });
  const [zoom, setZoom] = useState(() => parseFloat(get(LS.zoom, '1')) || 1);
  const [rawZoom, setRawZoom] = useState(() => parseFloat(get(LS.rawZoom, '1')) || 1);
  const [openMap, setOpenMap] = useState(() => getJSON(LS.open, {}));
  const [sideOpen, setSideOpen] = useState(() => get(LS.side, '1') !== '0');
  const [stats, setStats] = useState({ words: 0, pages: 1 });
  const [toast, setToast] = useState('');
  const [view, setView] = useState('doc'); // 'doc' (WYSIWYG) | 'raw' (markdown source)
  const [rawMd, setRawMd] = useState('');
  const [target, setTarget] = useState('h1'); // which style the inspector edits
  const [docStyle, setDocStyle] = useState(null); // style of the element under the caret/selection
  const [active, setActive] = useState(() => new Set());
  const [imgIdx, setImgIdx] = useState(0);     // which image the Image style edits (0-based)
  const [imgCount, setImgCount] = useState(0); // images in the document
  const [imgWidth, setImgWidth] = useState('100%'); // selected image's current width
  const [imgAlign, setImgAlign] = useState('center'); // selected image's alignment

  const pageRef = useRef(null);
  const scrollRef = useRef(null);
  const imgRef = useRef(null);
  const rawRef = useRef(null);
  const autoTargetRef = useRef('h1'); // last caret-derived target (for sticky manual picks)
  const bus = useRef({ report: () => {}, focus: () => {}, getDoc: () => '', setDoc: () => {}, insertImage: () => {} });

  useEffect(() => { set(LS.theme, themeId); }, [themeId]);
  useEffect(() => { set(LS.vars, vars); }, [vars]);
  useEffect(() => { set(LS.zoom, String(zoom)); }, [zoom]);
  useEffect(() => { set(LS.rawZoom, String(rawZoom)); }, [rawZoom]);
  useEffect(() => { set(LS.open, openMap); }, [openMap]);
  useEffect(() => { set(LS.side, sideOpen ? '1' : '0'); }, [sideOpen]);

  const flash = (m) => { setToast(m); clearTimeout(flash._t); flash._t = setTimeout(() => setToast(''), 1300); };
  useEffect(() => { bus.current.flash = flash; });

  // apply CSS vars to the page element (never touches editable content)
  useEffect(() => {
    const el = pageRef.current; if (!el) return;
    Object.keys(vars).forEach((k) => el.style.setProperty('--' + k, vars[k]));
  }, [vars]);

  // measure words + page count
  const report = useCallback((el) => {
    const words = (el.innerText.trim().match(/\S+/g) || []).length;
    setStats((s) => ({ ...s, words }));
    setImgCount(el.querySelectorAll('img').length);
  }, []);
  useEffect(() => { bus.current.report = report; }, [report]);
  useEffect(() => { bus.current.reportPages = (n) => setStats((s) => ({ ...s, pages: Math.max(1, n) })); }, []);
  useEffect(() => { if (pageRef.current) report(pageRef.current.querySelector('.doc')); }, [vars, zoom, report]);

  const setVar = (k, v) => setVars((p) => ({ ...p, [k]: v }));
  const applyTheme = (t) => { setThemeId(t.id); setVars(expandTheme(t.vars)); flash(t.name + ' theme'); };

  // switch between doc (WYSIWYG), raw (markdown source) and css (read-only theme variables)
  const toView = (v) => {
    if (v === view) return;
    if (view === 'raw') bus.current.setDoc(mdToHTML(rawMd)); // commit raw edits to the document
    if (v === 'raw') setRawMd(htmlToMD(bus.current.getDoc()));
    setView(v);
  };

  // print: zero the @page margin so the browser injects no header/footer stamps;
  // the page padding (matching the editor) provides the actual margins.
  useEffect(() => {
    let el = document.getElementById('print-page-style');
    if (!el) { el = document.createElement('style'); el.id = 'print-page-style'; document.head.appendChild(el); }
    el.textContent = '@page { size: A4; margin: 0; }';
  }, []);

  // reflect the current selection's formatting in the toolbar (doc + raw)
  const refreshActive = useCallback(() => {
    let set = new Set();
    if (view === 'doc') {
      const docEl = pageRef.current && pageRef.current.querySelector('.doc');
      if (docEl) set = docActive(docEl);
    } else if (view === 'raw') {
      set = rawActive(rawRef.current);
    }
    setActive(set);
    // derive a single inspector target from the caret (element-priority, else text level)
    const D = set.has('el:image') ? 'image'
      : set.has('el:link') ? 'link'
      : set.has('el:list') ? 'list'
      : set.has('el:quote') ? 'quote'
      : set.has('el:table') ? 'table'
      : (['h1', 'h2', 'h3', 'h4'].find((h) => set.has('lvl:' + h.toUpperCase())) || (set.has('lvl:P') ? 'p' : null));
    setDocStyle(D || null);
    if (view === 'doc' && bus.current.imageCount) setImgCount(bus.current.imageCount());
    // when an image is under the caret, focus that exact one
    if (D === 'image') {
      let ii = null;
      set.forEach((s) => { if (s.indexOf('imgidx:') === 0) ii = parseInt(s.slice(7), 10); });
      if (ii != null) {
        setImgIdx(ii);
        if (bus.current.getImageWidth) setImgWidth(bus.current.getImageWidth(ii));
        if (bus.current.getImageAlign) setImgAlign(bus.current.getImageAlign(ii));
      }
    }
    // only retarget when the caret moves to a *different* block — so manual picks stick
    if (D && D !== autoTargetRef.current) { autoTargetRef.current = D; setTarget(D); }
  }, [view]);
  useEffect(() => {
    refreshActive();
    document.addEventListener('selectionchange', refreshActive);
    return () => document.removeEventListener('selectionchange', refreshActive);
  }, [refreshActive]);

  // highlight the targeted image in the document (and clear it otherwise)
  useEffect(() => {
    if (!bus.current.highlightImage) return;
    const showing = view === 'doc' && target === 'image' && imgCount > 0;
    bus.current.highlightImage(showing ? Math.min(imgIdx, imgCount - 1) : null);
    if (showing && bus.current.getImageWidth) setImgWidth(bus.current.getImageWidth(imgIdx));
    if (showing && bus.current.getImageAlign) setImgAlign(bus.current.getImageAlign(imgIdx));
  }, [view, target, imgIdx, imgCount]);

  const imgCtx = {
    count: imgCount, width: imgWidth, align: imgAlign,
    setWidth: (w) => { if (bus.current.setImageWidth) bus.current.setImageWidth(imgIdx, w); setImgWidth(w); },
    setAlign: (a) => { if (bus.current.setImageAlign) bus.current.setImageAlign(imgIdx, a); setImgAlign(a); },
  };

  const exec = (t) => {
    if (t.type === 'image') { imgRef.current && imgRef.current.click(); return; }
    bus.current.focus();
    if (t.type === 'cmd') document.execCommand(t.cmd, false, null);
    else if (t.type === 'block') document.execCommand('formatBlock', false, t.tag);
    else if (t.type === 'table') document.execCommand('insertHTML', false, TABLE_HTML);
    else if (t.type === 'link') { const u = prompt('Link URL'); if (u) document.execCommand('createLink', false, u); }
    const el = pageRef.current && pageRef.current.querySelector('.doc');
    if (el) { set(LS.html, el.innerHTML); report(el); }
    refreshActive();
  };

  /* ---- image insert ---- */
  const onPickImage = (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => { setView('doc'); bus.current.insertImage(String(fr.result)); };
    fr.readAsDataURL(file);
  };

  // keyboard: Alt+1..6 themes, Cmd/Ctrl+P print
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && !e.metaKey && !e.ctrlKey && /^[1-6]$/.test(e.key)) { const t = THEMES[+e.key - 1]; if (t) { e.preventDefault(); applyTheme(t); } }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); printRef.current(); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  const curZoom = view === 'raw' ? rawZoom : zoom;
  const nudge = (d) => {
    const apply = (z) => Math.max(0.4, Math.min(1.6, Math.round((z + d) * 100) / 100));
    if (view === 'raw') setRawZoom(apply); else setZoom(apply);
  };
  const doPrint = () => {
    const html = view === 'raw' ? mdFileToHTML(rawMd) : bus.current.getDoc();
    const old = document.getElementById('print-root');
    if (old) old.remove();
    const pr = document.createElement('div');
    pr.id = 'print-root';
    Object.keys(vars).forEach((k) => pr.style.setProperty('--' + k, vars[k]));
    // A <thead>/<tfoot> repeat on every printed page, so their height reserves a
    // top/bottom margin on EVERY page (not just first/last). @page margin is 0,
    // so the browser draws no header/footer stamps.
    pr.innerHTML =
      '<table class="print-sheet"><thead><tr><td><div class="pm-sp"></div></td></tr></thead>'
      + '<tbody><tr><td class="pm-body"><div class="doc">' + html + '</div></td></tr></tbody>'
      + '<tfoot><tr><td><div class="pm-sp"></div></td></tr></tfoot></table>';
    document.body.appendChild(pr);
    if (window.hljs) pr.querySelectorAll('pre code').forEach((c) => { try { hljs.highlightElement(c); } catch {} });
    const cleanup = () => { const n = document.getElementById('print-root'); if (n) n.remove(); window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };
  const printRef = useRef(doPrint); printRef.current = doPrint;

  // CSS variables as an inline style object, so raw/css surfaces honour page margin etc.
  const pageVars = {};
  Object.keys(vars).forEach((k) => { pageVars['--' + k] = vars[k]; });

  return (
    <div className="app">
      <input ref={imgRef} type="file" accept="image/*" hidden onChange={onPickImage} />
      <div className="workspace">
        <aside className={'sidebar' + (sideOpen ? '' : ' closed')}>
          <div className="side-top">
            <div className="side-views">
              <div className="seg view2">
                <button className={view === 'raw' ? 'sel' : ''} onClick={() => toView('raw')}><MarkdownIcon /><span>Markdown</span></button>
                <button className={view === 'doc' ? 'sel' : ''} onClick={() => toView('doc')}><DocumentIcon /><span>Document</span></button>
              </div>
              <button className="side-collapse" onClick={() => setSideOpen(false)} title="Collapse sidebar"><ChevLeft /></button>
            </div>
          </div>

          <div className="side-scroll">
            {view === 'raw' ? (
              <MarkdownGuide />
            ) : (
              <>
                <Section id="theme" title="Theme" openMap={openMap} setOpenMap={setOpenMap}>
                  <ThemeMenu currentId={themeId} onApply={applyTheme} />
                </Section>

                <Section title="Style">
                  <TargetMenu value={target} current={docStyle} vars={vars} onChange={setTarget}
                    numLabel={imgCount > 0 ? String(Math.min(imgIdx, imgCount - 1) + 1).padStart(2, '0') : ''} />
                  <Inspector target={target} vars={vars} setVar={setVar} img={imgCtx} />
                </Section>

                <Section id="page" title="Page" openMap={openMap} setOpenMap={setOpenMap}>
                  <div className="insp">
                    <div className="irow">
                      <span className="ir-label"><RowIcon name="padY" /><span className="ir-lt">Margin height</span></span>
                      <div className="ir-ctl"><RowStep value={vars['pad-y']} unit="mm" step={1} min={5} max={45} onChange={(v) => setVar('pad-y', v)} /></div>
                    </div>
                    <div className="irow">
                      <span className="ir-label"><RowIcon name="padX" /><span className="ir-lt">Margin width</span></span>
                      <div className="ir-ctl"><RowStep value={vars['pad-x']} unit="mm" step={1} min={5} max={45} onChange={(v) => setVar('pad-x', v)} /></div>
                    </div>
                  </div>
                </Section>
              </>
            )}
          </div>
        </aside>

        {!sideOpen && (
          <button className="reopen" onClick={() => setSideOpen(true)} title="Open sidebar"><ChevRight /></button>
        )}

        <div className="canvas">
          <FormatBar exec={exec} active={active} disabled={view !== 'doc'} onPrint={doPrint} />
          <div className="scroll" ref={scrollRef}>
            <div className="page-host" style={{ zoom, display: view === 'doc' ? undefined : 'none' }}>
              <EditorSurface ref={pageRef} bus={bus} />
            </div>
            {view === 'raw' && (
              <div className="raw-host" style={{ zoom: rawZoom, ...pageVars }}>
                <textarea className="raw-doc" spellCheck={false} value={rawMd} ref={rawRef}
                  onChange={(e) => { setRawMd(e.target.value); refreshActive(); }}
                  onSelect={refreshActive} onKeyUp={refreshActive} onClick={refreshActive} onFocus={refreshActive}
                  placeholder="# Markdown source…" />
              </div>
            )}
          </div>

          <div className={'toast' + (toast ? ' show' : '')}>{toast}</div>

          <div className="docfooter">
            <div className="foot-info">{FOOT_LABEL[view] ? FOOT_LABEL[view] : `A4 · ${stats.pages} ${stats.pages === 1 ? 'page' : 'pages'} · ${stats.words} words`}</div>
            <div className="zoom-pill">
              <button onClick={() => nudge(-0.1)} title="Zoom out">−</button>
              <span className="zv">{Math.round(curZoom * 100)}%</span>
              <button onClick={() => nudge(0.1)} title="Zoom in">+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
