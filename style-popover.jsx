/* global React, FONTS, THEMES, levelKeys, RowIcon, CloseIcon, ResetIcon, FMT_ICONS */
/* ============================================================
   Style popover — click an element in the preview, style it here.
   Also exports the small controls the top-bar panels reuse.
   ============================================================ */
const { useState: useStateSP, useEffect: useEffectSP, useRef: useRefSP, useLayoutEffect: useLayoutEffectSP } = React;

const COLOR_SETS = {
  ink:    ['#1b1d22', '#13161b', '#2a2a2a', '#1c1a16', '#22303a', '#102a43'],
  accent: ['#2f64e6', '#0e8f6e', '#b8402a', '#8a2b21', '#6d4bd0', '#444444'],
  muted:  ['#6b7280', '#7d7368', '#9a9a9a', '#5b6470', '#8a8f98', '#a89f92'],
  rule:   ['#e6e8ec', '#eae3da', '#e1e6ea', '#dfe2e5', '#d8dde3', '#cdd3da'],
  codebg: ['#f4f5f8', '#f4f0e7', '#f4f7f9', '#f7f7f7', '#eef1f5', '#f0ece4'],
};
const CASES = ['none', 'uppercase', 'capitalize'];
const CASE_GLYPH = { none: 'Aa', uppercase: 'AG', capitalize: 'Ab' };

/* ---- primitives ---- */
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
const Toggle = ({ on, onChange, disabled }) => (
  <span className="toggle"><button className={on ? 'on' : ''} disabled={disabled} onClick={() => onChange(!on)} /></span>
);
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
/* a hover/click dropdown shell used by the font, theme and target menus */
function HoverMenu({ button, children, className, disabled, align }) {
  const [open, setOpen] = useStateSP(false);
  const ref = useRefSP(null);
  const closeT = useRefSP(null);
  const cancelClose = () => { if (closeT.current) { clearTimeout(closeT.current); closeT.current = null; } };
  const openNow = () => { if (disabled) return; cancelClose(); setOpen(true); };
  const closeSoon = () => { cancelClose(); closeT.current = setTimeout(() => setOpen(false), 200); };
  useEffectSP(() => () => cancelClose(), []);
  useEffectSP(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className={'tsel ' + (className || '') + (disabled ? ' is-disabled' : '')} ref={ref} onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button className={'tsel-btn' + (open ? ' open' : '')} disabled={disabled} onClick={() => (open ? setOpen(false) : openNow())}>
        {button}<span className="tsel-chev">▾</span>
      </button>
      {open && <div className={'tsel-pop' + (align === 'right' ? ' right' : '')}>{typeof children === 'function' ? children(() => setOpen(false)) : children}</div>}
    </div>
  );
}
function FontMenu({ value, onChange, disabled }) {
  const cur = FONTS.find((f) => f.stack === value);
  return (
    <HoverMenu className="tsel-font" disabled={disabled} button={<span style={{ fontFamily: disabled ? undefined : value }}>{disabled ? '—' : (cur ? cur.label : 'Font')}</span>}>
      {(close) => (
        <div className="tsel-group">
          {FONTS.map((f) => (
            <button key={f.label} className={'tsel-item' + (f.stack === value ? ' sel' : '')} onClick={() => { onChange(f.stack); close(); }}>
              <span className="tsel-name" style={{ fontFamily: f.stack, fontSize: '14px' }}>{f.label}</span>
              {f.stack === value && <span className="tsel-cur">current</span>}
            </button>
          ))}
        </div>
      )}
    </HoverMenu>
  );
}

/* ---- what each target exposes ---- */
const TARGET_LABEL = {
  h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4', p: 'Body text',
  quote: 'Quote', link: 'Link', list: 'List', table: 'Table', image: 'Image', caption: 'Caption',
  code: 'Code', 'inline-code': 'Code', rule: 'Rule', footnotes: 'Footnotes', pagebreak: 'Page break', vspace: 'Vertical space',
};
const TARGET_GROUPS = [
  { label: 'Text', items: ['h1', 'h2', 'h3', 'h4', 'p'] },
  { label: 'Elements', items: ['quote', 'list', 'table', 'code', 'link', 'image', 'caption', 'footnotes', 'rule'] },
];
const COLOR_OPTS = { accent: COLOR_SETS.accent, muted: COLOR_SETS.muted, rule: COLOR_SETS.rule, codebg: COLOR_SETS.codebg, ink: COLOR_SETS.ink };

