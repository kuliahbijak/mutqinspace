/* =================================================================
   MutqinSpace — ui.js : ikon, komponen, format, modal, toast, grafik SVG,
   ekspor (Excel via SheetJS lazy-load, PDF dari server).
   ================================================================= */
(function (g) {
  'use strict';
  const P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>', upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>', more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    check: '<path d="M20 6L9 17l-5-5"/>', checkc: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>', repeat: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>', ne: '<path d="M7 17L17 7M8 7h9v9"/>', ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>',
    wa: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/>', phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', home: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>', lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L21 2M17 6l3 3M14 9l2 2"/>', file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>', layers: '<path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/>',
    send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>', wifi: '<path d="M1 1l22 22M16.7 11.1A10.9 10.9 0 0 1 19 12.6M5 12.6a10.9 10.9 0 0 1 5.2-2.5M10.7 5.1A16 16 0 0 1 22.6 9M1.4 9a16 16 0 0 1 4.7-2.9M8.5 16.1a6 6 0 0 1 7 0M12 20h.01"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    install: '<path d="M12 3v12M7 10l5 5 5-5"/><rect x="3" y="17" width="18" height="4" rx="1"/>', move: '<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
    tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>', db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.7-4 3-9 3s-9-1.3-9-3M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
  };
  const icon = (n, cls) => '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || P.more) + '</svg>';
  const LOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.6 3.6L19 4.6l-1 4.3 3.6 2.6L19 14.1l1 4.3-4.4-1L12 21l-2.6-3.6L5 18.4l1-4.3-3.6-2.6L5 8.9l-1-4.3 4.4 1L12 2z"/></svg>';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  /* ---------------- Format ---------------- */
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
  const fmt = {
    n: (x, d) => x === null || x === undefined || x === '' || isNaN(x) ? '–' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: d === undefined ? 1 : d }).format(Number(x)),
    pct: (x) => x === null || x === undefined || x === '' ? '–' : nf.format(Number(x)) + '%',
    tgl: (s) => { if (!s) return '–'; const p = String(s).substring(0, 10).split('-'); return Number(p[2]) + ' ' + BULAN[Number(p[1]) - 1].substring(0, 3) + ' ' + p[0]; },
    tglPanjang: (s) => { if (!s) return '–'; const p = String(s).substring(0, 10).split('-'); return Number(p[2]) + ' ' + BULAN[Number(p[1]) - 1] + ' ' + p[0]; },
    bulan: (ym) => { const p = String(ym).split('-'); return BULAN[Number(p[1]) - 1] + ' ' + p[0]; },
    jam: (s) => String(s || '').substring(11, 16),
    today: () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    addDays: (s, n) => { const p = s.split('-'); const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    rel: (iso) => {
      if (!iso) return '';
      const d = new Date(String(iso).length <= 10 ? iso + 'T12:00:00' : String(iso).replace(' ', 'T'));
      const s = (Date.now() - d.getTime()) / 1000;
      if (String(iso).length <= 10) { const hari = Math.round((new Date(fmt.today() + 'T12:00:00') - d) / 864e5); return hari <= 0 ? 'Hari ini' : hari === 1 ? 'Kemarin' : hari + ' hari lalu'; }
      if (s < 60) return 'Baru saja'; if (s < 3600) return Math.floor(s / 60) + ' menit lalu'; if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
      if (s < 172800) return 'Kemarin'; return Math.floor(s / 86400) + ' hari lalu';
    }
  };

  /* ---------------- Komponen ---------------- */
  const WARNA_AV = ['#D8F43C', '#C7D2FE', '#FBCFE8', '#BAE6FD', '#FDE68A', '#BBF7D0', '#DDD6FE', '#FECACA', '#A5F3FC', '#E9D5FF'];
  function avatar(nama, foto, size) {
    const cls = 'av ' + (size || '');
    if (foto) return '<span class="' + cls + '"><img src="' + esc(foto) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.textContent=\'' + esc(inisial(nama)) + '\'"></span>';
    let hsh = 0; String(nama || '').split('').forEach(c => hsh = (hsh + c.charCodeAt(0)) % 997);
    return '<span class="' + cls + '" style="background:' + WARNA_AV[hsh % WARNA_AV.length] + '">' + esc(inisial(nama)) + '</span>';
  }
  function inisial(n) { const p = String(n || '?').replace(/^(Ust\.|Ustadz|Ustadzah|M\.|Muh\.)\s*/i, '').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function predKelas(p) { return p === 'Mumtaz' ? 'mumtaz' : p === 'Jayyid Jiddan' ? 'jj' : p === 'Maqbul' || p === 'Rasib' ? 'rendah' : ''; }
  function grade(n) { if (n === '' || n === null || n === undefined) return ''; n = Number(n); return n >= 95 ? ['A+', ''] : n >= 90 ? ['A', 'b'] : n >= 80 ? ['B', 'b'] : n >= 70 ? ['C', 'c'] : ['D', 'd']; }
  function track(pct, cls) { const p = Math.max(0, Math.min(100, Number(pct) || 0)); return '<div class="track ' + (cls || '') + '" role="progressbar" aria-valuenow="' + Math.round(p) + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + p + '%"></i></div>'; }
  function empty(msg, ico, light) { return '<div class="empty ' + (light ? 'light' : '') + '">' + icon(ico || 'book') + esc(msg) + '</div>'; }
  function sk(hgt, w) { return '<div class="sk" style="height:' + (hgt || 16) + 'px;width:' + (w || '100%') + '"></div>'; }
  function skRows(n) { return '<div class="rows">' + Array.from({ length: n || 5 }, () => '<div class="sk" style="height:72px;border-radius:18px"></div>').join('') + '</div>'; }

  /* ---------------- Toast ---------------- */
  function toast(msg, type, ms) {
    let box = $('.toasts'); if (!box) { box = h('<div class="toasts" role="status" aria-live="polite"></div>'); document.body.appendChild(box); }
    const t = h('<div class="toast ' + (type || 'ok') + '">' + icon(type === 'err' ? 'alert' : type === 'warn' ? 'alert' : 'checkc') + '<span>' + esc(msg) + '</span></div>');
    box.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, ms || 3200);
  }

  /* ---------------- Modal ---------------- */
  function modal(o) {
    const ov = h('<div class="overlay" role="dialog" aria-modal="true"><div class="modal ' + (o.wide ? 'wide' : '') + '"><div class="modal-h"><h3>' + esc(o.title || '') + '</h3><button class="ibtn" data-x aria-label="Tutup">' + icon('x') + '</button></div><div class="modal-b"></div>' + (o.actions ? '<div class="modal-f"></div>' : '') + '</div></div>');
    const body = $('.modal-b', ov);
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    const tutup = () => { ov.remove(); document.removeEventListener('keydown', onKey); if (o.onClose) o.onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') tutup(); };
    document.addEventListener('keydown', onKey);
    $('[data-x]', ov).onclick = tutup;
    ov.addEventListener('mousedown', e => { if (e.target === ov) tutup(); });
    if (o.actions) {
      const f = $('.modal-f', ov);
      o.actions.forEach(a => {
        const b = h('<button class="btn ' + (a.cls || 'btn-white') + '">' + (a.icon ? icon(a.icon) : '') + esc(a.label) + '</button>');
        b.onclick = async () => {
          if (!a.fn) return tutup();
          b.disabled = true;
          try { const r = await a.fn(body, tutup, b); if (r !== false) tutup(); } catch (e) { toast(e.message, 'err', 5000); } finally { b.disabled = false; }
        };
        f.appendChild(b);
      });
    }
    document.body.appendChild(ov);
    const first = $('input,select,textarea', body); if (first && !o.noFocus) setTimeout(() => first.focus(), 50);
    return { el: ov, body, tutup };
  }
  function konfirmasi(pesan, opsi) {
    opsi = opsi || {};
    return new Promise(res => {
      let ok = false;
      modal({ title: opsi.judul || 'Konfirmasi', body: '<p style="margin:4px 0 8px;line-height:1.6">' + esc(pesan) + '</p>', onClose: () => res(ok),
        actions: [{ label: 'Batal' }, { label: opsi.ya || 'Ya, lanjutkan', cls: opsi.bahaya ? 'btn-danger' : 'btn-lime', fn: () => { ok = true; } }] });
    });
  }
  function formData(el) {
    const o = {};
    $$('[name]', el).forEach(x => { if (x.type === 'checkbox') o[x.name] = x.checked; else if (x.type === 'radio') { if (x.checked) o[x.name] = x.value; } else o[x.name] = x.value.trim(); });
    return o;
  }

  /* ---------------- Unduhan ---------------- */
  function unduhBase64(nama, mime, b64) {
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    unduhBlob(nama, new Blob([arr], { type: mime }));
  }
  function unduhBlob(nama, blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  let sheetJs = null;
  function muatSheetJS() {
    if (g.XLSX) return Promise.resolve(g.XLSX);
    if (sheetJs) return sheetJs;
    sheetJs = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = () => res(g.XLSX); s.onerror = () => { sheetJs = null; rej(new Error('Pustaka Excel gagal dimuat (perlu internet).')); };
      document.head.appendChild(s);
    });
    return sheetJs;
  }
  /** rows: array objek, kolom: [{k,label}] → .xlsx (fallback CSV bila pustaka gagal). */
  async function eksporExcel(nama, kolom, rows, judulSheet) {
    const data = [kolom.map(c => c.label)].concat(rows.map(r => kolom.map(c => r[c.k] === undefined ? '' : r[c.k])));
    try {
      const X = await muatSheetJS();
      const ws = X.utils.aoa_to_sheet(data);
      ws['!cols'] = kolom.map(c => ({ wch: Math.min(40, Math.max(8, c.label.length + 2)) }));
      const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, (judulSheet || 'Data').substring(0, 31));
      X.writeFile(wb, nama + '.xlsx');
    } catch (e) {
      const csv = data.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
      unduhBlob(nama + '.csv', new Blob(['﻿' + csv], { type: 'text/csv' }));
      toast('Excel tidak tersedia offline — diunduh sebagai CSV.', 'warn');
    }
  }
  async function bacaFileTabel(file) {
    if (/\.csv$/i.test(file.name)) {
      const t = await file.text(); const lines = t.replace(/\r/g, '').split('\n').filter(Boolean);
      const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
      const parse = (l) => { const out = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const c = l[i]; if (c === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (c === sep && !q) { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out; };
      const head = parse(lines[0]).map(x => x.trim().replace(/^﻿/, ''));
      return lines.slice(1).map(l => { const v = parse(l), o = {}; head.forEach((k, i) => o[k] = (v[i] || '').trim()); return o; });
    }
    const X = await muatSheetJS();
    const wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: false, raw: false });
    return X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
  }

  /* ---------------- Grafik SVG (garis, batang, horizontal) ---------------- */
  function tooltip(wrap) { let t = $('.tt', wrap); if (!t) { t = h('<div class="tt"></div>'); wrap.appendChild(t); } return t; }
  function skala(max) { if (max <= 0) return { max: 1, step: 0.25 }; const mag = Math.pow(10, Math.floor(Math.log10(max))); const n = max / mag; const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10; return { max: nice * mag, step: nice * mag / 4 }; }
  /** series: [{name, color, values:[]}], labels: [] */
  function lineChart(el, labels, series, o) {
    o = o || {};
    const W = Math.max(300, Math.min(900, Math.round(el.clientWidth || 640))), H = o.h || 220, L = 38, R = 14, T = 16, B = 30, iw = W - L - R, ih = H - T - B;
    const vals = series.flatMap(s => s.values.filter(v => v !== null && v !== undefined));
    const lo = o.min !== undefined ? o.min : Math.max(0, Math.floor((Math.min.apply(null, vals.concat([100])) - 10) / 10) * 10);
    const hiRaw = o.max !== undefined ? o.max : Math.max.apply(null, vals.concat([lo + 1]));
    const hi = o.max !== undefined ? o.max : Math.ceil(hiRaw / 10) * 10;
    const x = i => L + (labels.length === 1 ? iw / 2 : i * iw / (labels.length - 1)), y = v => T + ih - (v - lo) / (hi - lo || 1) * ih;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'Grafik garis') + '"><defs><linearGradient id="ga' + (o.id || '') + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8F43C" stop-opacity=".55"/><stop offset="1" stop-color="#D8F43C" stop-opacity="0"/></linearGradient></defs>';
    for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, yy = y(v); s += '<line class="ch-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text class="ch-axis" x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + fmt.n(v, 0) + '</text>'; }
    labels.forEach((lb, i) => { s += '<text class="ch-axis" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(lb) + '</text>'; });
    const path = (vs) => { const pts = vs.map((v, i) => v === null || v === undefined ? null : [x(i), y(v)]).filter(Boolean); if (!pts.length) return ''; let d = 'M' + pts[0][0] + ',' + pts[0][1]; for (let i = 1; i < pts.length; i++) { const p0 = pts[i - 1], p1 = pts[i], cx = (p0[0] + p1[0]) / 2; d += ' C' + cx + ',' + p0[1] + ' ' + cx + ',' + p1[1] + ' ' + p1[0] + ',' + p1[1]; } return { d, pts }; };
    series.forEach((se, si) => {
      const p = path(se.values); if (!p) return;
      if (si === 0 && o.area !== false) s += '<path d="' + p.d + ' L' + p.pts[p.pts.length - 1][0] + ',' + (T + ih) + ' L' + p.pts[0][0] + ',' + (T + ih) + ' Z" fill="url(#ga' + (o.id || '') + ')"/>';
      s += '<path d="' + p.d + '" fill="none" stroke="' + se.color + '" stroke-width="2.5" stroke-linecap="round"/>';
      const last = p.pts[p.pts.length - 1];
      s += '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="5" fill="' + (si === 0 ? '#D8F43C' : '#fff') + '" stroke="' + se.color + '" stroke-width="2.5"/>';
    });
    s += '<line class="hair" x1="0" x2="0" y1="' + T + '" y2="' + (T + ih) + '" stroke="#1F2023" stroke-dasharray="3 3" opacity="0"/>';
    labels.forEach((lb, i) => { const w = iw / Math.max(1, labels.length - 1); s += '<rect data-i="' + i + '" x="' + (x(i) - w / 2) + '" y="' + T + '" width="' + w + '" height="' + ih + '" fill="transparent"/>'; });
    s += '</svg>';
    el.innerHTML = (series.length > 1 ? '<div class="ch-legend">' + series.map(se => '<span><i style="background:' + se.color + '"></i>' + esc(se.name) + '</span>').join('') + '</div>' : '') + '<div class="chart">' + s + '</div>';
    const wrap = $('.chart', el), svg = $('svg', wrap), tt = tooltip(wrap), hair = $('.hair', svg);
    $$('rect[data-i]', svg).forEach(r => {
      r.addEventListener('mouseenter', () => {
        const i = Number(r.dataset.i), bx = svg.getBoundingClientRect(), sc = bx.width / W;
        hair.setAttribute('x1', x(i)); hair.setAttribute('x2', x(i)); hair.setAttribute('opacity', '.4');
        tt.innerHTML = '<b>' + esc(labels[i]) + '</b><br>' + series.map(se => esc(se.name) + ': ' + fmt.n(se.values[i]) + (o.unit || '')).join('<br>');
        tt.style.left = (x(i) * sc) + 'px'; tt.style.top = (T * sc + 8) + 'px'; tt.classList.add('show');
      });
      r.addEventListener('mouseleave', () => { tt.classList.remove('show'); hair.setAttribute('opacity', '0'); });
    });
  }
  /** Batang vertikal bertumpuk/berkelompok: series [{name,color,values,hatch}] */
  function barChart(el, labels, series, o) {
    o = o || {};
    const W = Math.max(300, Math.min(900, Math.round(el.clientWidth || 640))), H = o.h || 220, L = 40, R = 10, T = 14, B = 30, iw = W - L - R, ih = H - T - B;
    const stack = !!o.stack;
    const totals = labels.map((_, i) => stack ? series.reduce((t, s) => t + (Number(s.values[i]) || 0), 0) : Math.max.apply(null, series.map(s => Number(s.values[i]) || 0)));
    const sk = skala(Math.max.apply(null, totals.concat([0])));
    const y = v => T + ih - v / sk.max * ih;
    const gw = iw / labels.length, bw = stack ? Math.min(46, gw * 0.5) : Math.min(28, gw * 0.7 / series.length);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'Grafik batang') + '"><defs><pattern id="hb' + (o.id || '') + '" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#D8F43C"/><rect width="4" height="8" fill="#BFDB29"/></pattern></defs>';
    for (let k = 0; k <= 4; k++) { const v = sk.max * k / 4, yy = y(v); s += '<line class="ch-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text class="ch-axis" x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + fmt.n(v, 1) + '</text>'; }
    labels.forEach((lb, i) => {
      const cx = L + gw * i + gw / 2;
      s += '<text class="ch-axis" x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(lb) + '</text>';
      let acc = 0;
      series.forEach((se, si) => {
        const v = Number(se.values[i]) || 0; if (v <= 0) return;
        const x0 = stack ? cx - bw / 2 : cx - (bw * series.length) / 2 + si * bw + 1, y1 = y(acc + (stack ? v : 0) + (stack ? 0 : v)), y0 = stack ? y(acc) : y(0);
        const top = stack ? y(acc + v) : y(v), hh = Math.max(1, (stack ? y(acc) : y(0)) - top - (stack && acc > 0 ? 2 : 0));
        const fill = se.hatch ? 'url(#hb' + (o.id || '') + ')' : se.color;
        s += '<rect x="' + x0 + '" y="' + top + '" width="' + (bw - (stack ? 0 : 2)) + '" height="' + hh + '" rx="4" fill="' + fill + '" ' + (se.hatch ? 'stroke="#7A8F00" stroke-width="1"' : '') + '/>';
        if (stack) acc += v;
        void y1; void y0;
      });
      s += '<rect data-i="' + i + '" x="' + (L + gw * i) + '" y="' + T + '" width="' + gw + '" height="' + ih + '" fill="transparent"/>';
    });
    s += '</svg>';
    el.innerHTML = (series.length > 1 ? '<div class="ch-legend">' + series.map(se => '<span><i style="background:' + (se.hatch ? '#C9E632' : se.color) + '"></i>' + esc(se.name) + '</span>').join('') + '</div>' : '') + '<div class="chart">' + s + '</div>';
    const wrap = $('.chart', el), svg = $('svg', wrap), tt = tooltip(wrap);
    $$('rect[data-i]', svg).forEach(r => {
      r.addEventListener('mouseenter', () => {
        const i = Number(r.dataset.i), sc = svg.getBoundingClientRect().width / W;
        tt.innerHTML = '<b>' + esc(labels[i]) + '</b><br>' + series.map(se => esc(se.name) + ': ' + fmt.n(se.values[i]) + (o.unit || '')).join('<br>');
        tt.style.left = ((L + gw * i + gw / 2) * sc) + 'px'; tt.style.top = (y(totals[i]) * sc) + 'px'; tt.classList.add('show');
      });
      r.addEventListener('mouseleave', () => tt.classList.remove('show'));
    });
  }
  /** Batang horizontal sederhana (perbandingan antarhalaqah). items: [{label, value, sub}] */
  function hbars(el, items, o) {
    o = o || {};
    const max = Math.max.apply(null, items.map(x => Number(x.value) || 0).concat([o.max || 0, 1]));
    el.innerHTML = items.length ? items.map(x => '<div style="margin-bottom:12px"><div class="mh"><span>' + esc(x.label) + '</span><span>' + fmt.n(x.value) + (o.unit || '') + (x.sub ? ' <small class="muted">' + esc(x.sub) + '</small>' : '') + '</span></div>' + track((Number(x.value) || 0) / max * 100) + '</div>').join('') : empty('Belum ada data.', 'chart', true);
  }

  g.UI = { icon, LOGO, esc, $, $$, h, fmt, avatar, inisial, predKelas, grade, track, empty, sk, skRows, toast, modal, konfirmasi, formData, unduhBase64, unduhBlob, eksporExcel, bacaFileTabel, muatSheetJS, lineChart, barChart, hbars, BULAN };
})(window);
