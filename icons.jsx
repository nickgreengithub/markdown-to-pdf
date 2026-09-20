/* global React */
/* ============================================================
   Icons — small inline SVG glyphs shared by both panes.
   ============================================================ */
const ICON = { w: 17, h: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const PrintIcon = () => (
  <svg width={ICON.w} height={ICON.h} viewBox={ICON.viewBox} fill={ICON.fill} stroke={ICON.stroke} strokeWidth={ICON.strokeWidth} strokeLinecap={ICON.strokeLinecap} strokeLinejoin={ICON.strokeLinejoin}>
    <path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 14h12v7H6z" />
  </svg>
);
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

const PageBreakIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 4h14v5H5zM5 15h14v5H5z" />
    <path d="M3 12h2M8 12h2M13 12h2M18 12h3" strokeDasharray="0" />
  </svg>
);
const SpaceIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16M4 19h16" />
    <path d="M12 8v8" /><path d="m9 13 3 3 3-3" /><path d="m9 11 3-3 3 3" />
  </svg>
);
const HelpIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8" /><path d="M12 17h.01" />
  </svg>
);
const LibraryIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" />
  </svg>
);
const SingleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="3" width="10" height="18" rx="1.5" />
  </svg>
);
const SpreadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="5" width="8.5" height="14" rx="1.5" /><rect x="13" y="5" width="8.5" height="14" rx="1.5" />
  </svg>
);
const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="7" rx="1" /><rect x="9.5" y="3" width="5" height="7" rx="1" /><rect x="16" y="3" width="5" height="7" rx="1" />
    <rect x="3" y="14" width="5" height="7" rx="1" /><rect x="9.5" y="14" width="5" height="7" rx="1" /><rect x="16" y="14" width="5" height="7" rx="1" />
  </svg>
);
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
);
const ResetIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
  </svg>
);
const LogoMark = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect x="3" y="2" width="20" height="26" rx="3" fill="#2f64e6" />
    <rect x="9" y="6" width="20" height="26" rx="3" fill="#fff" stroke="#1b1d22" strokeWidth="2" />
    <path d="M13 22V13l4 5 4-5v9" fill="none" stroke="#1b1d22" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const FMT_ICONS = { bold: BoldIcon, italic: ItalicIcon, strike: StrikeIcon, bullet: BulletIcon, ordered: OrderedIcon, quote: QuoteIcon, table: TableIcon, link: LinkIcon, image: ImageIcon, pagebreak: PageBreakIcon, vspace: SpaceIcon };

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