function rowsFor(target) {
  if (/^(h[1-4]|p)$/.test(target)) {
    const k = levelKeys(target);
    const rows = [
      { label: 'Font',        icon: 'font',   type: 'font',  v: k.font },
      { label: 'Size',        icon: 'size',   type: 'step',  v: k.size, unit: 'px', step: 0.5, min: 6 },
      { label: 'Weight',      icon: 'weight', type: 'step',  v: k.weight, step: 50, min: 100, max: 900 },
      { label: 'Line height', icon: 'lh',     type: 'step',  v: k.lh, step: 0.02, min: 0.8 },
      { label: 'Letter',      icon: 'letter', type: 'step',  v: k.track, unit: 'em', step: 0.005 },
      { label: 'Space above', icon: 'spaceA', type: 'step',  v: k.spaceA, unit: 'em', step: 0.05, min: 0 },
      { label: 'Space below', icon: 'spaceB', type: 'step',  v: k.spaceB, unit: 'em', step: 0.05, min: 0 },
      { label: 'Case',        icon: 'case',   type: 'case',  v: k.case },
      { label: 'Under-bar',   icon: 'bar',    type: 'toggle', v: k.bar, on: '1', off: '0' },
    ];
    if (target === 'p') rows.push({ label: 'Justify', icon: 'align', type: 'toggle', v: 'body-align', on: 'justify', off: 'left' });
    else rows.push({ label: 'Colour', icon: 'color', type: 'color', v: 'ink', opts: 'ink' });
    return rows;
  }
  switch (target) {
    case 'quote': return [
      { label: 'Text colour',  icon: 'color',  type: 'color', v: 'bq-color', opts: 'muted' },
      { label: 'Border colour', icon: 'border', type: 'color', v: 'bq-border', opts: 'accent' },
      { label: 'Border width', icon: 'borderw', type: 'step', v: 'bq-border-w', unit: 'px', step: 1, min: 0, max: 12 },
      { label: 'Italic',       icon: 'italic', type: 'toggle', v: 'bq-style', on: 'italic', off: 'normal' },
    ];
    case 'link': return [
      { label: 'Colour',    icon: 'color', type: 'color', v: 'link-color', opts: 'accent' },
      { label: 'Underline', icon: 'underline', type: 'toggle', v: 'link-deco', on: 'underline', off: 'none' },
    ];
    case 'list': return [
      { label: 'Marker colour', icon: 'marker', type: 'color', v: 'list-marker', opts: 'muted' },
      { label: 'Item spacing',  icon: 'gap',    type: 'step',  v: 'list-gap', unit: 'em', step: 0.05, min: 0 },
      { label: 'Indent',        icon: 'indent', type: 'step',  v: 'list-indent', unit: 'em', step: 0.1, min: 0 },
    ];
    case 'table': return [
      { label: 'Header fill',   icon: 'fill',   type: 'color', v: 'tbl-head-bg', opts: 'codebg' },
      { label: 'Border colour', icon: 'border', type: 'color', v: 'tbl-border', opts: 'rule' },
      { label: 'Size',          icon: 'size',   type: 'step',  v: 'tbl-size', unit: 'em', step: 0.02, min: 0.6, max: 1.2 },
      { label: 'Cell pad ↕', icon: 'padY', type: 'step',  v: 'tbl-pad-y', unit: 'em', step: 0.05, min: 0 },
      { label: 'Cell pad ↔', icon: 'padX', type: 'step',  v: 'tbl-pad-x', unit: 'em', step: 0.05, min: 0 },
      { label: 'Striped rows',  icon: 'fill',   type: 'toggle', v: 'tbl-stripe', on: '1', off: '0' },
    ];
    case 'code': case 'inline-code': return [
      { label: 'Font',       icon: 'font',  type: 'font',  v: 'font-mono' },
      { label: 'Size',       icon: 'size',  type: 'step',  v: 'code-size', unit: 'em', step: 0.02, min: 0.6, max: 1.2 },
      { label: 'Background', icon: 'fill',  type: 'color', v: 'code-bg', opts: 'codebg' },
      { label: 'Border',     icon: 'border', type: 'toggle', v: 'code-border', on: '1', off: '0' },
    ];
    case 'caption': return [
      { label: 'Size',   icon: 'size',  type: 'step',  v: 'cap-size', unit: 'em', step: 0.02, min: 0.6, max: 1.2 },
      { label: 'Colour', icon: 'color', type: 'color', v: 'cap-color', opts: 'muted' },
      { label: 'Italic', icon: 'italic', type: 'toggle', v: 'cap-style', on: 'italic', off: 'normal' },
      { label: 'Centred', icon: 'align', type: 'toggle', v: 'cap-align', on: 'center', off: 'left' },
    ];
    case 'footnotes': return [
      { label: 'Size',   icon: 'size',  type: 'step',  v: 'fn-size', unit: 'em', step: 0.02, min: 0.6, max: 1.1 },
      { label: 'Colour', icon: 'color', type: 'color', v: 'fn-color', opts: 'muted' },
    ];
    case 'rule': return [
      { label: 'Colour', icon: 'color', type: 'color', v: 'rule', opts: 'rule' },
    ];
    case 'image': return [
      { label: 'Width', icon: 'width', type: 'imgwidth' },
      { label: 'Align', icon: 'align', type: 'imgalign' },
      { label: 'Rounded', icon: 'border', type: 'toggle', v: 'img-radius', on: '1', off: '0' },
    ];
    default: return [];
  }
}
/* the theme-variable keys a target owns (for "reset to theme") */
const keysOf = (target) => rowsFor(target).map((r) => r.v).filter(Boolean);

