/* Font library — value of each --font-* variable is a full stack */
window.FONTS = [
  { label: 'Public Sans',   stack: "'Public Sans', system-ui, sans-serif" },
  { label: 'Libre Franklin',stack: "'Libre Franklin', system-ui, sans-serif" },
  { label: 'IBM Plex Sans', stack: "'IBM Plex Sans', system-ui, sans-serif" },
  { label: 'Source Serif 4',stack: "'Source Serif 4', Georgia, serif" },
  { label: 'Spectral',      stack: "'Spectral', Georgia, serif" },
  { label: 'Newsreader',    stack: "'Newsreader', Georgia, serif" },
  { label: 'IBM Plex Mono', stack: "'IBM Plex Mono', ui-monospace, monospace" },
];

/* The editable CSS variables, in display order, with control metadata */
window.VAR_SPEC = [
  { key: 'font-body', label: 'Body font',     type: 'font' },
  { key: 'font-head', label: 'Heading font',  type: 'font' },
  { key: 'font-mono', label: 'Mono font',     type: 'font' },
  { key: 'fs-base',   label: 'Base size',     type: 'range', min: 11, max: 20, step: 0.5, unit: 'px' },
  { key: 'lh',        label: 'Line height',   type: 'range', min: 1.2, max: 2.0, step: 0.02, unit: '' },
  { key: 'scale',     label: 'Heading scale', type: 'range', min: 1.08, max: 1.5, step: 0.01, unit: '' },
  { key: 'para',      label: 'Paragraph gap', type: 'range', min: 0.3, max: 1.6, step: 0.05, unit: 'em' },
  { key: 'page-pad',  label: 'Page margin',   type: 'range', min: 8, max: 35, step: 1, unit: 'mm' },
  { key: 'measure',   label: 'Text measure',  type: 'measure' },
  { key: 'ink',       label: 'Text',          type: 'color' },
  { key: 'accent',    label: 'Accent',        type: 'color' },
  { key: 'muted',     label: 'Muted',         type: 'color' },
  { key: 'rule',      label: 'Rules / borders', type: 'color' },
  { key: 'code-bg',   label: 'Code background', type: 'color' },
];

const SANS  = "'Public Sans', system-ui, sans-serif";
const FRANK = "'Libre Franklin', system-ui, sans-serif";
const SERIF = "'Source Serif 4', Georgia, serif";
const SPECT = "'Spectral', Georgia, serif";
const NEWS  = "'Newsreader', Georgia, serif";
const MONO  = "'IBM Plex Mono', ui-monospace, monospace";

