/* global React, Paginate */
/* ============================================================
   Preview pane — the document on real A4 sheets, read-only.

   - paginates the rendered HTML (see paginate.js) into .sheet elements
   - single / spread / grid layouts, zoom or fit-to-width
   - click a block → reports its source line and what it is (for the
     style popover and to move the editor caret)
   - highlights the block the editor caret is in, keeps it in view
   - scrolling the preview (with the pointer over it) scrolls the editor
   ============================================================ */
const { useState: useStatePV, useEffect: useEffectPV, useRef: useRefPV, useLayoutEffect: useLayoutEffectPV } = React;

const A4_W_PX = 793.7, A4_H_PX = 1122.5; // 210 × 297 mm at 96 dpi
const COLS = { single: 1, spread: 2, grid: 3 };

/* what a clicked element is, for the style popover */
function targetOf(el) {
  const inl = el.closest('a, img, figcaption, code, .img-missing');
  if (inl) {
    if (inl.tagName === 'A' && !inl.closest('.footnotes, sup')) return 'link';
    if (inl.tagName === 'IMG' || inl.classList.contains('img-missing')) return 'image';
    if (inl.tagName === 'FIGCAPTION') return 'caption';
    if (inl.tagName === 'CODE') return inl.closest('pre') ? 'code' : 'inline-code';
  }
  const b = el.closest('h1, h2, h3, h4, h5, h6, p, li, ul, ol, blockquote, table, figure, pre, hr, .pagebreak, .vspace, section.footnotes');
  if (!b) return 'p';
  const t = b.tagName;
  if (/^H[1-6]$/.test(t)) return t === 'H5' || t === 'H6' ? 'h4' : t.toLowerCase();
  if (t === 'BLOCKQUOTE') return 'quote';
  if (t === 'LI' || t === 'UL' || t === 'OL') return b.closest('.footnotes') ? 'footnotes' : 'list';
  if (t === 'TABLE') return 'table';
  if (t === 'FIGURE') return 'image';
  if (t === 'PRE') return 'code';
  if (t === 'HR') return 'rule';
  if (b.classList.contains('pagebreak')) return 'pagebreak';
  if (b.classList.contains('vspace')) return 'vspace';
  if (b.classList.contains('footnotes')) return 'footnotes';
  if (b.closest('blockquote')) return 'quote';
  return 'p';
}

