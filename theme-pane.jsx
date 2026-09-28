/* global React, FONTS, THEMES, levelKeys, RowIcon, ResetIcon, Dialect */
/* ============================================================
   Theme pane — the THEME tab of the left pane: the theme picker and
   every style control, grouped the way the block menu is, all on one
   scrollable page. Also home to the small controls it is built from.
   ============================================================ */
const { useState: useStateSP, useEffect: useEffectSP, useRef: useRefSP, useLayoutEffect: useLayoutEffectSP } = React;

const COLOR_SETS = {
  ink:    ['#1b1d22', '#13161b', '#2a2a2a', '#1c1a16', '#22303a', '#102a43'],
  accent: ['#2f64e6', '#0e8f6e', '#b8402a', '#8a2b21', '#6d4bd0', '#444444'],
  muted:  ['#6b7280', '#7d7368', '#9a9a9a', '#5b6470', '#8a8f98', '#a89f92'],
  rule:   ['#e6e8ec', '#eae3da', '#e1e6ea', '#dfe2e5', '#d8dde3', '#cdd3da'],
  codebg: ['#f4f5f8', '#f4f0e7', '#f4f7f9', '#f7f7f7', '#eef1f5', '#f0ece4'],
  head:   ['#1b1d22', '#1d4ed8', '#0e7490', '#6d28d9', '#b8402a', '#5b2a4e'],
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
function Seg({ value, options, onChange, style }) {
  return (
    <div className="ir-seg">
      {options.map(([v, label, st]) => <button key={v} className={'ir-seg-b' + (value === v ? ' on' : '')} style={st} onClick={() => onChange(v)}>{label}</button>)}
    </div>
  );
}
/* a click dropdown shell used by the font menu. Click only: opening on
   hover made the click that followed (or a tap) close it straight away. */
function HoverMenu({ button, children, className, disabled, align }) {
  const [open, setOpen] = useStateSP(false);
  const ref = useRefSP(null);
  useEffectSP(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className={'tsel ' + (className || '') + (disabled ? ' is-disabled' : '')} ref={ref}>
      <button className={'tsel-btn' + (open ? ' open' : '')} disabled={disabled} onClick={() => setOpen(!open && !disabled)}>
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

/* a "?" that explains the header / footer boxes on hover, focus or tap */
function HelpTip({ where }) {
  const top = where === 'header';
  return (
    <span className="th-help" tabIndex={0} role="button" aria-label={'How the ' + where + ' works'}>?
      <span className="th-tip" role="tooltip">
        <b>Three boxes: left, centre and right</b> of the {where}, printed {top ? 'above the text' : 'below the text'} on every page. Leave a box empty to print nothing there.
        <span className="th-tip-h">Two words are replaced on each page</span>
        <span className="th-tip-row"><code>{'{page}'}</code> this page's number</span>
        <span className="th-tip-row"><code>{'{pages}'}</code> how many pages there are</span>
        <span className="th-tip-h">Example</span>
        {top
          ? <span className="th-tip-ex"><span>Quarterly report</span><span></span><span>Acme Pty Ltd</span></span>
          : <span className="th-tip-ex"><span>Draft · confidential</span><span>Page {'{page}'} of {'{pages}'}</span><span></span></span>}
        <span className="th-tip-note">{top ? 'prints "Quarterly report" on the left and "Acme Pty Ltd" on the right of each page.' : 'prints "Page 3 of 7" in the centre of page 3.'} Turn on Plain first page to leave a cover page clean.</span>
      </span>
    </span>
  );
}

/* ---- what each target exposes ---- */
const TARGET_LABEL = {
  h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4', p: 'Body text',
  quote: 'Quote', link: 'Link', list: 'List', table: 'Table', image: 'Image', caption: 'Caption',
  code: 'Code', 'inline-code': 'Code', rule: 'Rule', footnotes: 'Footnotes', pagebreak: 'Page break', vspace: 'Vertical space', toc: 'Contents',
};
const TARGET_GROUPS = [
  { label: 'Text', items: ['h1', 'h2', 'h3', 'h4', 'p'] },
  { label: 'Elements', items: ['quote', 'list', 'table', 'code', 'link', 'image', 'caption', 'footnotes', 'rule'] },
];
const COLOR_OPTS = { accent: COLOR_SETS.accent, muted: COLOR_SETS.muted, rule: COLOR_SETS.rule, codebg: COLOR_SETS.codebg, ink: COLOR_SETS.ink, head: COLOR_SETS.head };

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
      { label: 'Colour',      icon: 'color',  type: 'color', v: k.color, opts: target === 'p' ? 'ink' : 'head' },
      { label: 'Under-bar',   icon: 'bar',    type: 'toggle', v: k.bar, on: '1', off: '0' },
    ];
    if (target === 'p') {
      rows.push({ label: 'Justify', icon: 'align', type: 'toggle', v: 'body-align', on: 'justify', off: 'left' });
      rows.push({ label: 'First-line indent', icon: 'indent', type: 'step', v: 'p-indent', unit: 'em', step: 0.25, min: 0, max: 4 });
    } else {
      rows.splice(8, 0, { label: 'Align', icon: 'align', type: 'seg', v: k.align, opts: [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']] });
    }
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
      { label: 'Underline colour', icon: 'color', type: 'color', v: 'link-deco-color', opts: 'accent', off: (vars) => vars['link-deco'] !== 'underline' },
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
      { label: 'Rounded', icon: 'border', type: 'toggle', v: 'img-radius', on: '1', off: '0' },
    ];
    case 'thisimage': return [
      { label: 'Width', icon: 'width', type: 'imgwidth' },
      { label: 'Align', icon: 'align', type: 'imgalign' },
    ];
    case 'page': return [
      { label: 'Top & bottom', icon: 'padY', type: 'step', v: 'pad-y', unit: 'mm', step: 1, min: 5, max: 45 },
      { label: 'Sides', icon: 'padX', type: 'step', v: 'pad-x', unit: 'mm', step: 1, min: 5, max: 45 },
      { label: 'Widow control', icon: 'lh', type: 'step', v: 'para-lines', unit: ' lines', step: 1, min: 1, max: 5, tip: 'A paragraph that runs over a page end keeps at least this many lines on each page' },
    ];
    case 'global': return [
      { label: 'Heading font', icon: 'font', type: 'headfont' },
      { label: 'Body font', icon: 'font', type: 'font', v: 'font-body' },
      { label: 'Base size', icon: 'size', type: 'basesize', v: 'fs-base', unit: 'px', step: 0.5, min: 9, max: 24, tip: 'Body text size; headings scale with it' },
      { label: 'Line height', icon: 'lh', type: 'step', v: 'lh', step: 0.02, min: 1, max: 2.4 },
      { label: 'Paragraph gap', icon: 'spaceB', type: 'step', v: 'para', unit: 'em', step: 0.05, min: 0, max: 2.5 },
      { label: 'Hyphenate', icon: 'letter', type: 'toggle', v: 'body-hyphens', on: 'auto', off: 'manual' },
      { label: 'Numbering', icon: 'marker', type: 'seg', v: 'head-num', opts: [['none', 'Off'], ['h1', 'From H1'], ['h2', 'From H2']], tip: 'Number headings 1, 1.1, 1.1.1. "From H2" keeps Heading 1 as an unnumbered title' },
    ];
    case 'colours': return [
      { label: 'Text', icon: 'color', type: 'color', v: 'ink', opts: 'ink' },
      { label: 'Accent', icon: 'color', type: 'color', v: 'accent', opts: 'accent' },
      { label: 'Muted', icon: 'color', type: 'color', v: 'muted', opts: 'muted' },
      { label: 'Rules & borders', icon: 'border', type: 'color', v: 'rule', opts: 'rule' },
      { label: 'Code background', icon: 'fill', type: 'color', v: 'code-bg', opts: 'codebg' },
    ];
    default: return [];
  }
}
/* the theme-variable keys a target owns (for "reset to theme") */
const keysOf = (target) => rowsFor(target).map((r) => r.v).filter(Boolean).concat(target === 'global' ? ['h1-font', 'h2-font', 'h3-font', 'h4-font'] : []);

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
  if (row.type === 'headfont') return <FontMenu value={vars['h1-font'] || ''} onChange={(stack) => ['h1', 'h2', 'h3', 'h4'].forEach((l) => setVar(l + '-font', stack))} />;
  if (row.type === 'seg') return <Seg value={val || row.opts[0][0]} options={row.opts} onChange={(nv) => setVar(v, nv)} />;
  if (row.type === 'basesize') {
    // body size changes carry the headings along in proportion
    const change = (nv) => {
      const r = parseFloat(nv) / (parseFloat(val) || parseFloat(nv));
      setVar(v, nv);
      if (r && r !== 1) ['h1', 'h2', 'h3', 'h4'].forEach((l) => { const hs = parseFloat(vars[l + '-size']); if (hs && /px$/.test(vars[l + '-size'])) setVar(l + '-size', (Math.round(hs * r * 10) / 10) + 'px'); });
    };
    return <RowStep value={val} unit={row.unit} step={row.step} min={row.min} max={row.max} onChange={change} />;
  }
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
  if (row.type === 'color') return <Chips value={val} options={COLOR_OPTS[row.opts] || COLOR_SETS.accent} disabled={row.off ? row.off(vars) : false} onChange={(c) => setVar(v, c)} />;
  return null;
}
function Inspector({ target, vars, setVar, img }) {
  return (
    <div className="insp">
      {rowsFor(target).map((r) => (
        <div className={'irow' + (r.type === 'font' || r.type === 'headfont' ? ' wide' : '')} key={r.label}>
          <span className="ir-label" title={r.tip}>{r.icon && <RowIcon name={r.icon} />}<span className="ir-lt">{r.label}</span></span>
          <div className="ir-ctl"><RowControl row={r} vars={vars} setVar={setVar} img={img} /></div>
        </div>
      ))}
    </div>
  );
}

/* ---- the pane ---- */
const SECTIONS = [
  { group: 'Page', items: [{ id: 'page', label: 'Page', glyph: '▭' }] },
  { group: 'Text', items: [{ id: 'text', label: 'Text', glyph: 'Aa' }] },
  { group: 'Blocks', items: [
    { id: 'list', label: 'Lists', glyph: '•' }, { id: 'quote', label: 'Quote', glyph: '❝' },
    { id: 'code', label: 'Code', glyph: '{ }' }, { id: 'table', label: 'Table', glyph: '▦' }, { id: 'rule', label: 'Rule', glyph: '—' },
  ] },
  { group: 'Media', items: [{ id: 'image', label: 'Images', glyph: '🖼' }, { id: 'caption', label: 'Captions', glyph: '“' }] },
  { group: 'Inline', items: [{ id: 'link', label: 'Links', glyph: '🔗' }, { id: 'footnotes', label: 'Footnotes', glyph: '¹' }] },
  { group: 'Colours', items: [{ id: 'colours', label: 'Colours', glyph: '◐' }] },
];
const SECTION_OF = { 'inline-code': 'code', pagebreak: 'page', vspace: 'page', toc: 'text', h1: 'text', h2: 'text', h3: 'text', h4: 'text', p: 'text' };
/* the levels inside the Text section: vertical tabs on the left, one level's controls on the right */
const LEVELS_UI = [
  { id: 'global', label: 'All text', glyph: '∀' },
  { id: 'h1', label: 'Heading 1', glyph: 'H1' }, { id: 'h2', label: 'Heading 2', glyph: 'H2' },
  { id: 'h3', label: 'Heading 3', glyph: 'H3' }, { id: 'h4', label: 'Heading 4', glyph: 'H4' },
  { id: 'p', label: 'Body', glyph: 'Aa' },
];
function TextLevels({ level, setLevel, vars, setVar, onReset }) {
  const cur = LEVELS_UI.find((l) => l.id === level) || LEVELS_UI[0];
  return (
    <div className="th-levels">
      <div className="th-vtabs" role="tablist">
        {LEVELS_UI.map((l) => (
          <button key={l.id} role="tab" aria-selected={l.id === cur.id} className={'th-vtab' + (l.id === cur.id ? ' on' : '')} onClick={() => setLevel(l.id)}>
            <span className="th-ic">{l.glyph}</span><span>{l.label}</span>
          </button>
        ))}
      </div>
      <div className="th-vbody">
        <div className="th-vhead"><span>{cur.label}</span><button className="fmt ico th-reset" title={'Reset ' + cur.label + ' to the theme'} onClick={() => onReset(keysOf(cur.id))}><ResetIcon /></button></div>
        <Inspector target={cur.id} vars={vars} setVar={setVar} />
      </div>
    </div>
  );
}

function ThemePane({ themeId, applyTheme, vars, setVar, onReset, focus, caretImage, header, footer, setHeader, setFooter, page, setPage }) {
  const [level, setLevel] = useStateSP('global');
  const scroll = useRefSP(null);
  const [flashId, setFlashId] = useStateSP(null);
  const cur = THEMES.find((t) => t.id === themeId) || THEMES[0];
  // a click on the page brings its section into view
  useEffectSP(() => {
    if (!focus) return;
    const id = SECTION_OF[focus.kind] || focus.kind;
    if (id === 'text' && LEVELS_UI.some((l) => l.id === focus.kind)) setLevel(focus.kind);
    const el = scroll.current && scroll.current.querySelector('#th-' + id);
    if (!el) return;
    requestAnimationFrame(() => el.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    setFlashId(id);
    const t = setTimeout(() => setFlashId(null), 1400);
    return () => clearTimeout(t);
  }, [focus]);
  const keysFor = (id) => (id === 'text' ? LEVELS_UI.flatMap((l) => keysOf(l.id)) : keysOf(id));
  const allKeys = SECTIONS.flatMap((g) => g.items.flatMap((it) => keysFor(it.id)));
  return (
    <div className="themepane" ref={scroll}>
      <div className="th-top">
        <div className="th-themes">
          {THEMES.map((t) => (
            <button key={t.id} className={'th-theme' + (t.id === themeId ? ' on' : '')} style={{ fontFamily: t.vars['font-head'] }} title={t.note} onClick={() => applyTheme(t)}>{t.name}</button>
          ))}
        </div>
        <button className="fmt small" title="Put every control back to the theme's values" onClick={() => onReset(allKeys)}><ResetIcon /> Reset all</button>
      </div>
      {SECTIONS.map((g) => (
        <div className="th-group" key={g.group}>
          <div className="th-glabel">{g.group}</div>
          {g.items.map((it) => (
            <section className={'th-section' + (flashId === it.id ? ' flash' : '')} id={'th-' + it.id} key={it.id}>
              <div className="th-head">
                <span className="th-label">{it.label}</span>
                {keysFor(it.id).length > 0 && <button className="fmt ico th-reset" title="Reset this section to the theme" onClick={() => onReset(keysFor(it.id))}><ResetIcon /></button>}
              </div>
              {it.id === 'page' && (
                <div className="insp">
                  <div className="irow"><span className="ir-label"><RowIcon name="width" /><span className="ir-lt">Paper</span></span><div className="ir-ctl"><Seg value={page.size} options={[['A4', 'A4'], ['Letter', 'US Letter']]} onChange={(v) => setPage({ ...page, size: v })} /></div></div>
                  <div className="irow"><span className="ir-label"><RowIcon name="align" /><span className="ir-lt">Orientation</span></span><div className="ir-ctl"><Seg value={page.orient} options={[['portrait', 'Portrait'], ['landscape', 'Landscape']]} onChange={(v) => setPage({ ...page, orient: v })} /></div></div>
                </div>
              )}
              {it.id === 'text'
                ? <TextLevels level={level} setLevel={setLevel} vars={vars} setVar={setVar} onReset={onReset} />
                : <Inspector target={it.id} vars={vars} setVar={setVar} />}
              {it.id === 'page' && (
                <div className="th-sub">
                  {[['Header', header, setHeader, 'spaceA'], ['Footer', footer, setFooter, 'spaceB']].map(([label, val, set, icon]) => (
                    <div className="th-hf" key={label}>
                      <span className="ir-label"><RowIcon name={icon} /><span className="ir-lt">{label}</span><HelpTip where={label.toLowerCase()} /></span>
                      {['l', 'c', 'r'].map((k) => <input key={k} className="th-input th-hf-in" value={(val && val[k]) || ''} placeholder={{ l: 'left', c: 'centre', r: 'right' }[k]} onChange={(e) => set({ ...(val || {}), [k]: e.target.value })} />)}
                    </div>
                  ))}
                  <div className="insp">
                    <div className="irow"><span className="ir-label"><RowIcon name="marker" /><span className="ir-lt">Plain first page</span></span><div className="ir-ctl"><Toggle on={!!page.firstPlain} onChange={(o) => setPage({ ...page, firstPlain: o })} /></div></div>
                  </div>
                </div>
              )}
              {it.id === 'image' && (
                <div className="th-sub">
                  <div className="th-sublabel">{caretImage ? <>This image <code>{caretImage.name}</code></> : 'Put the caret on a line with an image to size it'}</div>
                  <Inspector target="thisimage" vars={vars} setVar={setVar} img={caretImage} />
                  {caretImage && <div className="th-foot">Written into the markdown after the image as <code>{'{width=… align=…}'}</code>.</div>}
                </div>
              )}
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}
