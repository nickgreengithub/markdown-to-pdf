/* ============================================================
   Paginate — lay rendered blocks out onto real A4 sheets.

   The same sheets are what the preview shows and what print sends to
   the PDF, so a page break you see is the page break you get.

   paginate(html, ctx) → Promise<{ sheets: HTMLElement[], overflow: number }>
     ctx.measure   an unzoomed, hidden element styled like a sheet's .doc
                   (same width, padding and theme variables). Blocks are
                   rendered here first so their heights can be read.
     ctx.pageH     sheet height in CSS px (297mm)
     ctx.padY      vertical page padding in CSS px
     ctx.header    running header: { l, c, r } texts (a string means centre); {page} and {pages}
     ctx.footer    running footer, same shape
     ctx.firstPlain no header or footer on the first page
     ctx.minLines  widows & orphans: a paragraph split across pages keeps at
                   least this many lines on each side (default 2)
     ctx.token     () => boolean — false means a newer request superseded this one

   Rules:
   - a block that does not fit moves whole to the next page, except:
   - paragraphs split at lines, keeping ctx.minLines lines on each side
   - tables split at rows (header repeated), lists at items, code at lines,
     blockquotes and footnotes at their children — only when at least two
     pieces stay behind
   - a heading (or a caption above a table) is never left alone at the
     bottom of a page
   - \toc entries get the page their heading landed on
   - \pagebreak ends the page; \vspace that would cross the page end is dropped
   - a block taller than a page that cannot split is clipped and flagged
   ============================================================ */
