/* Font library — value of each --font-* variable is a full stack */
window.FONTS = [
  { label: 'Public Sans',    stack: "'Public Sans', system-ui, sans-serif" },
  { label: 'Inter',          stack: "'Inter', system-ui, sans-serif" },
  { label: 'Libre Franklin', stack: "'Libre Franklin', system-ui, sans-serif" },
  { label: 'IBM Plex Sans',  stack: "'IBM Plex Sans', system-ui, sans-serif" },
  { label: 'Space Grotesk',  stack: "'Space Grotesk', system-ui, sans-serif" },
  { label: 'Source Serif 4', stack: "'Source Serif 4', Georgia, serif" },
  { label: 'Spectral',       stack: "'Spectral', Georgia, serif" },
  { label: 'Newsreader',     stack: "'Newsreader', Georgia, serif" },
  { label: 'Lora',           stack: "'Lora', Georgia, serif" },
  { label: 'EB Garamond',    stack: "'EB Garamond', Garamond, Georgia, serif" },
  { label: 'Fraunces',       stack: "'Fraunces', Georgia, serif" },
  { label: 'IBM Plex Mono',  stack: "'IBM Plex Mono', ui-monospace, monospace" },
];

const SANS  = "'Public Sans', system-ui, sans-serif";
const INTER = "'Inter', system-ui, sans-serif";
const FRANK = "'Libre Franklin', system-ui, sans-serif";
const PLEX  = "'IBM Plex Sans', system-ui, sans-serif";
const GROT  = "'Space Grotesk', system-ui, sans-serif";
const SERIF = "'Source Serif 4', Georgia, serif";
const SPECT = "'Spectral', Georgia, serif";
const NEWS  = "'Newsreader', Georgia, serif";
const LORA  = "'Lora', Georgia, serif";
const GARA  = "'EB Garamond', Garamond, Georgia, serif";
const FRAUN = "'Fraunces', Georgia, serif";
const MONO  = "'IBM Plex Mono', ui-monospace, monospace";

/* A theme sets the shared variables below; any "h1-…" … "h4-…" key overrides
   that one heading level after the sizes are derived from base × scale^n.  */