window.THEMES = [
  {
    id: 'report', name: 'Report', note: 'Clean sans report',
    vars: {
      'font-body': SANS, 'font-head': SANS, 'font-mono': MONO,
      'fs-base': '15.5px', 'lh': '1.65', 'scale': '1.2', 'para': '0.9em',
      'page-pad': '20mm', 'measure': 'none',
      'ink': '#1b1d22', 'paper': '#ffffff', 'accent': '#2f64e6',
      'muted': '#6b7280', 'rule': '#e6e8ec', 'code-bg': '#f4f5f8',
    },
  },
  {
    id: 'academic', name: 'Academic', note: 'Classic serif',
    vars: {
      'font-body': SERIF, 'font-head': SERIF, 'font-mono': MONO,
      'fs-base': '16px', 'lh': '1.72', 'scale': '1.22', 'para': '0.95em',
      'page-pad': '26mm', 'measure': 'none',
      'ink': '#1c1a16', 'paper': '#ffffff', 'accent': '#8a2b21',
      'muted': '#6f685c', 'rule': '#e7e1d4', 'code-bg': '#f4f0e7',
    },
  },
  {
    id: 'editorial', name: 'Editorial', note: 'Magazine display',
    vars: {
      'font-body': SPECT, 'font-head': NEWS, 'font-mono': MONO,
      'fs-base': '17px', 'lh': '1.74', 'scale': '1.34', 'para': '1em',
      'page-pad': '22mm', 'measure': 'none',
      'ink': '#1a1613', 'paper': '#ffffff', 'accent': '#b8402a',
      'muted': '#7d7368', 'rule': '#eae3da', 'code-bg': '#f6f1ec',
    },
  },
  {
    id: 'resume', name: 'Résumé', note: 'Compact, one to two pages',
    vars: {
      'font-body': SANS, 'font-head': SANS, 'font-mono': MONO,
      'fs-base': '11.5px', 'lh': '1.42', 'scale': '1.16', 'para': '0.45em',
      'page-pad': '15mm', 'pad-x': '17mm', 'measure': 'none',
      'head-weight': '700', 'head-tracking': '0.02em', 'head-transform': 'uppercase',
      'h1-bar': '0', 'h2-bar': '1', 'h3-bar': '0', 'h3-case': 'none', 'h4-case': 'none', 'body-align': 'left',
      'tbl-size': '1em', 'tbl-stripe': '0',
      'ink': '#1c1f26', 'paper': '#ffffff', 'accent': '#1f4ed8',
      'muted': '#5b6470', 'rule': '#d9dde3', 'code-bg': '#f3f4f6',
    },
  },
  {
    id: 'compact', name: 'Compact', note: 'Dense, fits more',
    vars: {
      'font-body': FRANK, 'font-head': FRANK, 'font-mono': MONO,
      'fs-base': '12.5px', 'lh': '1.45', 'scale': '1.14', 'para': '0.6em',
      'page-pad': '14mm', 'measure': 'none',
      'ink': '#1a1a1a', 'paper': '#ffffff', 'accent': '#444444',
      'muted': '#777777', 'rule': '#e4e4e4', 'code-bg': '#f5f5f5',
    },
  },
];

/* The text levels exposed as per-level style cells, in display order */
window.LEVELS = [
  { key: 'h1', label: 'H1', tag: 'Heading 1' },
  { key: 'h2', label: 'H2', tag: 'Heading 2' },
  { key: 'h3', label: 'H3', tag: 'Heading 3' },
  { key: 'h4', label: 'H4', tag: 'Heading 4' },
  { key: 'p',  label: 'Body',  tag: 'Body text' },
];

/* The CSS-variable keys a given level owns (used by cells + doc.css). */
window.levelKeys = function (lvl) {
  if (lvl === 'p') {
    return { font: 'font-body', size: 'fs-base', weight: 'body-weight', lh: 'lh', track: 'body-track', spaceA: 'para-above', spaceB: 'para', case: 'body-case', bar: 'body-bar' };
  }
  return { font: lvl + '-font', size: lvl + '-size', weight: lvl + '-weight', lh: lvl + '-lh', track: lvl + '-track', spaceA: lvl + '-space', spaceB: lvl + '-space-below', case: lvl + '-case', bar: lvl + '-bar' };
};

/* Expand an authored theme into the full per-level variable set that the
   document actually renders from. Sizes derive from base × scale^n; headings
   inherit the theme's heading font / weight / tracking / case.               */
