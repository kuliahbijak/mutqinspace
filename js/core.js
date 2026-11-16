/* =================================================================
   MutqinSpace — core.js
   Klien REST API ke Google Apps Script (fetch + text/plain, tanpa preflight CORS),
   sesi, cache stale-while-revalidate, penggabung batch, dedupe, outbox offline,
   router hash, pengukur performa, auto-logout saat idle.
   ================================================================= */
(function (g) {
  'use strict';
  const CFG = g.APP_CONFIG || {};
  const PFX = 'mq1:';

  /* ---------------- Penyimpanan lokal aman ---------------- */
  const LS = {
    get(k, def) { try { const v = localStorage.getItem(PFX + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) {
      try { localStorage.setItem(PFX + k, JSON.stringify(v)); return true; }
      catch (e) { LS.purge('swr:'); try { localStorage.setItem(PFX + k, JSON.stringify(v)); return true; } catch (e2) { return false; } }
    },
    del(k) { try { localStorage.removeItem(PFX + k); } catch (e) { } },
    purge(prefix) { try { Object.keys(localStorage).forEach(x => { if (x.indexOf(PFX + prefix) === 0) localStorage.removeItem(x); }); } catch (e) { } }
  };

  class ApiError extends Error { constructor(m, code, res) { super(m); this.code = code || 'ERR'; this.res = res; } }
  const configSiap = () => !!CFG.GAS_URL && !/GANTI|XXXX/.test(CFG.GAS_URL);

  /* ---------------- Sesi ---------------- */
  const Sesi = {
    token: LS.get('token', ''), me: LS.get('me', null),
    set(token, me) { Sesi.token = token; Sesi.me = me; LS.set('token', token); LS.set('me', me); },
    setToken(t) { Sesi.token = t; LS.set('token', t); },
    uid() { return Sesi.me ? (Sesi.me.email + '|' + Sesi.me.role) : 'anon'; },
    clear() { Sesi.token = ''; Sesi.me = null; LS.del('token'); LS.del('me'); LS.purge('swr:'); LS.purge('boot'); }
  };

  /* ---------------- Pengukur performa: Perf.table() di console ---------------- */
  const Perf = {
    log: [], add(a, total, server, cached) { Perf.log.push({ aksi: a, total: Math.round(total), server: server || 0, jaringan: Math.round(total - (server || 0)), cache: cached ? '✓' : '' }); if (Perf.log.length > 200) Perf.log.shift(); },
    table() { console.table(Perf.log); },
    summary() { const m = {}; Perf.log.forEach(x => { const r = m[x.aksi] = m[x.aksi] || { n: 0, total: 0, server: 0 }; r.n++; r.total += x.total; r.server += x.server; }); Object.values(m).forEach(r => { r.total = Math.round(r.total / r.n); r.server = Math.round(r.server / r.n); }); console.table(m); }
  };

  /* ---------------- Indikator muat ---------------- */
  const Load = {
    n: 0, el: null,
    start() { Load.n++; if (!Load.el) { Load.el = document.createElement('div'); Load.el.className = 'loadbar'; document.body.appendChild(Load.el); } Load.el.style.opacity = '1'; Load.el.style.width = '35%'; setTimeout(() => { if (Load.n) Load.el.style.width = '75%'; }, 300); },
    end() { Load.n = Math.max(0, Load.n - 1); if (!Load.n && Load.el) { Load.el.style.width = '100%'; setTimeout(() => { if (!Load.n) { Load.el.style.opacity = '0'; Load.el.style.width = '0'; } }, 250); } }
  };

  /* ---------------- Panggilan API ---------------- */
  const READ = /^(auth\.config|auth\.me|boot|batch|dash\.ringkas|santri\.(profil|riwayat)|setoran\.(list|saran)|presensi\.get|master\.list|hafalan\.awal$|laporan\.|rekap\.(santri|halaqah|status)|pengaturan\.get|log\.list|sys\.status|notif\.(config|queue)|wa\.(device|audience|blastList)|crm\.(list|stats|detail|export)|migrasi\.scan|arsip\.scan)/;
  let writeEpoch = 0;
  const inflight = {};

  async function kirim(action, data, opt) {
    opt = opt || {};
    if (!configSiap() && CFG.GAS_URL !== 'DEMO') throw new ApiError('Alamat backend (GAS_URL) belum diisi di js/config.js.', 'CONFIG');
    const body = { action: action, data: data || {} };
    if (Sesi.token) body.token = Sesi.token;
    if (opt.idem) body.idem = opt.idem;
    const t0 = performance.now();
    let res;
    if (!opt.silent) Load.start();
    try {
      if (CFG.GAS_URL === 'DEMO') res = await g.DemoBackend.post(body);
      else {
        const r = await fetch(CFG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', cache: 'no-store' });
        if (!r.ok) throw new ApiError('Server membalas HTTP ' + r.status + '.', 'NET');
        res = await r.json();
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(navigator.onLine === false ? 'Anda sedang offline.' : 'Tidak dapat terhubung ke server. Periksa koneksi atau URL backend.', 'NET');
    } finally { if (!opt.silent) Load.end(); }
    Perf.add(action, performance.now() - t0, res && res.ms, res && res.cached);
    if (res && res.nt) Sesi.setToken(res.nt);
    if (res && res.nq && action !== 'drain') Drain.schedule();
    if (res && !res.success && res.code === 'AUTH' && !opt.noAuth) { Sesi.clear(); if (g.App) g.App.keLogin('Sesi Anda berakhir. Silakan masuk kembali.'); }
    return res;
  }

  /** api(): dedupe baca identik yang sedang berjalan; tulis menaikkan epoch (cegah data basi). */
  function api(action, data, opt) {
    if (!READ.test(action)) { writeEpoch++; return kirim(action, data, opt); }
    const k = writeEpoch + '|' + action + '|' + JSON.stringify(data || {});
    if (inflight[k]) return inflight[k];
    const p = kirim(action, data, opt);
    inflight[k] = p;
    p.then(() => delete inflight[k], () => delete inflight[k]);
    return p;
  }
  /** Ambil data atau lempar galat ramah. */
  async function apiData(action, data, opt) {
    const r = await api(action, data, opt);
    if (!r || !r.success) throw new ApiError((r && r.message) || 'Permintaan gagal.', r && r.code, r);
    return r.data;
  }

  /* ---------------- Penggabung batch: beberapa baca dalam 1 tik → 1 eksekusi ---------------- */
  const Batcher = {
    q: null,
    add(action, data) {
      return new Promise((res, rej) => {
        if (!Batcher.q) { Batcher.q = []; setTimeout(Batcher.flush, 0); }
        Batcher.q.push({ action, data: data || {}, res, rej });
      });
    },
    async flush() {
      const q = Batcher.q; Batcher.q = null;
      if (!q || !q.length) return;
      const uniq = [], peta = {};
      q.forEach(x => { const k = x.action + '|' + JSON.stringify(x.data); if (peta[k] === undefined) { peta[k] = uniq.length; uniq.push(x); } x.i = peta[k]; });
      if (uniq.length === 1) { try { const r = await api(uniq[0].action, uniq[0].data); q.forEach(x => x.res(r)); } catch (e) { q.forEach(x => x.rej(e)); } return; }
      for (let s = 0; s < uniq.length; s += 10) {
        const part = uniq.slice(s, s + 10);
        try {
          const r = await api('batch', { calls: part.map(x => ({ action: x.action, data: x.data })) });
          q.filter(x => x.i >= s && x.i < s + 10).forEach(x => {
            if (!r.success) return x.res(r);
            x.res(Object.assign({}, r.data[x.i - s], { ms: r.ms }));
          });
        } catch (e) { q.filter(x => x.i >= s && x.i < s + 10).forEach(x => x.rej(e)); }
      }
    }
  };
  const apiQ = (action, data) => Batcher.add(action, data);

  /* ---------------- SWR: tampil dari cache lokal dulu, segarkan di belakang ---------------- */
  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }
  /**
   * swr(key, action, data, {maxAge, render(data, dariCache), force, onError})
   * render dipanggil segera bila ada cache, lalu lagi bila data server berbeda.
   */
  async function swr(key, action, data, opt) {
    opt = opt || {};
    const ck = 'swr:' + Sesi.uid() + ':' + key, c = LS.get(ck, null);
    if (c && opt.render) { try { opt.render(c.d, true); } catch (e) { console.error(e); } }
    if (c && !opt.force && Date.now() - c.t < (opt.maxAge || 30000)) return c.d;
    try {
      const r = await apiQ(action, opt.force ? Object.assign({}, data, { _fresh: true }) : data);
      if (!r || !r.success) throw new ApiError((r && r.message) || 'Gagal memuat.', r && r.code, r);
      const s = JSON.stringify(r.data), h = hash(s);
      if (!c || c.h !== h) { LS.set(ck, { t: Date.now(), h: h, d: r.data }); if (opt.render) opt.render(r.data, false); }
      else LS.set(ck, { t: Date.now(), h: h, d: c.d });
      return r.data;
    } catch (e) {
      if (opt.onError) opt.onError(e, !!c); else if (!c && g.UI) g.UI.toast(e.message, 'err');
      return c ? c.d : null;
    }
  }
  function swrHapus(prefix) { LS.purge('swr:' + Sesi.uid() + ':' + (prefix || '')); }
  function swrBaca(key) { const c = LS.get('swr:' + Sesi.uid() + ':' + key, null); return c ? c.d : null; }
  function swrTulis(key, d) { LS.set('swr:' + Sesi.uid() + ':' + key, { t: Date.now(), h: hash(JSON.stringify(d)), d: d }); }

  /* ---------------- Antrean notifikasi: drain setelah aksi tulis ---------------- */
  const Drain = {
    t: null, n: 0,
    schedule() { clearTimeout(Drain.t); Drain.t = setTimeout(Drain.run, 400); },
    async run() {
      try { const r = await kirim('drain', {}, { silent: true }); if (r && r.success && r.data && r.data.left && Drain.n++ < 3) Drain.schedule(); else Drain.n = 0; }
      catch (e) { Drain.n = 0; }
    }
  };

  /* ---------------- Outbox offline (FR-16): tulis tersimpan di perangkat lalu disinkron ---------------- */
  const Outbox = {
    list() { return LS.get('outbox:' + Sesi.uid(), []); },
    simpan(l) { LS.set('outbox:' + Sesi.uid(), l); Outbox.render(); },
    async kirim(action, data, label) {
      const idem = 'ob-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try {
        const r = await api(action, data, { idem: idem });
        return r;
      } catch (e) {
        if (e.code !== 'NET') throw e;
        const l = Outbox.list(); l.push({ id: idem, action, data, label: label || action, t: Date.now() }); Outbox.simpan(l);
        return { success: true, queued: true, message: 'Tersimpan di perangkat — akan dikirim otomatis saat koneksi pulih.' };
      }
    },
    sibuk: false,
    async flush() {
      if (Outbox.sibuk || !Sesi.token) return;
      let l = Outbox.list(); if (!l.length) return;
      Outbox.sibuk = true;
      let terkirim = 0;
      try {
        for (const it of l.slice()) {
          let r;
          try { r = await api(it.action, it.data, { idem: it.id, silent: true }); }
          catch (e) { if (e.code === 'NET') break; r = { success: false, message: e.message }; }
          l = Outbox.list().filter(x => x.id !== it.id); Outbox.simpan(l);
          if (r && r.success) terkirim++; else if (g.UI) g.UI.toast('Data offline "' + it.label + '" ditolak server: ' + (r && r.message), 'err', 7000);
        }
      } finally { Outbox.sibuk = false; }
      if (terkirim && g.UI) { g.UI.toast(terkirim + ' data offline berhasil disinkronkan.', 'ok'); swrHapus(); if (g.App) g.App.segarkanHalaman(); }
    },
    render() {
      const n = Outbox.list().length, el = document.getElementById('outbox-badge');
      if (el) { el.hidden = !n; el.textContent = n + ' menunggu sinkron'; }
    }
  };
  g.addEventListener('online', () => { Net.render(); Outbox.flush(); });
  g.addEventListener('offline', () => Net.render());
  setInterval(() => { if (navigator.onLine !== false) Outbox.flush(); }, 30000);

  const Net = {
    render() {
      let el = document.getElementById('netbar');
      if (navigator.onLine === false) {
        if (!el) { el = document.createElement('div'); el.id = 'netbar'; el.className = 'netbar'; document.body.appendChild(el); }
        el.textContent = 'Offline — data yang Anda simpan akan disinkronkan otomatis saat koneksi pulih.';
      } else if (el) el.remove();
    }
  };

  /* ---------------- Warmup server (GET no-cors, maks 1×/4 menit) ---------------- */
  function warmUp(scope) {
    if (!configSiap() || CFG.GAS_URL === 'DEMO') return;
    try {
      const k = 'mq-warm-' + scope, t = Number(sessionStorage.getItem(k) || 0);
      if (Date.now() - t < 240000) return;
      sessionStorage.setItem(k, String(Date.now()));
      fetch(CFG.GAS_URL + '?w=' + encodeURIComponent(scope), { mode: 'no-cors', cache: 'no-store' }).catch(() => { });
    } catch (e) { }
  }

  /* ---------------- Aktivitas & auto-logout (FR-03) ---------------- */
  const Aktivitas = {
    at: Date.now(),
    init() {
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => g.addEventListener(ev, () => { Aktivitas.at = Date.now(); }, { passive: true }));
      setInterval(() => {
        if (!Sesi.token || !g.App || !g.App.boot) return;
        const menit = Number((g.App.boot.setting || {}).IDLE_MENIT || 60);
        if (menit > 0 && Date.now() - Aktivitas.at > menit * 60000) g.App.logout('Anda keluar otomatis karena tidak ada aktivitas selama ' + menit + ' menit.');
      }, 30000);
    },
    idle() { return Date.now() - Aktivitas.at > 120000; }
  };

  /* ---------------- Router hash ---------------- */
  const Router = {
    routes: {},
    add(name, page) { Router.routes[name] = page; },
    parse() {
      const h = (location.hash || '#/').replace(/^#\/?/, '');
      const [path, qs] = h.split('?');
      const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
      const q = {}; (qs || '').split('&').filter(Boolean).forEach(p => { const [k, v] = p.split('='); q[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
      return { name: parts[0] || '', params: parts.slice(1), q };
    },
    go(h) { if (location.hash === h) g.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = h; }
  };

  g.Core = { CFG, LS, Sesi, api, apiData, apiQ, swr, swrHapus, swrBaca, swrTulis, Perf, Drain, Outbox, Net, Router, warmUp, Aktivitas, ApiError, configSiap };
  g.Perf = Perf;
})(window);
