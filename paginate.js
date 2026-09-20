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
     ctx.pageNumbers 'none' | 'bottom'
     ctx.token     () => boolean — false means a newer request superseded this one

   Rules:
   - a block that does not fit moves whole to the next page
   - tables split at rows (header repeated), lists at items, code at lines,
     blockquotes and footnotes at their children — only when at least two
     pieces stay behind
   - a heading is never left alone at the bottom of a page
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
  function split(el, avail) {
    const tag = el.tagName;
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
    if (ctx.pageNumbers && ctx.pageNumbers !== 'none') {
      const pn = document.createElement('div');
      pn.className = 'pnum';
      pn.textContent = String(n);
      sheet.appendChild(pn);
    }
    return sheet;
  }

  async function paginate(html, ctx) {
    const measure = ctx.measure;
    measure.innerHTML = '<div class="m0"></div>' + html; // m0 keeps real blocks off :first-child
    await imagesReady(measure);
    if (ctx.token && !ctx.token()) return null;

    const C = ctx.pageH - 2 * ctx.padY;     // usable height per page
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
        const pull = last && HEADINGS.has(last.tagName) && count > 1 ? last : null;
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

  /* After the sheets are in the live DOM, catch anything the measurement
     missed (font swaps, sub-pixel rounding): push the last block of an
     overflowing page onto the next one. */
  function verify(container, ctx) {
    const sheets = [...container.querySelectorAll(':scope > .sheet')];
    let moved = 0;
    for (let i = 0; i < sheets.length && moved < 200; i++) {
      const doc = sheets[i].querySelector(':scope > .doc');
      let guard = 0;
      while (doc.scrollHeight > doc.clientHeight + 1 && doc.children.length > 1 && guard++ < 50) {
        const last = doc.lastElementChild;
        if (last.classList.contains('pagebreak')) break;
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
    // renumber
    [...container.querySelectorAll(':scope > .sheet')].forEach((s, i) => {
      s.dataset.page = String(i + 1);
      const l = s.querySelector(':scope > .sheet-label'); if (l) l.textContent = 'Page ' + (i + 1);
      const p = s.querySelector(':scope > .pnum'); if (p) p.textContent = String(i + 1);
    });
    return moved;
  }

  return { paginate, verify };
})();
