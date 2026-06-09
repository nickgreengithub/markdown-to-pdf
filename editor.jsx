/* global React, ReactDOM, marked, hljs, TurndownService, turndownPluginGfm, JSZip, THEMES, FONTS, SAMPLE_MD, LEVELS, levelKeys, expandTheme, getTheme, CSS_ORDER */
const { useState, useEffect, useRef, useCallback, forwardRef, memo } = React;

const LS = { html: 'mdv3.html', title: 'mdv2.title', theme: 'mdv2.theme', vars: 'mdv2.vars', zoom: 'mdv2.zoom2', rawZoom: 'mdv2.rawZoom', open: 'mdv2.open', side: 'mdv2.side' };
const get = (k, f) => { try { const v = localStorage.getItem(k); return v == null ? f : v; } catch { return f; } };
const getJSON = (k, f) => { try { const v = localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch { return f; } };
const set = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch {} };

const getTheme = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
const cssLines = (v) => CSS_ORDER.filter((k) => v[k] != null).map((k) => `  --${k}: ${v[k]};`).join('\n');
const themeCSS = (v) => `:root {\n${cssLines(v)}\n}`;
const escHTML = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const highlightCSS = (css) => escHTML(css)
  .replace(/(--[\w-]+)(:)/g, '<span class="pp">$1</span>$2')
  .replace(/(: )([^;\n]+)(;)/g, '$1<span class="pv">$2</span>$3');