function RowControl({ row, vars, setVar, img }) {
  const v = row.v;
  const val = v ? vars[v] : undefined;
  if (row.type === 'imgwidth') {
    const opts = [['50%', '½'], ['75%', '¾'], ['100%', 'Full']];
    const cur = (img && img.attrs.width) || '100%';
    return (
      <div className="ir-seg-wrap">
        <div className="ir-seg">
          {opts.map(([o, l]) => <button key={o} className={'ir-seg-b' + (cur === o ? ' on' : '')} disabled={!img} onClick={() => img.set({ width: o === '100%' ? null : o })}>{l}</button>)}
        </div>
        <RowStep value={cur} unit="%" step={5} min={10} max={100} disabled={!img} onChange={(nv) => img.set({ width: nv === '100%' ? null : nv })} />
      </div>
    );
  }
  if (row.type === 'imgalign') {
    const cur = (img && img.attrs.align) || 'center';
    const off = !img || !img.attrs.width || img.attrs.width === '100%';
    return (
      <div className="ir-seg">
        {[['left', '←'], ['center', '↔'], ['right', '→']].map(([o, l]) => (
          <button key={o} className={'ir-seg-b' + (!off && cur === o ? ' on' : '')} title={off ? 'Alignment applies to images narrower than the page' : o} disabled={off} onClick={() => img.set({ align: o === 'center' ? null : o })}>{l}</button>
        ))}
      </div>
    );
  }
  if (row.type === 'font') return <FontMenu value={val || ''} onChange={(stack) => setVar(v, stack)} />;
  if (row.type === 'step') return <RowStep value={val} unit={row.unit} step={row.step} min={row.min} max={row.max} onChange={(nv) => setVar(v, nv)} />;
  if (row.type === 'case') {
    const cs = val || 'none';
    const cycle = () => { const i = CASES.indexOf(cs); setVar(v, CASES[(i + 1) % CASES.length]); };
    return <button className="ir-btn" onClick={cycle}>{CASE_GLYPH[cs] || 'Aa'}</button>;
  }
  if (row.type === 'toggle') {
    const on = val != null && val !== row.off && val !== '0';
    return <Toggle on={on} onChange={(o) => setVar(v, o ? row.on : row.off)} />;
  }
  if (row.type === 'color') return <Chips value={val} options={COLOR_OPTS[row.opts] || COLOR_SETS.accent} onChange={(c) => setVar(v, c)} />;
  return null;
}
function Inspector({ target, vars, setVar, img }) {
  return (
    <div className="insp">
      {rowsFor(target).map((r) => (
        <div className={'irow' + (r.type === 'font' ? ' wide' : '')} key={r.label}>
          <span className="ir-label">{r.icon && <RowIcon name={r.icon} />}<span className="ir-lt">{r.label}</span></span>
          <div className="ir-ctl"><RowControl row={r} vars={vars} setVar={setVar} img={img} /></div>
        </div>
      ))}
    </div>
  );
}