window.expandTheme = function (v) {
  const base = parseFloat(v['fs-base']) || 16;
  const s = parseFloat(v['scale']) || 1.2;
  const hw = String(v['head-weight'] || '650');
  const ht = v['head-tracking'] || '-0.01em';
  const hc = v['head-transform'] || 'none';
  const px = (n) => (Math.round(n * 10) / 10) + 'px';
  const sizes = { h1: base * s * s * s, h2: base * s * s, h3: base * s, h4: base };
  const lhs = { h1: '1.12', h2: '1.16', h3: '1.22', h4: '1.3' };
  const spc = { h1: '0.6em', h2: '1.5em', h3: '1.3em', h4: '1.1em' };
  const spcB = { h1: '0.5em', h2: '0.5em', h3: '0.5em', h4: '0.5em' };
  const bars = { h1: '1', h2: '1', h3: '0', h4: '0' };
  const out = {
    'font-mono': v['font-mono'],
    'pad-y': v['pad-y'] || v['page-pad'] || '20mm', 'pad-x': v['pad-x'] || v['page-pad'] || '20mm', 'measure': v['measure'] || 'none',
    'ink': v['ink'], 'paper': '#ffffff', 'accent': v['accent'],
    'muted': v['muted'], 'rule': v['rule'], 'code-bg': v['code-bg'],
    'lh': v['lh'] || '1.6', 'para': v['para'] || '0.9em', 'para-above': v['para-above'] || '0em',
    'font-body': v['font-body'], 'fs-base': px(base),
    'body-weight': '400', 'body-track': '0em', 'body-case': 'none', 'body-bar': v['body-bar'] || '0',
    'bq-border': v['bq-border'] || v['accent'], 'bq-border-w': v['bq-border-w'] || '3px',
    'bq-color': v['bq-color'] || v['muted'], 'bq-style': v['bq-style'] || 'italic',
    'link-color': v['link-color'] || v['accent'], 'link-deco': v['link-deco'] || 'none',
    'list-marker': v['list-marker'] || v['muted'], 'list-gap': v['list-gap'] || '0.25em', 'list-indent': v['list-indent'] || '1.4em',
    'tbl-head-bg': v['tbl-head-bg'] || v['code-bg'], 'tbl-border': v['tbl-border'] || v['rule'],
    'tbl-pad-y': v['tbl-pad-y'] || '0.45em', 'tbl-pad-x': v['tbl-pad-x'] || '0.7em',
    'img-width': v['img-width'] || '100%', 'img-radius': v['img-radius'] || '1',
    'body-align': v['body-align'] || 'justify',
    'tbl-size': v['tbl-size'] || '0.94em', 'tbl-stripe': v['tbl-stripe'] || '1',
    'code-size': v['code-size'] || '0.85em', 'code-border': v['code-border'] || '1',
    'cap-size': v['cap-size'] || '0.85em', 'cap-color': v['cap-color'] || v['muted'], 'cap-style': v['cap-style'] || 'normal', 'cap-align': v['cap-align'] || 'center',
    'fn-size': v['fn-size'] || '0.82em', 'fn-color': v['fn-color'] || v['muted'],
  };
  ['h1', 'h2', 'h3', 'h4'].forEach((L) => {
    out[L + '-font'] = v['font-head'];
    out[L + '-size'] = px(sizes[L]);
    out[L + '-weight'] = hw;
    out[L + '-lh'] = lhs[L];
    out[L + '-track'] = ht;
    out[L + '-space'] = spc[L];
    out[L + '-space-below'] = spcB[L];
    out[L + '-case'] = v[L + '-case'] || hc;   // a theme may exempt a level from the heading case
    out[L + '-bar'] = v[L + '-bar'] || bars[L];
  });
  return out;
};

/* Ordered key list for the theme-CSS preview / copy */
window.CSS_ORDER = [
  'font-body', 'fs-base', 'lh', 'para-above', 'para', 'body-weight', 'body-track', 'body-case', 'body-bar',
  'h1-font', 'h1-size', 'h1-weight', 'h1-lh', 'h1-track', 'h1-space', 'h1-space-below', 'h1-case', 'h1-bar',
  'h2-font', 'h2-size', 'h2-weight', 'h2-lh', 'h2-track', 'h2-space', 'h2-space-below', 'h2-case', 'h2-bar',
  'h3-font', 'h3-size', 'h3-weight', 'h3-lh', 'h3-track', 'h3-space', 'h3-space-below', 'h3-case', 'h3-bar',
  'h4-font', 'h4-size', 'h4-weight', 'h4-lh', 'h4-track', 'h4-space', 'h4-space-below', 'h4-case', 'h4-bar',
  'font-mono',
  'bq-border', 'bq-border-w', 'bq-color', 'bq-style',
  'link-color', 'link-deco',
  'list-marker', 'list-gap', 'list-indent',
  'tbl-head-bg', 'tbl-border', 'tbl-pad-y', 'tbl-pad-x',
  'img-width', 'img-radius', 'body-align', 'tbl-size', 'tbl-stripe', 'code-size', 'code-border',
  'cap-size', 'cap-color', 'cap-style', 'cap-align', 'fn-size', 'fn-color',
  'pad-y', 'pad-x', 'measure', 'ink', 'paper', 'accent', 'muted', 'rule', 'code-bg',
];