const COLOR_SETS = {
  ink:    ['#1b1d22', '#13161b', '#2a2a2a', '#1c1a16', '#22303a', '#102a43'],
  paper:  ['#ffffff', '#fffdf8', '#fcfbf9', '#f7f9fc'],
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
const slug = (s) => (String(s || '').trim() || 'document').replace(/[\\/:*?"<>|]+/g, '').slice(0, 80) || 'document';
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,300..700;1,400..600&family=Libre+Franklin:wght@400..700&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..600&family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..500&display=swap';
function downloadText(name, text, mime) {
  downloadBlob(name, new Blob([text], { type: mime }));
}
function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const MIME_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp' };
const EXT_MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp' };
function dataUriToBytes(uri) {
  const comma = uri.indexOf(',');
  const meta = uri.slice(5, comma);
  const mime = (meta.split(';')[0] || 'image/png').toLowerCase();
  const bin = atob(uri.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime };
}

/* Compact sample exercising every component, for the theme dialog preview */
const THEME_SAMPLE = `# Heading One
Body copy with **bold**, *italic*, a [link](#), and \`inline code\` to show tone.

## Heading Two
> A blockquote demonstrates the accent rule and muted text color.

- First bullet item
- Second bullet item

1. Ordered item one
2. Ordered item two

### Heading Three

\`\`\`js
function demo(x) { return x * 2; }
\`\`\`

| Column A | Column B |
|----------|----------|
| One      | Two      |
| Three    | Four     |

#### Heading Four
A final line of body text, followed by a horizontal rule.

---
`;
const themeSampleHTML = () => (window.marked ? marked.parse(THEME_SAMPLE) : THEME_SAMPLE);

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const ICON = { w: 17, h: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const OpenIcon = () => (
  <svg width={ICON.w} height={ICON.h} viewBox={ICON.viewBox} fill={ICON.fill} stroke={ICON.stroke} strokeWidth={ICON.strokeWidth} strokeLinecap={ICON.strokeLinecap} strokeLinejoin={ICON.strokeLinejoin}>
    <path d="M21 11.5V8a2 2 0 0 0-2-2h-6.5l-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" />
    <path d="M12 15h9" /><path d="m18 12 3 3-3 3" />
  </svg>
);
const SaveIcon = () => (
  <svg width={ICON.w} height={ICON.h} viewBox={ICON.viewBox} fill={ICON.fill} stroke={ICON.stroke} strokeWidth={ICON.strokeWidth} strokeLinecap={ICON.strokeLinecap} strokeLinejoin={ICON.strokeLinejoin}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <path d="M17 21v-8H7v8" /><path d="M7 3v5h8" />
  </svg>
);
const ExportIcon = () => (
  <svg width={ICON.w} height={ICON.h} viewBox={ICON.viewBox} fill={ICON.fill} stroke={ICON.stroke} strokeWidth={ICON.strokeWidth} strokeLinecap={ICON.strokeLinecap} strokeLinejoin={ICON.strokeLinejoin}>
    <path d="M12 3v12" /><path d="m8 11 4 4 4-4" />
    <path d="M5 21h14a2 2 0 0 0 2-2v-3" /><path d="M3 16v3a2 2 0 0 0 2 2" />
  </svg>
);
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
      // first run (or after a cache reset): start from the bundled Report.md
      el.innerHTML = mdToHTML(SAMPLE_MD);
      highlight(); bus.current.report(el); relayout();
      fetch('Report.md').then((r) => { if (!r.ok) throw 0; return r.text(); })
        .then((md) => { bus.current.setDoc(mdFileToHTML(md)); })
        .catch(() => {});
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
      const items = (e.clipboardData && e.clipboardData.items) || [];
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
function Stepper({ label, value, unit, step, min, max, onChange }) {
  const n = parseFloat(value);
  const cur = Number.isFinite(n) ? n : 0;
  const set = (nv) => onChange(Math.max(min, Math.min(max, Math.round(nv * 10) / 10)) + (unit || ''));
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-ctl">
        <button onClick={() => set(cur - step)} title="Decrease">−</button>
        <span className="sv">{cur}{unit}</span>
        <button onClick={() => set(cur + step)} title="Increase">+</button>
      </div>
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

/* ===================== Theme dialog ===================== */
function ThemeModal({ open, currentId, onApply, onClose }) {
  const [sel, setSel] = useState(currentId);
  const [tab, setTab] = useState('preview');
  useEffect(() => { if (open) { setSel(currentId); setTab('preview'); } }, [open, currentId]);
  if (!open) return null;
  const theme = getTheme(sel);
  const expanded = expandTheme(theme.vars);
  const css = themeCSS(expanded);
  const previewStyle = { background: expanded.paper, color: expanded.ink };
  Object.keys(expanded).forEach((k) => { previewStyle['--' + k] = expanded[k]; });
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <b>Themes</b><span className="sub">· {THEMES.length} presets</span>
          <button className="x" onClick={onClose} title="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="tlist">
            {THEMES.map((t) => (
              <button key={t.id} className={'trow' + (t.id === sel ? ' sel' : '')}
                onClick={() => setSel(t.id)} onDoubleClick={() => { onApply(t); onClose(); }}>
                <span className="aa" style={{ background: t.vars.paper, color: t.vars.ink, fontFamily: t.vars['font-head'] }}>Aa</span>
                <span className="tt"><span className="n">{t.name}</span></span>
                {t.id === currentId && <span className="cur">CURRENT</span>}
              </button>
            ))}
          </div>
          <div className="tpane">
            <div className="tpane-bar">
              <div className="tabs">
                <button className={tab === 'preview' ? 'sel' : ''} onClick={() => setTab('preview')}>Preview</button>
                <button className={tab === 'css' ? 'sel' : ''} onClick={() => setTab('css')}>CSS</button>
              </div>
              <div className="bar-right">
                <span className="nm">{theme.name}</span>
                {tab === 'css' && (
                  <button className="btn ghost" style={{ height: 28 }} onClick={() => { try { navigator.clipboard.writeText(css); } catch {} }}>Copy CSS</button>
                )}
              </div>
            </div>
            {tab === 'preview'
              ? <div className="tpreview" style={previewStyle}><div className="doc" dangerouslySetInnerHTML={{ __html: themeSampleHTML() }} /></div>
              : <pre className="tcss-pre" dangerouslySetInnerHTML={{ __html: highlightCSS(css) }} />}
          </div>
        </div>
        <div className="modal-foot">
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => { onApply(theme); onClose(); }}>Apply theme</button>
        </div>
      </div>
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

function FormatBar({ exec, active, onOpen, onSave, onExport, onPrint, disabled, title, setTitle }) {
  const on = (t) => active && active.has(toolKey(t));
  return (
    <div className="format-bar">
      <div className="fb-left">
        <button className="fmt" title="Open .md / .zip  (⌘O)" onClick={onOpen}><OpenIcon /></button>
        <label className="fb-titlebox" title="Document title (used as file name)">
          <input className="fb-title" size={Math.max((title || '').length, 4)} value={title}
            onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" />
          <span className="fb-ext">.md</span>
        </label>
      </div>
      <div className={'fb-center' + (disabled ? ' is-disabled' : '')}>
        {TOOL.map((t, i) => t.sep
          ? <span key={i} className="fmt-sep" />
          : <button key={i} className={'fmt' + (t.cls ? ' ' + t.cls : '') + (t.icon ? ' ico' : '') + (on(t) ? ' active' : '')} title={t.title} disabled={disabled}
              onMouseDown={(e) => { e.preventDefault(); exec(t); }}>
              {t.icon ? React.createElement(FMT_ICONS[t.icon]) : t.em ? <em>I</em> : t.label}
            </button>)}
      </div>
      <div className="fb-right">
        <button className="fmt" title="Save .md  (⌘S)" onClick={onSave}><SaveIcon /></button>
        <button className="fmt" title="Export HTML" onClick={onExport}><ExportIcon /></button>
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
const FOOT_LABEL = { raw: 'RAW MARKDOWN', css: 'THEME CSS' };
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

/* The unified, single-row style inspector. Every target shows the same row
   set; controls that don't apply to the current target are disabled. */
function inspectorRows(target) {
  // image is special: it's only reachable by clicking an image, and only sizes/aligns.
  // pad with empty rows so the inspector keeps the same height as every other style.
  if (target === 'image') {
    const rows = [
      { label: 'Width', type: 'imgwidth', v: 'img', opts: [['50%', '\u00bd'], ['75%', '\u00be'], ['100%', 'Full']] },
      { label: 'Align', type: 'imgalign', v: 'img', opts: [['left', '\u2190'], ['center', '\u2194'], ['right', '\u2192']] },
    ];
    const std = inspectorRows('p').length;
    let n = 0;
    while (rows.length < std) rows.push({ label: '', type: 'fill', v: null, _k: 'fill' + (n++) });
    return rows;
  }
  const lvl = /^(h[1-4]|p)$/.test(target);
  const k = lvl ? levelKeys(target) : {};
  const heading = /^h[1-4]$/.test(target);
  return [
    { label: 'Font',        type: 'font',  v: lvl ? k.font : null },
    { label: 'Size',        type: 'step',  v: lvl ? k.size : null, unit: 'px', step: 0.5, min: 6 },
    { label: 'Weight',      type: 'step',  v: lvl ? k.weight : null, step: 50, min: 100, max: 900 },
    { label: 'Line height', type: 'step',  v: lvl ? k.lh : null, step: 0.02, min: 0.8 },
    { label: 'Letter',      type: 'step',  v: lvl ? k.track : null, unit: 'em', step: 0.005 },
    { label: 'Space above', type: 'step',  v: lvl ? k.spaceA : null, unit: 'em', step: 0.05, min: 0 },
    { label: 'Space below', type: 'step',  v: lvl ? k.spaceB : null, unit: 'em', step: 0.05, min: 0 },
    { label: 'Case',        type: 'case',  v: lvl ? k.case : null },
    { label: 'Under-bar',   type: 'toggle', v: heading ? k.bar : null, on: '1', off: '0' },
    { label: 'Italic',      type: 'toggle', v: target === 'quote' ? 'bq-style' : null, on: 'italic', off: 'normal' },
    { label: 'Underline',   type: 'toggle', v: target === 'link' ? 'link-deco' : null, on: 'underline', off: 'none' },
    { label: 'Text color',  type: 'color', v: target === 'quote' ? 'bq-color' : target === 'link' ? 'link-color' : null, opts: target === 'link' ? 'accent' : 'muted' },
    { label: 'Border color',type: 'color', v: target === 'quote' ? 'bq-border' : target === 'table' ? 'tbl-border' : null, opts: target === 'table' ? 'rule' : 'accent' },
    { label: 'Border width',type: 'step',  v: target === 'quote' ? 'bq-border-w' : null, unit: 'px', step: 1, min: 0, max: 12 },
    { label: 'Marker color',type: 'color', v: target === 'list' ? 'list-marker' : null, opts: 'muted' },
    { label: 'Item spacing',type: 'step',  v: target === 'list' ? 'list-gap' : null, unit: 'em', step: 0.05, min: 0 },
    { label: 'Indent',      type: 'step',  v: target === 'list' ? 'list-indent' : null, unit: 'em', step: 0.1, min: 0 },
    { label: 'Header fill', type: 'color', v: target === 'table' ? 'tbl-head-bg' : null, opts: 'codebg' },
    { label: 'Cell pad \u2195', type: 'step', v: target === 'table' ? 'tbl-pad-y' : null, unit: 'em', step: 0.05, min: 0 },
    { label: 'Cell pad \u2194', type: 'step', v: target === 'table' ? 'tbl-pad-x' : null, unit: 'em', step: 0.05, min: 0 },
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
    return (
      <select className="ir-font" disabled={disabled} value={disabled ? '' : (val || '')} onChange={(e) => setVar(v, e.target.value)}>
        {disabled && <option value="">—</option>}
        {FONTS.map((f) => <option key={f.label} value={f.stack}>{f.label}</option>)}
      </select>
    );
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
            <span className="ir-label">{r.label}</span>
            <div className="ir-ctl"><RowControl row={r} vars={vars} setVar={setVar} disabled={off} img={img} /></div>
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const t0 = THEMES[0];
  const [title, setTitle] = useState(() => get(LS.title, 'Untitled document'));
  const [themeId, setThemeId] = useState(() => get(LS.theme, t0.id));
  const [vars, setVars] = useState(() => {
    const persisted = getJSON(LS.vars, null);
    const base = expandTheme(getTheme(get(LS.theme, t0.id)).vars);
    return persisted ? { ...base, ...persisted } : base;
  });
  const [zoom, setZoom] = useState(() => parseFloat(get(LS.zoom, '1.3')) || 1.3);
  const [rawZoom, setRawZoom] = useState(() => parseFloat(get(LS.rawZoom, '1.3')) || 1.3);
  const [cssZoom, setCssZoom] = useState(1);
  const [openMap, setOpenMap] = useState(() => getJSON(LS.open, {}));
  const [sideOpen, setSideOpen] = useState(() => get(LS.side, '1') !== '0');
  const [stats, setStats] = useState({ words: 0, pages: 1 });
  const [toast, setToast] = useState('');
  const [themeOpen, setThemeOpen] = useState(false);
  const [view, setView] = useState('doc'); // 'doc' (WYSIWYG) | 'raw' (markdown source) | 'css' (theme CSS)
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
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const rawRef = useRef(null);
  const autoTargetRef = useRef('h1'); // last caret-derived target (for sticky manual picks)
  const bus = useRef({ report: () => {}, focus: () => {}, getDoc: () => '', setDoc: () => {}, insertImage: () => {} });

  useEffect(() => { set(LS.title, title); }, [title]);
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

  /* ---- .md / .zip import ---- */
  const importMd = (file) => {
    if (!file) return;
    const name = file.name.replace(/\.(md|markdown|txt|zip)$/i, '');
    if (/\.zip$/i.test(file.name) && window.JSZip) {
      const r = new FileReader();
      r.onload = async () => {
        try {
          const zip = await JSZip.loadAsync(r.result);
          const files = Object.values(zip.files).filter((f) => !f.dir);
          const mdEntry = files.find((f) => /\.(md|markdown)$/i.test(f.name)) || files.find((f) => /\.txt$/i.test(f.name));
          const md = mdEntry ? await mdEntry.async('string') : '';
          const assets = files.filter((f) => /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(f.name));
          const map = {};
          for (const a of assets) {
            const b64 = await a.async('base64');
            const ext = a.name.split('.').pop().toLowerCase();
            map[a.name] = `data:${EXT_MIME[ext] || 'image/png'};base64,${b64}`;
          }
          const doc = new DOMParser().parseFromString(mdFileToHTML(md), 'text/html');
          doc.querySelectorAll('img').forEach((img) => {
            const src = decodeURIComponent((img.getAttribute('src') || '').replace(/^\.\//, ''));
            const hit = map[src] || map[Object.keys(map).find((k) => k === src || k.endsWith('/' + src) || k.split('/').pop() === src.split('/').pop())];
            if (hit) img.setAttribute('src', hit);
          });
          setView('doc'); bus.current.setDoc(doc.body.innerHTML); if (name) setTitle(name);
          flash('Imported ' + file.name);
        } catch (err) { flash('Could not read zip'); }
      };
      r.readAsArrayBuffer(file);
      return;
    }
    const r = new FileReader();
    r.onload = () => { setView('doc'); bus.current.setDoc(mdFileToHTML(String(r.result))); if (name) setTitle(name); flash('Imported ' + file.name); };
    r.readAsText(file);
  };
  const onPickFile = (e) => { importMd(e.target.files[0]); e.target.value = ''; };

  // collect data-URI images out of the doc HTML into zip assets, rewriting src to relative paths
  const extractAssets = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const assets = [];
    let n = 0;
    doc.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (/^data:/i.test(src)) {
        try {
          const { bytes, mime } = dataUriToBytes(src);
          const path = `images/image-${++n}.${MIME_EXT[mime] || 'png'}`;
          assets.push({ path, bytes });
          img.setAttribute('src', path);
        } catch {}
      }
    });
    return { html: doc.body.innerHTML, assets };
  };
  const saveMd = async () => {
    const baseHTML = view === 'raw' ? mdFileToHTML(rawMd) : bus.current.getDoc();
    const { html, assets } = extractAssets(baseHTML);
    const md = htmlToMD(html);
    if (assets.length && window.JSZip) {
      const zip = new JSZip();
      zip.file(slug(title) + '.md', md);
      assets.forEach((a) => zip.file(a.path, a.bytes));
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(slug(title) + '.zip', blob);
      flash(`Saved zip · ${assets.length} image${assets.length > 1 ? 's' : ''}`);
    } else {
      downloadText(slug(title) + '.md', md, 'text/markdown');
      flash('Saved Markdown');
    }
  };
  const saveRef = useRef(saveMd); saveRef.current = saveMd;

  const exportHTML = async () => {
    const docHTML = view === 'raw' ? mdFileToHTML(rawMd) : bus.current.getDoc();
    let docCss = '';
    try { docCss = await (await fetch('doc.css')).text(); } catch {}
    const varCss = Object.keys(vars).map((k) => `--${k}: ${vars[k]};`).join(' ');
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escHTML(title || 'Document')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${FONTS_HREF}" rel="stylesheet" />
<style>
${docCss}
body { margin: 0; background: #fff; }
.page { ${varCss} margin: 24px auto; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
@media print { .page { margin: 0; box-shadow: none; } @page { size: A4; margin: 0; } }
</style></head>
<body><div class="page"><div class="doc">${docHTML}</div></div></body></html>`;
    downloadText(slug(title) + '.html', html, 'text/html');
    flash('Exported HTML');
  };

  // keyboard: Alt+1..6 themes, Cmd/Ctrl+P print, Cmd/Ctrl+O open, Cmd/Ctrl+S save .md
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && !e.metaKey && !e.ctrlKey && /^[1-6]$/.test(e.key)) { const t = THEMES[+e.key - 1]; if (t) { e.preventDefault(); applyTheme(t); } }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); printRef.current(); }
      if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); fileRef.current && fileRef.current.click(); }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current(); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  const curZoom = view === 'raw' ? rawZoom : view === 'css' ? cssZoom : zoom;
  const nudge = (d) => {
    const apply = (z) => Math.max(0.4, Math.min(1.6, Math.round((z + d) * 100) / 100));
    if (view === 'raw') setRawZoom(apply); else if (view === 'css') setCssZoom(apply); else setZoom(apply);
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
      <input ref={fileRef} type="file" accept=".md,.markdown,.zip,text/markdown,text/plain" hidden onChange={onPickFile} />
      <input ref={imgRef} type="file" accept="image/*" hidden onChange={onPickImage} />
      <div className="workspace">
        <aside className={'sidebar' + (sideOpen ? '' : ' closed')}>
          <div className="side-top">
            <div className="side-views">
              <div className="seg view3">
                <button className={view === 'raw' ? 'sel' : ''} onClick={() => toView('raw')}>RAW</button>
                <button className={view === 'css' ? 'sel' : ''} onClick={() => toView('css')}>CSS</button>
                <button className={view === 'doc' ? 'sel' : ''} onClick={() => toView('doc')}>DOC</button>
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
                  <button className="theme-pick" onClick={() => setThemeOpen(true)} title="Choose / edit theme">
                    <span className="nm">{getTheme(themeId).name}</span>
                    <span className="ic"><GearIcon /></span>
                  </button>
                </Section>

                <Section title="Style">
                  <TargetMenu value={target} current={docStyle} vars={vars} onChange={setTarget}
                    numLabel={imgCount > 0 ? String(Math.min(imgIdx, imgCount - 1) + 1).padStart(2, '0') : ''} />
                  <Inspector target={target} vars={vars} setVar={setVar} img={imgCtx} />
                </Section>

                <Section id="page" title="Page" openMap={openMap} setOpenMap={setOpenMap}>
                  <Field label="Paper"><Chips value={vars['paper']} options={COLOR_SETS.paper} onChange={(v) => setVar('paper', v)} /></Field>
                  <Field label="Margins">
                    <div className="margin-grid">
                      <Stepper label="Height" value={vars['pad-y']} unit="mm" step={1} min={5} max={45} onChange={(v) => setVar('pad-y', v)} />
                      <Stepper label="Width" value={vars['pad-x']} unit="mm" step={1} min={5} max={45} onChange={(v) => setVar('pad-x', v)} />
                    </div>
                  </Field>
                </Section>

                <Section id="color" title="Color" openMap={openMap} setOpenMap={setOpenMap}>
                  <Field label="Text"><Chips value={vars['ink']} options={COLOR_SETS.ink} onChange={(v) => setVar('ink', v)} /></Field>
                  <Field label="Accent"><Chips value={vars['accent']} options={COLOR_SETS.accent} onChange={(v) => setVar('accent', v)} /></Field>
                  <Field label="Muted"><Chips value={vars['muted']} options={COLOR_SETS.muted} onChange={(v) => setVar('muted', v)} /></Field>
                </Section>
              </>
            )}
          </div>
        </aside>

        {!sideOpen && (
          <button className="reopen" onClick={() => setSideOpen(true)} title="Open sidebar"><ChevRight /></button>
        )}

        <div className="canvas">
          <FormatBar exec={exec} active={active} disabled={view !== 'doc'} title={title} setTitle={setTitle}
            onOpen={() => fileRef.current && fileRef.current.click()}
            onSave={saveMd} onExport={exportHTML} onPrint={doPrint} />
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
            {view === 'css' && (
              <div className="css-host" style={{ zoom: cssZoom }}>
                <pre className="css-doc" dangerouslySetInnerHTML={{ __html: highlightCSS(themeCSS(vars)) }} />
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
      <ThemeModal open={themeOpen} currentId={themeId} onApply={applyTheme} onClose={() => setThemeOpen(false)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