/* the popover itself: anchored beside the clicked element, clamped to the viewport */
function StylePopover({ target, anchorRect, bounds, vars, setVar, onReset, img, line, onClose, onSwitch, onGoto }) {
  const ref = useRefSP(null);
  const [pos, setPos] = useStateSP({ left: -9999, top: -9999 });
  useLayoutEffectSP(() => {
    const el = ref.current; if (!el || !anchorRect) return;
    const W = el.offsetWidth, H = el.offsetHeight, m = 12;
    const b = bounds || { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    let left = anchorRect.right + m;
    if (left + W > b.right - m) left = anchorRect.left - W - m;
    if (left < b.left + m) left = Math.min(Math.max(b.left + m, anchorRect.left), b.right - W - m);
    let top = anchorRect.top;
    if (top + H > b.bottom - m) top = Math.max(b.top + m, b.bottom - H - m);
    if (top < b.top + m) top = b.top + m;
    setPos({ left, top });
  }, [anchorRect, target, bounds]);
  useEffectSP(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest('.preview-scroll')) onClose(); };
    document.addEventListener('keydown', onKey); document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [onClose]);

  const info = target === 'pagebreak' ? 'Forces a new page here. Edit or delete the \\pagebreak line in the markdown.'
    : target === 'vspace' ? 'Vertical space from a \\ line in the markdown. Repeat the line for more, or use \\vspace N.'
    : null;
  return (
    <div className="stylepop" ref={ref} style={{ left: pos.left, top: pos.top }} onMouseDown={(e) => e.stopPropagation()}>
      <div className="stylepop-head">
        <HoverMenu className="tsel-target" button={<span className="sp-target">{TARGET_LABEL[target] || target}{img && img.name ? <span className="sp-sub">{img.name}</span> : null}</span>}>
          {(close) => TARGET_GROUPS.map((g) => (
            <div className="tsel-group" key={g.label}>
              <div className="tsel-glabel">{g.label}</div>
              {g.items.map((id) => {
                const lvl = /^(h[1-4]|p)$/.test(id);
                const k = lvl ? levelKeys(id) : null;
                return (
                  <button key={id} className={'tsel-item' + (id === target ? ' sel' : '')} onClick={() => { onSwitch(id); close(); }}>
                    {lvl ? <span className="tsel-prev" style={{ fontFamily: vars[k.font], fontWeight: vars[k.weight] }}>Ag</span> : <span className="tsel-ic">{TARGET_LABEL[id].slice(0, 1)}</span>}
                    <span className="tsel-name">{TARGET_LABEL[id]}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </HoverMenu>
        <div className="stylepop-actions">
          {line != null && <button className="fmt small" title="Go to this line in the markdown" onClick={() => onGoto(line)}>line {line + 1}</button>}
          {keysOf(target).length > 0 && <button className="fmt ico" title="Reset these to the theme" onClick={() => onReset(keysOf(target))}><ResetIcon /></button>}
          <button className="fmt ico" title="Close (Esc)" onClick={onClose}><CloseIcon /></button>
        </div>
      </div>
      {info ? <div className="stylepop-info">{info}</div> : <Inspector target={target} vars={vars} setVar={setVar} img={img} />}
      {target === 'image' && img && !img.name && <div className="stylepop-info">Select the image itself to size it.</div>}
      {target === 'image' && img && img.missing && (
        <div className="stylepop-info"><b>{img.name}</b> is not in this browser's image store, so nothing can be shown. Paste or drop the image onto the editor to add it.</div>
      )}
      {(target === 'image') && img && img.name && <div className="stylepop-foot">Width and alignment are written into the markdown after the image.</div>}
    </div>
  );
}