window.Paginate = (() => {
  const EPS = 0.75;
  const SPLIT_CONTAINERS = new Set(['UL', 'OL', 'BLOCKQUOTE', 'SECTION']);
  const HEADINGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

  const px = (v) => parseFloat(v) || 0;
  const rectH = (el) => el.getBoundingClientRect().height;
  const metrics = (el) => {
    const cs = getComputedStyle(el);
    return { mt: px(cs.marginTop), mb: px(cs.marginBottom), h: rectH(el) };
  };

  /* wait for images inside `root` (object URLs are local, so this is quick) */
  const imagesReady = (root) => Promise.all([...root.querySelectorAll('img')].map((im) => (
    im.complete ? Promise.resolve() : new Promise((res) => { im.onload = im.onerror = () => res(); setTimeout(res, 1500); })
  )));

  /* ---- splitting -------------------------------------------------------- */
  /* Try to split `el` so the first part is at most `avail` px tall.
     Returns { head, rest } or null if it cannot be split usefully. */
  let MIN_LINES = 2;
  function split(el, avail) {
    const tag = el.tagName;
    if (tag === 'P' && !el.classList.contains('tcap')) return splitPara(el, avail, MIN_LINES);
    if (tag === 'TABLE') return splitTable(el, avail);
    if (tag === 'PRE') return splitPre(el, avail);
    if (SPLIT_CONTAINERS.has(tag)) return splitChildren(el, avail);
    return null;
  }
  function splitTable(table, avail) {
    const body = table.tBodies[0];
    if (!body) return null;
    const rows = [...body.rows];
    if (rows.length < 3) return null;
    const top = table.getBoundingClientRect().top;
    const headH = table.tHead ? rectH(table.tHead) : 0;
    let k = 0;
    for (let i = 0; i < rows.length; i++) {
      const bottom = rows[i].getBoundingClientRect().bottom - top;
      if (bottom <= avail + EPS) k = i + 1; else break;
    }
    if (k < 2 || k >= rows.length) return null;
    // the remainder: same table shell, header repeated, remaining rows
    const rest = table.cloneNode(false);
    if (table.tHead) rest.appendChild(table.tHead.cloneNode(true));
    const rb = body.cloneNode(false);
    rows.slice(k).forEach((r) => rb.appendChild(r));
    rest.appendChild(rb);
    if (table.tFoot) rest.appendChild(table.tFoot);
    table.classList.add('split-head'); rest.classList.add('split-rest');
    void headH;
    return { head: table, rest };
  }
  /* the line boxes of a block, as [{t, b}] relative to its top */
  function lineBoxes(el) {
    const r = document.createRange(); r.selectNodeContents(el);
    const top = el.getBoundingClientRect().top;
    const rects = [...r.getClientRects()].filter((x) => x.height > 0).map((x) => ({ t: x.top - top, b: x.bottom - top })).sort((a, b) => a.t - b.t);
    const lines = [];
    rects.forEach((x) => {
      const cur = lines[lines.length - 1];
      if (cur && x.t < cur.b - 2) cur.b = Math.max(cur.b, x.b); else lines.push({ t: x.t, b: x.b });
    });
    return lines;
  }
  /* where the first word whose middle sits below `y` (px from el's top) starts */
  function wordBelow(el, y) {
    const top = el.getBoundingClientRect().top;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const r = document.createRange();
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const s = n.data;
      if (!s.trim()) continue;
      r.selectNodeContents(n);
      const all = r.getClientRects();
      if (!all.length || all[all.length - 1].bottom - top <= y) continue;
      for (let i = 0; i < s.length; i++) {
        if (/\s/.test(s[i]) || (i > 0 && !/\s/.test(s[i - 1]))) continue;
        r.setStart(n, i); r.setEnd(n, i + 1);
        const b = r.getBoundingClientRect();
        if ((b.top + b.bottom) / 2 - top > y) return { node: n, offset: i };
      }
    }
    return null;
  }
  function splitPara(p, avail, min) {
    min = Math.max(1, min || 2);
    const lines = lineBoxes(p);
    const L = lines.length;
    if (L < 2 * min) return null;
    let k = 0;
    lines.forEach((l, i) => { if (l.b <= avail + EPS) k = i + 1; });
    k = Math.min(k, L - min);
    for (; k >= min; k--) {
      const at = wordBelow(p, lines[k - 1].b);
      if (!at) return null;
      const r = document.createRange();
      r.setStart(at.node, at.offset); r.setEnd(p, p.childNodes.length);
      const rest = p.cloneNode(false);
      rest.appendChild(r.extractContents());
      p.classList.add('split-head');
      // a hyphenated word pulled whole onto the last line can push it over: try a line earlier
      if (rectH(p) <= avail + EPS) { rest.classList.add('split-rest'); rest.classList.remove('split-head'); return { head: p, rest }; }
      p.classList.remove('split-head');
      p.append(...rest.childNodes);
    }
    return null;
  }
  function splitPre(pre, avail) {
    const code = pre.querySelector('code') || pre;
    const text = code.textContent.replace(/\n$/, '');
    const lines = text.split('\n');
    if (lines.length < 4) return null;
    const cs = getComputedStyle(pre);
    const pad = px(cs.paddingTop) + px(cs.paddingBottom) + px(cs.borderTopWidth) + px(cs.borderBottomWidth);
    const lineH = (rectH(pre) - pad) / lines.length;
    const k = Math.floor((avail - pad) / lineH);
    if (k < 2 || k >= lines.length - 1) return null;
    const rest = pre.cloneNode(true);
    const rc = rest.querySelector('code') || rest;
    code.textContent = lines.slice(0, k).join('\n') + '\n';
    rc.textContent = lines.slice(k).join('\n') + '\n';
    pre.classList.add('split-head'); rest.classList.add('split-rest');
    return { head: pre, rest };
  }
  function splitChildren(el, avail) {
    const kids = [...el.children].filter((c) => c.tagName !== 'HR' || el.tagName !== 'SECTION');
    if (kids.length < 3) return null;
    const top = el.getBoundingClientRect().top;
    let k = 0;
    for (let i = 0; i < kids.length; i++) {
      const bottom = kids[i].getBoundingClientRect().bottom - top;
      if (bottom <= avail + EPS) k = i + 1; else break;
    }
    if (k < 2 || k >= kids.length) return null;
    const rest = el.cloneNode(false);
    if (el.tagName === 'OL') rest.setAttribute('start', String((parseInt(el.getAttribute('start') || '1', 10) || 1) + k));
    if (el.tagName === 'SECTION') { const hr = el.querySelector(':scope > hr'); if (hr) rest.appendChild(hr.cloneNode(true)); }
    kids.slice(k).forEach((c) => rest.appendChild(c));
    el.classList.add('split-head'); rest.classList.add('split-rest');
    return { head: el, rest };
  }

  /* ---- sheet construction ----------------------------------------------- */
  const fillTokens = (tpl, page, pages) => String(tpl).replace(/\{page\}/g, page).replace(/\{pages\}/g, pages);
  function makeSheet(n, ctx) {
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.dataset.page = String(n);
    const doc = document.createElement('div');
    doc.className = 'doc';
    sheet.appendChild(doc);
    const label = document.createElement('span');
    label.className = 'sheet-label';
    label.textContent = 'Page ' + n;
    sheet.appendChild(label);
    if (!(ctx.firstPlain && n === 1)) {
      [['phead', ctx.header], ['pfoot', ctx.footer]].forEach(([cls, spec]) => {
        const parts = typeof spec === 'string' ? { c: spec } : (spec || {});
        if (!['l', 'c', 'r'].some((k) => parts[k] && String(parts[k]).trim())) return;
        const el = document.createElement('div');
        el.className = cls;
        ['l', 'c', 'r'].forEach((k) => {
          const span = document.createElement('span');
          span.className = 'p' + k;
          span.dataset.tpl = parts[k] ? String(parts[k]) : '';
          span.textContent = fillTokens(span.dataset.tpl, n, n);
          el.appendChild(span);
        });
        sheet.appendChild(el);
      });
    }
    return sheet;
  }

  async function paginate(html, ctx) {
    const measure = ctx.measure;
    measure.innerHTML = '<div class="m0"></div>' + html; // m0 keeps real blocks off :first-child
    await imagesReady(measure);
    if (ctx.token && !ctx.token()) return null;

    const C = ctx.pageH - 2 * ctx.padY;     // usable height per page
    MIN_LINES = ctx.minLines || 2;
    const sheets = [];
    let sheet = null, doc = null, y = 0, prevMb = 0, count = 0, overflow = 0, lastWasBreak = false;
    const newPage = () => {
      sheet = makeSheet(sheets.length + 1, ctx); doc = sheet.firstChild;
      sheets.push(sheet); y = 0; prevMb = 0; count = 0;
    };
    const place = (node, m) => {
      if (count === 0) { node.style.marginTop = '0'; y = m.h; }
      else y = y + Math.max(prevMb, m.mt) + m.h;
      doc.appendChild(node);
      prevMb = m.mb; count++;
    };
    newPage();

    const queue = [...measure.children].filter((n) => !n.classList.contains('m0'));
    let guard = 0;
    while (queue.length) {
      if (++guard > 20000) break;
      if (ctx.token && !ctx.token()) return null;
      const node = queue.shift();
      const cls = node.classList;

      if (cls.contains('pagebreak')) {
        if (count > 0 || lastWasBreak) {
          if (count > 0) { node.style.marginTop = '0'; doc.appendChild(node); } // keeps the marker visible on the page it ends
          newPage();
        }
        lastWasBreak = true;
        continue;
      }
      lastWasBreak = false;

      const m = metrics(node);
      const top = count === 0 ? 0 : y + Math.max(prevMb, m.mt);
      const fits = top + m.h <= C + EPS;
      if (fits) { place(node, m); continue; }

      if (cls.contains('vspace')) { newPage(); continue; }   // space that crosses a page end is dropped

      const avail = C - top;
      const part = m.h > avail ? split(node, avail) : null;
      if (part) {
        place(part.head, metrics(part.head));
        // the remainder is measured in place, then dealt with on the next page
        measure.appendChild(part.rest);
        queue.unshift(part.rest);
        newPage();
        continue;
      }

      if (count > 0) {
        // keep a heading with what follows it
        const last = doc.lastElementChild;
        const pull = last && (HEADINGS.has(last.tagName) || last.classList.contains('keep-next')) && count > 1 ? last : null;
        newPage();
        if (pull) {
          // back into the measuring area: a detached sheet reports zero heights
          pull.style.marginTop = ''; measure.appendChild(pull);
          queue.unshift(node); queue.unshift(pull); continue;
        }
        queue.unshift(node);
        continue;
      }
      // alone on an empty page and still too tall: split as much as we can, else clip
      const p2 = split(node, C);
      if (p2) { place(p2.head, metrics(p2.head)); measure.appendChild(p2.rest); queue.unshift(p2.rest); newPage(); continue; }
      place(node, m);
      sheet.classList.add('overflows'); overflow++;
    }
    // an empty trailing page only exists if the document ended with \pagebreak; keep it (that is what was asked)
    return { sheets, overflow };
  }

  /* does real content run into the bottom margin? (scrollHeight would also
     count the preview-only page-break marker, which may hang past the end) */
  function overfull(doc) {
    let last = doc.lastElementChild;
    while (last && (last.classList.contains('pagebreak') || last.classList.contains('cur-tag'))) last = last.previousElementSibling;
    if (!last) return false;
    const top = last.offsetParent === doc ? last.offsetTop : last.offsetTop - doc.offsetTop;
    // a few px of slack: the preview is zoomed, and zoom rounding alone can add that much
    return top + last.offsetHeight > doc.clientHeight - px(getComputedStyle(doc).paddingBottom) + 4;
  }

  /* After the sheets are in the live DOM, catch anything the measurement
     missed (font swaps, sub-pixel rounding): push the last block of an
     overflowing page onto the next one. */
  function verify(container, ctx) {
    const sheets = [...container.querySelectorAll(':scope > .sheet')];
    let moved = 0;
    for (let i = 0; i < sheets.length && moved < 200; i++) {
      const doc = sheets[i].querySelector(':scope > .doc');
      let guard = 0;
      while (overfull(doc) && doc.children.length > 1 && guard++ < 50) {
        const last = doc.lastElementChild;
        if (last.classList.contains('pagebreak')) {
          // the page was ended on purpose: the block before the break moves, with the break, onto a page of its own
          const prev = last.previousElementSibling;
          if (!prev || doc.children.length < 3) break;
          const ns = makeSheet(sheets.length + 1, ctx);
          container.insertBefore(ns, sheets[i].nextSibling); sheets.splice(i + 1, 0, ns);
          const nd = ns.querySelector(':scope > .doc');
          prev.style.marginTop = '0'; nd.appendChild(prev); nd.appendChild(last);
          moved++;
          continue;
        }
        let next = sheets[i + 1];
        if (!next) { next = makeSheet(sheets.length + 1, ctx); container.appendChild(next); sheets.push(next); }
        const nd = next.querySelector(':scope > .doc');
        last.style.marginTop = '0';
        if (nd.firstElementChild) nd.firstElementChild.style.marginTop = '';
        nd.insertBefore(last, nd.firstChild);
        moved++;
      }
      // a sheet left holding nothing (everything moved on) is dropped
      if (!doc.children.length && sheets.length > 1) { sheets[i].remove(); }
    }
    // renumber, and fill the running header / footer now the page count is known
    const all = [...container.querySelectorAll(':scope > .sheet')];
    all.forEach((s, i) => {
      s.dataset.page = String(i + 1);
      const l = s.querySelector(':scope > .sheet-label'); if (l) l.textContent = 'Page ' + (i + 1);
      s.querySelectorAll(':scope > .phead > span, :scope > .pfoot > span').forEach((el) => { el.textContent = fillTokens(el.dataset.tpl, i + 1, all.length); });
    });
    fillToc(container);
    return moved;
  }

  /* contents entries → the page their heading is on */
  function fillToc(container) {
    container.querySelectorAll('.toc-pg[data-sec]').forEach((el) => {
      const h = container.querySelector(`.doc > [data-sec="${el.dataset.sec}"]:not(.toc-pg)`);
      const s = h && h.closest('.sheet');
      el.textContent = s ? s.dataset.page : '';
    });
  }

  return { paginate, verify };
})();
