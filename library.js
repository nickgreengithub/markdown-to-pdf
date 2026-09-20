/* ============================================================
   Image library — pasted / dropped / picked images live here, in
   IndexedDB, under a short name the markdown refers to: ![](chart-1).

   Cache-only, like everything else in the app: nothing leaves the
   browser. Every entry is kept in memory as an object URL so the
   renderer can resolve names synchronously.
   ============================================================ */
window.Library = (() => {
  const DB = 'markdown-studio', STORE = 'images', VERSION = 1;
  const MAX_PX = 1800;          // longest edge we keep
  const RE_ENCODE_OVER = 1.2e6; // bytes; larger files are re-encoded even if small in pixels

  let db = null;
  const items = new Map();      // name -> { name, type, w, h, size, added, url }
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => { try { fn(); } catch {} });

  const open = () => new Promise((res, rej) => {
    if (db) return res(db);
    const rq = indexedDB.open(DB, VERSION);
    rq.onupgradeneeded = () => { rq.result.createObjectStore(STORE, { keyPath: 'name' }); };
    rq.onsuccess = () => { db = rq.result; res(db); };
    rq.onerror = () => rej(rq.error);
  });
  const tx = (mode, fn) => open().then((d) => new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => res(r && r.result !== undefined ? r.result : undefined);
    t.onerror = () => rej(t.error);
  }));

  const adopt = (rec) => {
    const prev = items.get(rec.name);
    if (prev && prev.url) URL.revokeObjectURL(prev.url);
    items.set(rec.name, { name: rec.name, type: rec.type, w: rec.w, h: rec.h, size: rec.blob.size, added: rec.added, url: URL.createObjectURL(rec.blob) });
  };

  async function load() {
    const all = await tx('readonly', (s) => s.getAll());
    (all || []).forEach(adopt);
    notify();
    return list();
  }
  const list = () => [...items.values()].sort((a, b) => a.added - b.added);
  const has = (name) => items.has(name);
  const urlFor = (name) => (items.get(name) || {}).url || null;
  const get = (name) => items.get(name) || null;

  const slug = (s) => String(s || '').toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  function uniqueName(base) {
    let b = slug(base);
    if (!b || /^(image|screenshot|screen-shot|img|photo|pasted|untitled)(-\d+)?$/.test(b)) {
      let n = 1; while (items.has('image-' + n)) n++;
      return 'image-' + n;
    }
    if (!items.has(b)) return b;
    let n = 2; while (items.has(b + '-' + n)) n++;
    return b + '-' + n;
  }

  /* decode → optionally downscale → { blob, w, h } */
  const decode = (blob) => new Promise((res, rej) => {
    const url = URL.createObjectURL(blob);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('not an image')); };
    im.src = url;
  });
  async function normalise(blob) {
    if (/^image\/svg/.test(blob.type) || blob.type === 'image/gif') {
      const im = await decode(blob).catch(() => null);
      return { blob, w: im ? im.naturalWidth : 0, h: im ? im.naturalHeight : 0 };
    }
    const im = await decode(blob);
    const long = Math.max(im.naturalWidth, im.naturalHeight);
    if (long <= MAX_PX && blob.size <= RE_ENCODE_OVER) return { blob, w: im.naturalWidth, h: im.naturalHeight };
    const k = Math.min(1, MAX_PX / long);
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(im.naturalWidth * k));
    cv.height = Math.max(1, Math.round(im.naturalHeight * k));
    cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
    const keepAlpha = blob.type === 'image/png' || blob.type === 'image/webp';
    const out = await new Promise((r) => cv.toBlob(r, keepAlpha ? 'image/png' : 'image/jpeg', 0.9));
    if (!out || out.size >= blob.size) return { blob, w: im.naturalWidth, h: im.naturalHeight };
    return { blob: out, w: cv.width, h: cv.height };
  }

  /* add a File/Blob; returns the stored name */
  async function add(file, suggested) {
    if (!file || !/^image\//.test(file.type)) throw new Error('not an image');
    const name = uniqueName(suggested || file.name);
    const { blob, w, h } = await normalise(file);
    const rec = { name, type: blob.type, blob, w, h, added: Date.now() };
    await tx('readwrite', (s) => s.put(rec));
    adopt(rec);
    notify();
    return name;
  }
  /* seed: add only if the name is free (used for demo figures) */
  async function seed(name, blob) {
    if (items.has(name)) return name;
    const { w, h } = await normalise(blob).catch(() => ({ w: 0, h: 0 }));
    const rec = { name, type: blob.type, blob, w, h, added: Date.now() };
    await tx('readwrite', (s) => s.put(rec));
    adopt(rec);
    notify();
    return name;
  }
  async function rename(from, to) {
    const clean = slug(to);
    if (!clean || clean === from) return from;
    if (items.has(clean)) throw new Error('name taken');
    const rec = await tx('readonly', (s) => s.get(from));
    if (!rec) throw new Error('missing');
    rec.name = clean;
    await tx('readwrite', (s) => { s.delete(from); s.put(rec); });
    const old = items.get(from); if (old && old.url) URL.revokeObjectURL(old.url);
    items.delete(from);
    adopt(rec);
    notify();
    return clean;
  }
  async function remove(name) {
    await tx('readwrite', (s) => s.delete(name));
    const old = items.get(name); if (old && old.url) URL.revokeObjectURL(old.url);
    items.delete(name);
    notify();
  }
  const blobOf = (name) => tx('readonly', (s) => s.get(name)).then((r) => (r ? r.blob : null));
  const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  /* data: URL → Blob (used when migrating an old document) */
  function dataURLToBlob(url) {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(url);
    if (!m) return null;
    const type = m[1] || 'application/octet-stream';
    const raw = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return new Blob([bytes], { type });
  }

  return { load, list, has, get, urlFor, add, seed, rename, remove, blobOf, subscribe, uniqueName, dataURLToBlob };
})();