function PreviewPane({ html, vars, mode, zoom, pageNumbers, currentLine, caretDriven, onBlockClick, onScrollLine, onPages, onFitZoom, bus, dim }) {
  const scrollRef = useRefPV(null);
  const sheetsRef = useRefPV(null);
  const measureRef = useRefPV(null);
  const rootRef = useRefPV(null);
  const reqRef = useRefPV(0);
  const hoverRef = useRefPV(false);
  const [busy, setBusy] = useStatePV(false);
  const [overflow, setOverflow] = useStatePV(0);
  const [fit, setFit] = useStatePV(1);
  const [fontTick, setFontTick] = useStatePV(0);
  // web fonts arriving after the first layout change every height: paginate again
  useEffectPV(() => {
    if (!document.fonts || !document.fonts.addEventListener) return;
    const on = () => setFontTick((t) => t + 1);
    document.fonts.addEventListener('loadingdone', on);
    return () => document.fonts.removeEventListener('loadingdone', on);
  }, []);

  // fit zoom: N sheets across the available width
  useLayoutEffectPV(() => {
    const el = scrollRef.current; if (!el) return;
    const calc = () => {
      const cols = COLS[mode] || 1;
      const pad = 36, gap = 28;
      const w = el.clientWidth - pad * 2 - gap * (cols - 1);
      const z = Math.max(0.15, Math.min(2, w / (cols * A4_W_PX)));
      setFit(z);
      if (onFitZoom) onFitZoom(z);
    };
    calc();
    const ro = new ResizeObserver(calc); ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  // paginate whenever the document or its styling changes
  useEffectPV(() => {
    const sheets = sheetsRef.current, measure = measureRef.current;
    if (!sheets || !measure) return;
    const id = ++reqRef.current;
    const token = () => reqRef.current === id;
    let cancelled = false;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        await document.fonts.ready;
        if (!token()) return;
        const padY = parseFloat(getComputedStyle(measure).paddingTop) || 0;
        const res = await Paginate.paginate(html, { measure, pageH: A4_H_PX, padY, pageNumbers, token });
        if (!res || !token() || cancelled) return;
        const keepScroll = scrollRef.current ? scrollRef.current.scrollTop : 0;
        sheets.replaceChildren(...res.sheets);
        Paginate.verify(sheets, { pageNumbers });
        if (scrollRef.current) scrollRef.current.scrollTop = keepScroll;
        setOverflow(res.overflow);
        const n = sheets.querySelectorAll(':scope > .sheet').length;
        if (onPages) onPages(n, sheets.innerText);
        // while the author is typing, keep the block under the caret in view
        applyCurrent(sheets, currentLineRef.current, caretDrivenRef.current, true);
      } finally { if (token()) setBusy(false); }
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [html, vars, pageNumbers, fontTick]);

  // current-block highlight from the editor caret
  const currentLineRef = useRefPV(currentLine);
  currentLineRef.current = currentLine;
  const caretDrivenRef = useRefPV(caretDriven);
  caretDrivenRef.current = caretDriven;
  useEffectPV(() => { if (sheetsRef.current) applyCurrent(sheetsRef.current, currentLine, caretDriven); }, [currentLine, caretDriven]);
  function applyCurrent(sheets, line, scroll, instant) {
    sheets.querySelectorAll('.is-current').forEach((n) => n.classList.remove('is-current'));
    if (line == null) return;
    let best = null, span = Infinity;
    sheets.querySelectorAll('[data-line]').forEach((n) => {
      const a = +n.dataset.line, b = +n.dataset.lineEnd;
      if (line >= a && line < b && b - a < span && !n.classList.contains('split-rest')) { best = n; span = b - a; }
    });
    if (!best) {
      // a blank line: fall back to the nearest block above
      let top = -1;
      sheets.querySelectorAll('[data-line]').forEach((n) => { const a = +n.dataset.line; if (a <= line && a > top && !n.closest('li, blockquote, table')) { top = a; best = n; } });
    }
    if (!best) return;
    best.classList.add('is-current');
    if (scroll) {
      const sc = scrollRef.current; if (!sc) return;
      const r = best.getBoundingClientRect(), h = sc.getBoundingClientRect();
      if (r.top < h.top + 40 || r.bottom > h.bottom - 40) best.scrollIntoView({ block: 'center', behavior: instant ? 'auto' : 'smooth' });
    }
  }

  // clicks → source line + target kind
  const onClick = (e) => {
    const el = e.target.closest('[data-line]');
    const sheet = e.target.closest('.sheet');
    if (!sheet) { if (onBlockClick) onBlockClick(null); return; }
    if (!el) { if (onBlockClick) onBlockClick(null); return; }
    const inl = e.target.closest('a, img, figcaption, code, .img-missing') || el;
    const kind = targetOf(e.target);
    const img = e.target.closest('img, .img-missing, figure');
    const imgName = img ? (img.dataset.src || (img.querySelector && img.querySelector('[data-src]') && img.querySelector('[data-src]').dataset.src)) : null;
    if (onBlockClick) onBlockClick({ line: +el.dataset.line, lineEnd: +el.dataset.lineEnd, kind, el, anchor: inl, imgName, page: +sheet.dataset.page });
    if (e.target.closest('a')) e.preventDefault();
  };

  // scroll → editor follows (only while the pointer is over the preview)
  const onScroll = () => {
    if (!hoverRef.current || !onScrollLine) return;
    const sc = scrollRef.current; if (!sc) return;
    const top = sc.getBoundingClientRect().top + 8;
    let first = null;
    for (const n of sc.querySelectorAll('.sheet > .doc > [data-line]')) {
      if (n.getBoundingClientRect().bottom > top) { first = n; break; }
    }
    if (first) onScrollLine(+first.dataset.line);
  };

  useEffectPV(() => {
    bus.current.pv = {
      sheetsClone: () => (sheetsRef.current ? sheetsRef.current.cloneNode(true) : null),
      scrollToLine: (line) => {
        const sheets = sheetsRef.current; if (!sheets) return;
        let best = null, top = -1;
        sheets.querySelectorAll('.sheet > .doc > [data-line]').forEach((n) => { const a = +n.dataset.line; if (a <= line && a > top) { top = a; best = n; } });
        if (best) best.scrollIntoView({ block: 'start' });
      },
      scrollToPage: (p) => { const s = sheetsRef.current && sheetsRef.current.querySelector(`.sheet[data-page="${p}"]`); if (s) s.scrollIntoView({ block: 'start', behavior: 'smooth' }); },
      root: () => rootRef.current,
    };
  });

  const z = zoom == null ? fit : zoom;
  return (
    <div className={'preview' + (dim ? ' dim' : '')} ref={rootRef} style={vars}
      onMouseEnter={() => { hoverRef.current = true; }} onMouseLeave={() => { hoverRef.current = false; }}>
      <div className="preview-scroll" ref={scrollRef} onScroll={onScroll} onClick={onClick}>
        <div className="sheets-zoom" style={{ zoom: z }}>
          <div className={'sheets mode-' + mode} ref={sheetsRef} />
        </div>
      </div>
      <div className="measure-host" aria-hidden="true"><div className="sheet measure"><div className="doc" ref={measureRef} /></div></div>
      {busy && <div className="pv-busy" />}
      {overflow > 0 && <div className="pv-warn">{overflow === 1 ? 'One block is taller than a page and is clipped' : overflow + ' blocks are taller than a page and are clipped'}</div>}
    </div>
  );
}