window.THEMES = [
  {
    id: 'report', name: 'Report', note: 'Clean sans report',
    vars: {
      'font-body': SANS, 'font-head': SANS, 'font-mono': MONO,
      'fs-base': '15px', 'lh': '1.62', 'scale': '1.22', 'para': '0.85em',
      'page-pad': '20mm', 'head-weight': '650', 'head-num': 'h2', 'num-color': '#2f64e6',
      'h2-color': '#1d4ed8', 'h2-bar': '0', 'h1-bar': '1',
      'ink': '#1b1d22', 'accent': '#2f64e6',
      'muted': '#6b7280', 'rule': '#e3e6eb', 'code-bg': '#f4f5f8',
    },
  },
  {
    id: 'academic', name: 'Academic', note: 'Numbered sections, indented paragraphs',
    vars: {
      'font-body': SERIF, 'font-head': SERIF, 'font-mono': MONO,
      'fs-base': '15.5px', 'lh': '1.66', 'scale': '1.18', 'para': '0em', 'p-indent': '1.5em',
      'page-pad': '25mm', 'head-weight': '600', 'head-tracking': '0em', 'head-num': 'h2',
      'h1-align': 'center', 'h1-bar': '0', 'h1-weight': '600', 'h1-space-below': '1.1em', 'h2-bar': '0',
      'h2-space-below': '0.4em', 'h3-space-below': '0.3em', 'h3-weight': '600',
      'bq-style': 'normal', 'cap-style': 'italic', 'link-deco': 'underline',
      'ink': '#1c1a16', 'accent': '#8a2b21',
      'muted': '#6f685c', 'rule': '#e2dccf', 'code-bg': '#f4f0e7',
    },
  },
  {
    id: 'editorial', name: 'Editorial', note: 'Magazine feature',
    vars: {
      'font-body': SPECT, 'font-head': NEWS, 'font-mono': MONO,
      'fs-base': '16.5px', 'lh': '1.72', 'scale': '1.36', 'para': '0.95em',
      'page-pad': '22mm', 'head-weight': '500', 'head-tracking': '-0.015em',
      'h1-bar': '0', 'h1-lh': '1.04', 'h2-bar': '0', 'h2-color': '#b8402a', 'h2-weight': '500',
      'h3-case': 'uppercase', 'h3-track': '0.08em', 'h3-weight': '600', 'h3-size': '12.5px', 'h3-font': SPECT,
      'bq-border-w': '0px', 'cap-style': 'italic',
      'ink': '#1a1613', 'accent': '#b8402a',
      'muted': '#7d7368', 'rule': '#eae3da', 'code-bg': '#f6f1ec',
    },
  },
  {
    id: 'book', name: 'Book', note: 'Garamond, centred headings, indents',
    vars: {
      'font-body': GARA, 'font-head': GARA, 'font-mono': MONO,
      'fs-base': '16.5px', 'lh': '1.58', 'scale': '1.2', 'para': '0em', 'p-indent': '1.4em',
      'pad-y': '24mm', 'pad-x': '26mm', 'head-weight': '500', 'head-tracking': '0em',
      'h1-align': 'center', 'h1-bar': '0', 'h1-weight': '400', 'h1-space-below': '1.4em', 'h1-track': '0.01em',
      'h2-align': 'center', 'h2-bar': '0', 'h2-case': 'uppercase', 'h2-track': '0.14em', 'h2-size': '14px', 'h2-weight': '500', 'h2-space': '2.2em', 'h2-space-below': '1em',
      'h3-case': 'none', 'h3-weight': '500', 'h3-size': '17px', 'h3-lh': '1.3',
      'bq-border-w': '0px', 'bq-style': 'italic', 'cap-style': 'italic', 'tbl-stripe': '0',
      'ink': '#221e19', 'accent': '#7a4b1f',
      'muted': '#80766a', 'rule': '#ddd4c6', 'code-bg': '#f5f0e8',
    },
  },
  {
    id: 'technical', name: 'Technical', note: 'Numbered spec with strong code',
    vars: {
      'font-body': INTER, 'font-head': INTER, 'font-mono': MONO,
      'fs-base': '14px', 'lh': '1.6', 'scale': '1.2', 'para': '0.8em',
      'page-pad': '20mm', 'head-weight': '650', 'head-tracking': '-0.015em', 'head-num': 'h2',
      'body-align': 'left', 'num-color': '#0e7490',
      'h1-bar': '0', 'h2-bar': '1', 'h2-space': '1.7em',
      'code-size': '0.86em', 'tbl-size': '0.92em', 'link-deco': 'underline', 'link-deco-color': '#a5d8e3',
      'ink': '#111827', 'accent': '#0e7490',
      'muted': '#6b7280', 'rule': '#e5e7eb', 'code-bg': '#f3f6f8',
    },
  },
  {
    id: 'modern', name: 'Modern', note: 'Bold grotesk headings, violet accent',
    vars: {
      'font-body': INTER, 'font-head': GROT, 'font-mono': MONO,
      'fs-base': '15px', 'lh': '1.65', 'scale': '1.28', 'para': '0.9em',
      'page-pad': '20mm', 'head-weight': '700', 'head-tracking': '-0.025em',
      'body-align': 'left', 'h1-bar': '0', 'h1-lh': '1.05', 'h2-bar': '0', 'h2-color': '#6d28d9',
      'h4-case': 'uppercase', 'h4-track': '0.06em', 'h4-size': '12px',
      'bq-border-w': '4px', 'tbl-stripe': '1',
      'ink': '#18181b', 'accent': '#6d28d9',
      'muted': '#71717a', 'rule': '#e4e4e7', 'code-bg': '#f4f4f5',
    },
  },
  {
    id: 'minimal', name: 'Minimal', note: 'Quiet, light and airy',
    vars: {
      'font-body': INTER, 'font-head': INTER, 'font-mono': MONO,
      'fs-base': '14.5px', 'lh': '1.72', 'scale': '1.18', 'para': '1em',
      'pad-y': '24mm', 'pad-x': '26mm', 'head-weight': '500', 'head-tracking': '-0.01em',
      'body-align': 'left', 'h1-bar': '0', 'h2-bar': '0', 'h1-weight': '400', 'h2-color': '#52525b',
      'h3-color': '#71717a', 'h4-color': '#71717a',
      'bq-border-w': '1px', 'bq-style': 'normal', 'code-border': '0', 'tbl-stripe': '0', 'img-radius': '0',
      'ink': '#27272a', 'accent': '#3f3f46',
      'muted': '#a1a1aa', 'rule': '#ececee', 'code-bg': '#f7f7f8',
    },
  },
  {
    id: 'letter', name: 'Letter', note: 'Warm serif for letters and proposals',
    vars: {
      'font-body': LORA, 'font-head': FRAUN, 'font-mono': MONO,
      'fs-base': '14.5px', 'lh': '1.64', 'scale': '1.24', 'para': '0.95em',
      'pad-y': '24mm', 'pad-x': '25mm', 'head-weight': '600', 'head-tracking': '-0.01em',
      'body-align': 'left', 'h1-bar': '0', 'h1-color': '#5b2a4e', 'h2-bar': '0', 'h2-color': '#5b2a4e',
      'bq-style': 'italic', 'cap-style': 'italic',
      'ink': '#231f20', 'accent': '#8e3b74',
      'muted': '#7b6f73', 'rule': '#eadfe4', 'code-bg': '#f7f1f4',
    },
  },
  {
    id: 'memo', name: 'Memo', note: 'Plain business memo',
    vars: {
      'font-body': PLEX, 'font-head': PLEX, 'font-mono': MONO,
      'fs-base': '13.5px', 'lh': '1.55', 'scale': '1.16', 'para': '0.75em',
      'page-pad': '20mm', 'head-weight': '600', 'head-tracking': '0em',
      'body-align': 'left', 'h1-bar': '1', 'h1-case': 'uppercase', 'h1-track': '0.06em', 'h1-size': '19px',
      'h2-bar': '0', 'h2-color': '#1e3a5f',
      'ink': '#1f2328', 'accent': '#1e3a5f',
      'muted': '#656d76', 'rule': '#d8dee4', 'code-bg': '#f3f5f7',
    },
  },
  {
    id: 'resume', name: 'Résumé', note: 'Compact, one to two pages',
    vars: {
      'font-body': SANS, 'font-head': SANS, 'font-mono': MONO,
      'fs-base': '11.5px', 'lh': '1.42', 'scale': '1.16', 'para': '0.45em',
      'page-pad': '15mm', 'pad-x': '17mm',
      'head-weight': '700', 'head-tracking': '0.02em', 'head-transform': 'uppercase',
      'h1-bar': '0', 'h1-size': '24px', 'h1-track': '0.04em', 'h2-bar': '1', 'h2-color': '#1f4ed8', 'h2-track': '0.08em', 'h2-size': '12.5px',
      'h3-bar': '0', 'h3-case': 'none', 'h4-case': 'none', 'body-align': 'left',
      'tbl-size': '1em', 'tbl-stripe': '0',
      'ink': '#1c1f26', 'accent': '#1f4ed8',
      'muted': '#5b6470', 'rule': '#d9dde3', 'code-bg': '#f3f4f6',
    },
  },
  {
    id: 'compact', name: 'Compact', note: 'Dense, fits more',
    vars: {
      'font-body': FRANK, 'font-head': FRANK, 'font-mono': MONO,
      'fs-base': '12.5px', 'lh': '1.45', 'scale': '1.14', 'para': '0.6em',
      'page-pad': '14mm', 'body-align': 'left', 'para-lines': '1',
      'ink': '#1a1a1a', 'accent': '#444444',
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
    return { font: 'font-body', size: 'fs-base', weight: 'body-weight', lh: 'lh', track: 'body-track', spaceA: 'para-above', spaceB: 'para', case: 'body-case', bar: 'body-bar', color: 'ink', align: 'body-align' };
  }
  return { font: lvl + '-font', size: lvl + '-size', weight: lvl + '-weight', lh: lvl + '-lh', track: lvl + '-track', spaceA: lvl + '-space', spaceB: lvl + '-space-below', case: lvl + '-case', bar: lvl + '-bar', color: lvl + '-color', align: lvl + '-align' };
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
    'body-hyphens': v['body-hyphens'] || 'auto',
    'p-indent': v['p-indent'] || '0em',
    'link-deco-color': v['link-deco-color'] || 'currentColor',
    'head-num': v['head-num'] || 'none', 'num-color': v['num-color'] || 'inherit',
    'para-lines': v['para-lines'] || '2',
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
    out[L + '-color'] = v['head-color'] || v['ink'];
    out[L + '-align'] = 'left';
  });
  // per-level overrides a theme spells out
  Object.keys(v).forEach((k) => { if (/^h[1-4]-/.test(k)) out[k] = v[k]; });
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
  'h1-color', 'h2-color', 'h3-color', 'h4-color', 'h1-align', 'h2-align', 'h3-align', 'h4-align',
  'p-indent', 'link-deco-color', 'head-num', 'num-color', 'para-lines', 'body-hyphens',
  'pad-y', 'pad-x', 'measure', 'ink', 'paper', 'accent', 'muted', 'rule', 'code-bg',
];
