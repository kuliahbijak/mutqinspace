/* =================================================================
   MutqinSpace — MODE DEMO: tiruan layanan Google Apps Script di browser.
   Backend asli (berkas .gs) dijalankan apa adanya di dalam pabrik fungsi;
   setiap permintaan = "eksekusi" baru (variabel global direset seperti GAS).
   Data disimpan di localStorage perangkat ini saja. TIDAK untuk produksi.
   ================================================================= */
(function (g) {
  'use strict';
  /* ---------- SHA-256 & HMAC sinkron (untuk token sesi & hash PIN) ---------- */
  const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  function sha256(bytes) {
    const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
    m.set(bytes); m[l] = 0x80; const bits = l * 8; m[n - 4] = bits >>> 24; m[n - 3] = (bits >>> 16) & 255; m[n - 2] = (bits >>> 8) & 255; m[n - 1] = bits & 255;
    m[n - 5] = Math.floor(bits / 4294967296) & 255;
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]), w = new Uint32Array(64);
    for (let i = 0; i < n; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = (m[i + t * 4] << 24) | (m[i + t * 4 + 1] << 16) | (m[i + t * 4 + 2] << 8) | m[i + t * 4 + 3];
      for (let t = 16; t < 64; t++) { const a = w[t - 15], b = w[t - 2]; w[t] = (((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3)) + w[t - 7] + (((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10)) + w[t - 16]; }
      let [a, b, c, d, e, f, gg, h] = H;
      for (let t = 0; t < 64; t++) {
        const t1 = (h + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & gg)) + K[t] + w[t]) >>> 0;
        const t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = gg; gg = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += gg; H[7] += h;
    }
    const out = new Uint8Array(32); for (let i = 0; i < 8; i++) { out[i * 4] = H[i] >>> 24; out[i * 4 + 1] = (H[i] >>> 16) & 255; out[i * 4 + 2] = (H[i] >>> 8) & 255; out[i * 4 + 3] = H[i] & 255; }
    return out;
  }
  const enc = new TextEncoder(), dec = new TextDecoder();
  const toBytes = (x) => typeof x === 'string' ? enc.encode(x) : Uint8Array.from(x, v => v & 255);
  const signed = (u) => Array.from(u, v => (v > 127 ? v - 256 : v));
  function hmac(key, msg) {
    let k = toBytes(key); if (k.length > 64) k = sha256(k);
    const ip = new Uint8Array(64 + msg.length), op = new Uint8Array(96);
    for (let i = 0; i < 64; i++) { const kb = k[i] || 0; ip[i] = kb ^ 0x36; op[i] = kb ^ 0x5c; }
    ip.set(msg, 64); op.set(sha256(ip), 64); return sha256(op);
  }
  const b64 = (u) => { let s = ''; u.forEach(c => s += String.fromCharCode(c)); return btoa(s); };
  const unb64 = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const uuid = () => (g.crypto && g.crypto.randomUUID ? g.crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

  /* ---------- Dunia data (persisten di localStorage) ---------- */
  const KEY = 'mq-demo-world-v1';
  let W = null;
  function baruW() { return { props: {}, ss: {}, folders: {}, files: {}, triggers: [], seq: 1, mails: 0 }; }
  function simpanW() { try { localStorage.setItem(KEY, JSON.stringify(W, (k, v) => (v instanceof Date ? { __d: v.getTime() } : v))); } catch (e) { } }
  function muatW() { try { const t = localStorage.getItem(KEY); if (t) return JSON.parse(t, (k, v) => (v && v.__d !== undefined ? new Date(v.__d) : v)); } catch (e) { } return null; }
  const nid = (p) => p + '_' + (W.seq++).toString(36) + 'demoxxxxxxxxxxxxxxxx';

  function konversi(v, teks) {
    if (typeof v === 'string') {
      if (v.charAt(0) === "'") return v.substring(1);
      if (teks) return v;
      if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
      const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
      return v;
    }
    return v === null || v === undefined ? '' : v;
  }
  function Sheet(ssId, name) {
    const d = () => W.ss[ssId].sheets[name];
    const self = {
      getName: () => name,
      getLastRow() { const a = d().data; for (let r = a.length - 1; r >= 0; r--) if (a[r] && a[r].some(x => x !== '' && x != null)) return r + 1; return 0; },
      getLastColumn() { let c = 0; d().data.forEach(row => { if (!row) return; for (let i = row.length - 1; i >= 0; i--) if (row[i] !== '' && row[i] != null) { c = Math.max(c, i + 1); break; } }); return c; },
      getMaxRows: () => Math.max(1000, d().data.length), getMaxColumns: () => 26,
      setFrozenRows() { return self; }, deleteRow(r) { d().data.splice(r - 1, 1); }, clearContents() { d().data = []; return self; },
      getDataRange() { return self.getRange(1, 1, Math.max(1, self.getLastRow()), Math.max(1, self.getLastColumn())); },
      getRange(r, c, nr, nc) {
        nr = nr || 1; nc = nc || 1;
        const rg = {
          getValues() { const a = d().data, out = []; for (let i = 0; i < nr; i++) { const row = a[r - 1 + i] || [], o = []; for (let j = 0; j < nc; j++) { const v = row[c - 1 + j]; o.push(v === undefined || v === null ? '' : (v instanceof Date ? new Date(v.getTime()) : v)); } out.push(o); } return out; },
          setValues(v) { const a = d().data, f = d().fmt; for (let i = 0; i < nr; i++) { const ri = r - 1 + i; a[ri] = a[ri] || []; for (let j = 0; j < nc; j++) a[ri][c - 1 + j] = konversi(v[i][j], f[c + j] === '@'); } return rg; },
          setValue(v) { return rg.setValues([[v]]); },
          clearContent() { const a = d().data; for (let i = 0; i < nr; i++) { const row = a[r - 1 + i]; if (row) for (let j = 0; j < nc; j++) row[c - 1 + j] = ''; } return rg; },
          setNumberFormat(fm) { for (let j = 0; j < nc; j++) d().fmt[c + j] = fm; return rg; },
          setFontWeight() { return rg; }, setBackground() { return rg; }, setFontColor() { return rg; }
        };
        return rg;
      }
    };
    return self;
  }
  function SS(id) {
    const s = W.ss[id];
    return { getId: () => id, getName: () => s.name, getUrl: () => '#demo-spreadsheet',
      getSheetByName: (n) => (s.sheets[n] ? Sheet(id, n) : null), getSheets: () => s.order.map(n => Sheet(id, n)),
      insertSheet: (n) => { s.sheets[n] = { data: [], fmt: {} }; s.order.push(n); return Sheet(id, n); },
      deleteSheet: (sh) => { delete s.sheets[sh.getName()]; s.order = s.order.filter(x => x !== sh.getName()); } };
  }
  const iter = (a) => { let i = 0; return { hasNext: () => i < a.length, next: () => a[i++] }; };
  function File(id) { const f = W.files[id]; return { getId: () => id, getName: () => f.name, getUrl: () => '#demo-file', setTrashed(t) { f.trashed = t; return this; }, getDateCreated: () => new Date(f.t), moveTo(fo) { f.parent = fo.getId(); return this; }, makeCopy(n, fo) { const x = nid('file'); W.files[x] = { name: n, parent: fo ? fo.getId() : '', t: Date.now() }; return File(x); }, getBlob: () => null }; }
  function Folder(id) {
    const fo = W.folders[id];
    return { getId: () => id, getName: () => fo.name, getUrl: () => '#demo-folder',
      createFolder: (n) => { const x = nid('fld'); W.folders[x] = { name: n, parent: id }; return Folder(x); },
      getFoldersByName: (n) => iter(Object.keys(W.folders).filter(k => W.folders[k].parent === id && W.folders[k].name === n).map(Folder)),
      createFile: (blob) => { const x = nid('file'); W.files[x] = { name: blob.getName(), parent: id, t: Date.now(), size: blob._s.length }; return File(x); },
      getFilesByName: (n) => iter(Object.keys(W.files).filter(k => W.files[k].parent === id && W.files[k].name === n && !W.files[k].trashed).map(File)),
      getFiles: () => iter(Object.keys(W.files).filter(k => W.files[k].parent === id && !W.files[k].trashed).map(File)) };
  }
  function Blob(data, mime, name) {
    const s = typeof data === 'string' ? data : dec.decode(toBytes(data));
    const b = { _s: s, _m: mime, _n: name || 'blob', getDataAsString: () => s, getBytes: () => signed(enc.encode(s)), getName: () => b._n, setName(n) { b._n = n; return b; }, getContentType: () => b._m, getAs(m) { return Blob(s, m, b._n.replace(/\.html?$/, '.pdf')); } };
    return b;
  }
  const pad = (n) => String(n).padStart(2, '0');
  function formatDate(d, tz, f) {
    // Mode demo memakai zona waktu perangkat
    const t = { yyyy: d.getFullYear(), MM: pad(d.getMonth() + 1), dd: pad(d.getDate()), HH: pad(d.getHours()), mm: pad(d.getMinutes()), ss: pad(d.getSeconds()) };
    let out = '', i = 0;
    while (i < f.length) { if (f[i] === "'") { const j = f.indexOf("'", i + 1); out += f.substring(i + 1, j); i = j + 1; continue; } const k = ['yyyy', 'MM', 'dd', 'HH', 'mm', 'ss'].find(x => f.startsWith(x, i)); if (k) { out += t[k]; i += k.length; } else { out += f[i]; i++; } }
    return out;
  }
  const CACHE = new Map();
  let lockHeld = false;
  function layanan() {
    return {
      Logger: { log: (m) => console.log('[GAS]', m) }, console: console,
      Session: { getScriptTimeZone: () => 'Asia/Jakarta', getEffectiveUser: () => ({ getEmail: () => 'mudir@demo.mutqin' }) },
      PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (W.props[k] === undefined ? null : W.props[k]), setProperty: (k, v) => { W.props[k] = String(v); }, setProperties: (o) => Object.keys(o).forEach(k => W.props[k] = String(o[k])), getProperties: () => Object.assign({}, W.props), deleteProperty: (k) => { delete W.props[k]; } }) },
      CacheService: { getScriptCache: () => ({ get: (k) => (CACHE.has(k) ? CACHE.get(k) : null), put: (k, v) => { if (String(v).length > 102400) throw new Error('Argument too large'); CACHE.set(k, String(v)); }, getAll: (ks) => { const o = {}; ks.forEach(k => { if (CACHE.has(k)) o[k] = CACHE.get(k); }); return o; }, putAll: (o) => Object.keys(o).forEach(k => CACHE.set(k, String(o[k]))), remove: (k) => CACHE.delete(k) }) },
      LockService: { getScriptLock: () => { let held = false; return { tryLock: () => { if (lockHeld) return false; lockHeld = held = true; return true; }, waitLock() { }, releaseLock: () => { if (held) { held = false; lockHeld = false; } } }; } },
      SpreadsheetApp: { openById: (id) => { if (!W.ss[id]) throw new Error('Spreadsheet tidak ada'); return SS(id); }, create: (n) => { const id = nid('ss'); W.ss[id] = { name: n, sheets: { Sheet1: { data: [], fmt: {} } }, order: ['Sheet1'] }; W.files[id] = { name: n, parent: '', t: Date.now() }; return SS(id); }, flush: () => { } },
      DriveApp: { createFolder: (n) => { const x = nid('fld'); W.folders[x] = { name: n, parent: '' }; return Folder(x); }, getFolderById: (id) => { if (!W.folders[id]) throw new Error('Folder tidak ada'); return Folder(id); }, getFileById: (id) => { if (!W.files[id]) throw new Error('File tidak ada'); return File(id); } },
      Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
        computeDigest: (a, v) => signed(sha256(toBytes(v))), computeHmacSha256Signature: (v, k) => signed(hmac(k, toBytes(v))),
        base64Encode: (v) => b64(toBytes(v)), base64EncodeWebSafe: (v) => b64(toBytes(v)).replace(/\+/g, '-').replace(/\//g, '_'),
        base64DecodeWebSafe: (s) => signed(unb64(String(s).replace(/-/g, '+').replace(/_/g, '/'))), getUuid: uuid, formatDate, sleep: () => { }, newBlob: Blob },
      ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => { const o = { getContent: () => s, setMimeType: () => o }; return o; } },
      MailApp: { sendEmail: () => { W.mails++; }, getRemainingDailyQuota: () => 100 },
      UrlFetchApp: {
        fetch: (url, o) => palsu(url, o || {}), fetchAll: (rs) => rs.map(r => palsu(r.url, r))
      },
      ScriptApp: { getProjectTriggers: () => W.triggers.map(fn => ({ getHandlerFunction: () => fn })), newTrigger: (fn) => { const b = { timeBased: () => b, everyMinutes: () => b, onMonthDay: () => b, onWeekDay: () => b, atHour: () => b, after: () => b, create: () => { W.triggers.push(fn); } }; return b; }, deleteTrigger: () => { }, WeekDay: { SUNDAY: 1, SATURDAY: 7 } }
    };
  }
  function palsu(url, o) {
    const res = (b) => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify(b) });
    if (/fonnte/.test(url)) {
      if (/\/device/.test(url)) return res({ device: '628xxxxxxxx (demo)', device_status: 'connect', package: 'Demo', quota: '∞', expired: '-' });
      if (/\/validate/.test(url)) { const t = String((o.payload || {}).target || '').split(','); return res({ status: true, registered: t.filter((x, i) => i % 5 !== 4), not_registered: t.filter((x, i) => i % 5 === 4) }); }
      return res({ status: true, id: ['demo'], detail: 'terkirim (simulasi demo)' });
    }
    return { getResponseCode: () => 400, getContentText: () => '{"error":"demo"}' };
  }

  /* ---------- Pabrik backend (diisi oleh tools/build-demo.js) ---------- */
  const NAMA_LAYANAN = ['Logger', 'console', 'Session', 'PropertiesService', 'CacheService', 'LockService', 'SpreadsheetApp', 'DriveApp', 'Utilities', 'ContentService', 'MailApp', 'UrlFetchApp', 'ScriptApp'];
  let pabrik = null;
  function eksekusi() {
    if (!pabrik) pabrik = g.__mqBackend;   // fungsi statis hasil build (tanpa eval)
    const L = layanan();
    return pabrik.apply(null, NAMA_LAYANAN.map(n => L[n]));
  }
  let tSimpan = null;
  function nanti() { clearTimeout(tSimpan); tSimpan = setTimeout(simpanW, 400); }

  function siapkan() {
    W = muatW();
    if (W && W.props && W.props.SPREADSHEET_ID) return;
    W = baruW();
    let B = eksekusi(); B.setupAppEnvironment();
    B = eksekusi(); B.setProps_({ EMERGENCY_USER: 'darurat', EMERGENCY_SALT: 'demo', EMERGENCY_PASS_HASH: B.hashPass_('demo12345678', 'demo'), FONNTE_TOKEN: 'token-demo' });
    B = eksekusi(); B.isiDataContoh();
    B = eksekusi(); B.withLock_(() => B.simpanSetting_({ NAMA_LEMBAGA: 'Pesantren Tahfidz (Mode Demo)', NOTIF_WA_AKTIF: 'YA', NOTIF_EMAIL_AKTIF: 'YA', JAM_SENYAP: '', APP_URL: location.href.split('#')[0] }));
    simpanW();
  }

  g.DemoBackend = {
    async post(body) {
      if (!W) siapkan();
      await new Promise(r => setTimeout(r, 60 + Math.random() * 90));         // latensi jaringan tiruan
      const out = JSON.parse(eksekusi().doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
      if (out && out.data && out.data.base64 && /\.pdf$/.test(out.data.nama || '')) {   // demo: PDF → pratinjau HTML siap cetak
        out.data.mime = 'text/html'; out.data.nama = out.data.nama.replace(/\.pdf$/, '.html');
        const html = dec.decode(unb64(out.data.base64));
        out.data.base64 = b64(enc.encode(html.replace('</body>', '<script>setTimeout(function(){window.print()},400)<\/script></body>')));
      }
      if (body.action && !/^(boot|batch|auth\.(config|me)|dash|setoran\.(list|saran)|santri|laporan|presensi\.get|master\.list)/.test(body.action)) { try { eksekusi().tickMenit(); } catch (e) { } nanti(); }
      else nanti();
      return out;
    },
    async masukSebagai(peran) {
      if (!W) siapkan();
      const B = eksekusi(), I = B.idx_();
      let me;
      if (peran === 'mudir') me = { email: 'mudir@demo.mutqin', role: 'mudir', nama: 'Mudir (Demo)', id: (B.stafByEmail_('mudir@demo.mutqin') || {}).ID_Muhaffidz || '' };
      else if (peran === 'muhaffidz') { const u = B.stafByEmail_('salman@contoh.mutqin'); me = { email: u.Email_Google, role: 'muhaffidz', nama: u.Nama, id: u.ID_Muhaffidz }; }
      else { const s = I.nis['2024091']; const w = (I.waliBySantri[s.ID_Santri] || [])[0]; me = { email: 'nis:' + s.NIS, role: 'wali', nama: w ? w.Nama : 'Wali', sid: s.ID_Santri }; }
      return { token: B.buatSesi_(me), me };
    },
    reset() { localStorage.removeItem(KEY); CACHE.clear(); W = null; }
  };
})(window);

/* ===== Backend MutqinSpace (sama persis dengan berkas .gs) ===== */
window.__mqBackend = function (Logger, console, Session, PropertiesService, CacheService, LockService, SpreadsheetApp, DriveApp, Utilities, ContentService, MailApp, UrlFetchApp, ScriptApp) {
/* ===== Kode.gs ===== */
/**
 * ================================================================
 *  MutqinSpace — Sistem Informasi Manajemen Tahfidz & Mutaba'ah Halaqah
 *  Backend: Google Apps Script sebagai REST API JSON murni
 *  (tanpa HtmlService, tanpa iframe, tanpa google.script.run)
 *
 *  File: Kode.gs — INTI
 *    • Konfigurasi & skema database (Google Sheets)
 *    • Router doGet / doPost + RBAC + kunci tulis (LockService)
 *    • Lapisan database batch (getValues / setValues, tanpa baca per-sel)
 *    • Cache berversi + CacheX (nilai besar dipecah) + memo per eksekusi
 *    • Setup otomatis, trigger, warmup
 *
 *  ATURAN RAHASIA: semua token, secret, hash, ID spreadsheet & folder
 *  disimpan di Script Properties (lihat Auth.gs → prop_()).
 *  Tidak ada satu pun nilai rahasia di file ini, di Sheets, atau di frontend.
 * ================================================================
 */

const APP_NAME = 'MutqinSpace';
const APP_VERSION = '1.0.0';
const SCHEMA_VERSION = 1;

/* ----------------------------------------------------------------
 * SKEMA DATABASE
 * cache:true  → tabel kecil/sedang, disimpan utuh di CacheService
 * big:true    → tabel log besar, dibaca per rentang (tanggal/ekor)
 * angka       → kolom bertipe angka; kolom lain diformat teks (@)
 * ---------------------------------------------------------------- */
const SCHEMA = {
  Santri: { prefix: 'SNT', pad: 4, key: 'ID_Santri', cache: true,
    cols: ['ID_Santri', 'NIS', 'Nama', 'Jenis_Kelamin', 'Tanggal_Masuk', 'ID_Halaqah', 'PIN_Hash', 'Foto_URL', 'Status', 'Catatan', 'Dibuat_Pada', 'Diubah_Pada'] },
  Wali: { prefix: 'WLI', pad: 4, key: 'ID_Wali', cache: true,
    cols: ['ID_Wali', 'Nama', 'No_WA', 'Email', 'ID_Santri', 'Hubungan', 'StatusWA', 'CekWAAt', 'Dibuat_Pada', 'Diubah_Pada'] },
  Muhaffidz: { prefix: 'MHF', pad: 3, key: 'ID_Muhaffidz', cache: true,
    cols: ['ID_Muhaffidz', 'Nama', 'Email_Google', 'No_WA', 'Peran', 'Status', 'Foto_URL', 'StatusWA', 'CekWAAt', 'Dibuat_Pada', 'Diubah_Pada'] },
  Halaqah: { prefix: 'HLQ', pad: 3, key: 'ID_Halaqah', cache: true,
    cols: ['ID_Halaqah', 'Nama_Halaqah', 'ID_Muhaffidz', 'Jadwal', 'Tingkat', 'Status', 'Dibuat_Pada', 'Diubah_Pada'] },
  Setoran: { prefix: 'SET', pad: 6, key: 'ID_Setoran', big: true,
    cols: ['ID_Setoran', 'Tanggal', 'ID_Santri', 'ID_Halaqah', 'Jenis', 'Juz', 'Surah', 'Nama_Surah', 'Ayat_Dari', 'Ayat_Sampai', 'Jumlah_Baris_Halaman', 'Nilai_Tajwid', 'Nilai_Kelancaran', 'Catatan', 'ID_Muhaffidz', 'Dibuat_Pada', 'Diubah_Pada', 'Client_ID'],
    angka: ['Juz', 'Surah', 'Ayat_Dari', 'Ayat_Sampai', 'Jumlah_Baris_Halaman', 'Nilai_Tajwid', 'Nilai_Kelancaran'] },
  Presensi: { prefix: 'PRS', pad: 6, key: 'ID_Presensi', big: true,
    cols: ['ID_Presensi', 'Tanggal', 'ID_Santri', 'ID_Halaqah', 'Status', 'Keterangan', 'ID_Muhaffidz', 'Diubah_Pada'] },
  Target: { prefix: 'TGT', pad: 4, key: 'ID_Target', cache: true,
    cols: ['ID_Target', 'Level_atau_ID_Santri', 'Periode', 'Target_Juz_atau_Surah', 'Target_Murojaah', 'Keterangan', 'Dibuat_Pada', 'Diubah_Pada'] },
  HafalanAwal: { key: 'ID_Santri', cache: true,
    cols: ['ID_Santri', 'Ziyadah', 'Mutqin', 'Ringkasan', 'Total_Setoran', 'Sumber', 'Catatan', 'Diubah_Pada'], angka: ['Total_Setoran'] },
  RiwayatHalaqah: { prefix: 'RWY', pad: 5, key: 'ID_Riwayat', cache: true,
    cols: ['ID_Riwayat', 'Tanggal', 'ID_Santri', 'Dari_Halaqah', 'Ke_Halaqah', 'Alasan', 'Oleh'] },
  LogNotif: { prefix: 'NTF', pad: 6, key: 'ID_Log', big: true,
    cols: ['ID_Log', 'Waktu', 'Kanal', 'Tujuan', 'Nama_Penerima', 'Subjek', 'Pesan', 'Event', 'ID_Wali', 'ID_Setoran', 'ID_Blast', 'Status', 'Percobaan', 'Pesan_Error', 'Dikirim_Pada'],
    angka: ['Percobaan'] },
  BlastWA: { prefix: 'BLS', pad: 4, key: 'ID_Blast', cache: true,
    cols: ['ID_Blast', 'Judul', 'Pesan', 'Sasaran', 'Total', 'Terkirim', 'Gagal', 'Ukuran_Batch', 'Jeda_Detik', 'Status', 'Dibuat_Oleh', 'Tanggal', 'Selesai_Pada'],
    angka: ['Total', 'Terkirim', 'Gagal', 'Ukuran_Batch'] },
  CRM_Kontak: { prefix: 'KTK', pad: 5, key: 'ID_Kontak', cache: true,
    cols: ['ID_Kontak', 'Nama', 'Email', 'No_WA', 'Segmen', 'Sumber', 'Ref_ID', 'Tag', 'StatusWA', 'CekWAAt', 'Email_Valid', 'Opt_Out', 'Catatan', 'Jumlah_Pesan', 'Terakhir_Dihubungi', 'Info', 'Dibuat_Pada', 'Diubah_Pada'],
    angka: ['Jumlah_Pesan'] },
  CRM_Interaksi: { prefix: 'INT', pad: 6, key: 'ID_Interaksi', big: true,
    cols: ['ID_Interaksi', 'ID_Kontak', 'Kanal', 'Arah', 'Ringkasan', 'Ref_ID', 'Oleh', 'Tanggal'] },
  Pengaturan: { key: 'Kunci', cache: true, cols: ['Kunci', 'Nilai', 'Keterangan'] },
  LogAktivitas: { prefix: 'LOG', pad: 6, key: 'ID_Log', big: true,
    cols: ['ID_Log', 'Waktu', 'Pengguna', 'Peran', 'Aksi', 'Entitas', 'Detail'] },
  AppConfig: { key: 'Kunci', cols: ['Kunci', 'Nilai', 'Keterangan'] }
};

const KOLOM_HP = { No_WA: 1 };
const PERAN = { MUDIR: 'mudir', GURU: 'muhaffidz', WALI: 'wali', SANTRI: 'santri' };
const STAF = [PERAN.MUDIR, PERAN.GURU];
const SEMUA = [PERAN.MUDIR, PERAN.GURU, PERAN.WALI, PERAN.SANTRI];

/* ----------------------------------------------------------------
 * PENGATURAN BAWAAN (Kelas C — boleh diubah Mudir dari dashboard)
 * ---------------------------------------------------------------- */
const SETTING_DEFAULT = [
  ['NAMA_LEMBAGA', 'Lembaga Tahfidz Al-Qur\'an', 'Nama lembaga di aplikasi, rekap PDF, dan notifikasi'],
  ['LABEL_PERIODE', 'Semester Ganjil 2026/2027', 'Label periode aktif di pojok kanan atas'],
  ['TAHUN_AJARAN', '2026/2027', 'Tahun ajaran aktif'],
  ['SEMESTER_MULAI', '2026-07-01', 'Tanggal mulai semester (yyyy-MM-dd) — dipakai target periode SEMESTER'],
  ['SEMESTER_SELESAI', '2026-12-31', 'Tanggal akhir semester (yyyy-MM-dd)'],
  ['TINGKAT_LIST', 'Pemula,Menengah,Mutqin', 'Daftar tingkat halaqah dipisah koma'],
  ['SKALA_NILAI', '[{"min":90,"label":"Mumtaz"},{"min":80,"label":"Jayyid Jiddan"},{"min":70,"label":"Jayyid"},{"min":60,"label":"Maqbul"},{"min":0,"label":"Rasib"}]', 'Skala nilai 0–100 → predikat (JSON)'],
  ['MUTQIN_MIN', '85', 'Nilai kelancaran murojaah minimal agar ayat dihitung mutqin'],
  ['EDIT_JAM', '24', 'Batas jam muhaffidz boleh mengoreksi setoran (Mudir tanpa batas)'],
  ['MIN_HARI_TANPA_SETORAN', '3', 'Santri ditandai perlu perhatian bila tidak setor selama N hari'],
  ['IDLE_MENIT', '60', 'Keluar otomatis bila tidak ada aktivitas (menit)'],
  ['SESI_JAM', '12', 'Masa berlaku token sesi (jam)'],
  ['PORTAL_SANTRI_AKTIF', 'TIDAK', 'YA/TIDAK — izinkan santri dewasa login dengan NIS + PIN'],
  ['TAMPILKAN_WA_GURU', 'YA', 'YA/TIDAK — tampilkan tombol hubungi muhaffidz di portal wali'],
  ['JAM_SENYAP', '21:00-05:00', 'Notifikasi otomatis ditahan pada rentang jam ini (kosongkan untuk mematikan)'],
  ['NOTIF_WA_AKTIF', 'TIDAK', 'YA/TIDAK — saklar utama WhatsApp (Fonnte)'],
  ['NOTIF_EMAIL_AKTIF', 'TIDAK', 'YA/TIDAK — saklar utama Email'],
  ['NOTIF_MATRIKS', '', 'JSON matriks event × kanal (diatur dari menu Notifikasi)'],
  ['WA_BATCH_DEFAULT', '20', 'Ukuran batch blast (10/20/50)'],
  ['WA_JEDA_DETIK', '5', 'Jeda antarpesan WhatsApp, boleh acak "3-8"'],
  ['WA_DETEKSI_OTOMATIS', 'YA', 'Cek otomatis apakah nomor kontak baru terdaftar WhatsApp'],
  ['EMAIL_NAMA_PENGIRIM', 'MutqinSpace', 'Nama pengirim email'],
  ['APP_URL', '', 'URL aplikasi untuk {link} — terisi otomatis saat Mudir login'],
  ['CRM_SYNC_MENIT', '30', 'Interval sinkron otomatis CRM (menit)'],
  ['BACKUP_SIMPAN', '8', 'Jumlah salinan backup mingguan yang disimpan'],
  ['REKAP_OTOMATIS', 'YA', 'YA/TIDAK — buat rekap PDF bulanan otomatis tiap tanggal 1']
];
const SETTING_PUBLIK = ['NAMA_LEMBAGA', 'LABEL_PERIODE', 'TAHUN_AJARAN', 'SEMESTER_MULAI', 'SEMESTER_SELESAI', 'TINGKAT_LIST', 'SKALA_NILAI',
  'MUTQIN_MIN', 'EDIT_JAM', 'MIN_HARI_TANPA_SETORAN', 'IDLE_MENIT', 'PORTAL_SANTRI_AKTIF', 'TAMPILKAN_WA_GURU'];

/* ================================================================
 *  ENTRY POINTS
 * ================================================================ */
let _IN_WEB = false;

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.w) return json_({ success: true, warm: warmCaches_(String(p.w).substring(0, 10)) });
    return json_({ success: true, app: APP_NAME, v: APP_VERSION, message: 'MutqinSpace API aktif. Gunakan POST dengan body JSON {action, token, data}.' });
  } catch (err) {
    return json_({ success: false, message: pesanError_(err) });
  }
}

function doPost(e) {
  const t0 = Date.now();
  _IN_WEB = true;
  let res, action = '';
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    action = String(body.action || '');
    res = dispatch_(action, body.token, body.data || {}, body);
  } catch (err) {
    res = fail_(pesanError_(err), { code: err && err.code });
  }
  try { flushAudit_(); } catch (e2) { console.error('audit: ' + e2.message); }
  res = res || fail_('Tidak ada respons.');
  res.ms = Date.now() - t0;
  res.v = APP_VERSION;
  const nq = Number(prop_('ANTRIAN_ADA') === '1');
  if (nq) res.nq = 1;
  if (res.ms > 4500) console.warn('LAMBAT ' + action + ' ' + res.ms + ' ms');
  return json_(res);
}

/* ================================================================
 *  ROUTER + RBAC
 *  roles  : peran yang boleh memanggil (dicek di server)
 *  write  : aksi tulis → dijalankan di bawah LockService
 *  audit  : dicatat ke LogAktivitas (payload sudah diredaksi)
 * ================================================================ */
let _ROUTES = null;
function routes_() {
  if (_ROUTES) return _ROUTES;
  const M = [PERAN.MUDIR], S = STAF, A = SEMUA;
  _ROUTES = {
    // --- Autentikasi (publik)
    'auth.config': { pub: true, fn: apiAuthConfig_ },
    'auth.google': { pub: true, fn: apiAuthGoogle_ },
    'auth.pin': { pub: true, fn: apiAuthPin_ },
    'auth.darurat': { pub: true, fn: apiAuthDarurat_ },
    'auth.me': { roles: A, fn: apiAuthMe_ },
    'auth.logout': { roles: A, fn: apiAuthLogout_ },
    'auth.gantiPin': { roles: [PERAN.WALI, PERAN.SANTRI], fn: apiGantiPin_, write: true, audit: true },
    'auth.rotasiDarurat': { roles: M, fn: apiRotasiDarurat_, write: true },
    'auth.keluarSemua': { roles: M, fn: apiKeluarSemua_, write: true, audit: true },
    'boot': { roles: A, fn: apiBoot_ },
    'batch': { roles: A, fn: apiBatch_ },
    'drain': { roles: A, fn: apiDrain_ },
    // --- Master data (Mudir)
    'master.list': { roles: S, fn: apiMasterList_ },
    'master.save': { roles: M, fn: apiMasterSave_, write: true, audit: true },
    'master.status': { roles: M, fn: apiMasterStatus_, write: true, audit: true },
    'master.hapus': { roles: M, fn: apiMasterHapus_, write: true, audit: true },
    'master.pindah': { roles: M, fn: apiMasterPindah_, write: true, audit: true },
    'master.import': { roles: M, fn: apiMasterImport_, write: true, audit: true },
    'master.pin': { roles: M, fn: apiMasterPin_, write: true, audit: true },
    'hafalan.awal': { roles: S, fn: apiHafalanAwalGet_ },
    'hafalan.awalSimpan': { roles: M, fn: apiHafalanAwalSimpan_, write: true, audit: true },
    // --- Setoran & presensi
    'setoran.list': { roles: S, fn: apiSetoranList_ },
    'setoran.save': { roles: S, fn: apiSetoranSave_, write: true, audit: true },
    'setoran.update': { roles: S, fn: apiSetoranUpdate_, write: true, audit: true },
    'setoran.hapus': { roles: M, fn: apiSetoranHapus_, write: true, audit: true },
    'setoran.saran': { roles: S, fn: apiSetoranSaran_ },
    'setoran.kirimWali': { roles: S, fn: apiSetoranKirimWali_, write: true, audit: true },
    'presensi.get': { roles: S, fn: apiPresensiGet_ },
    'presensi.save': { roles: S, fn: apiPresensiSave_, write: true, audit: true },
    // --- Dashboard, profil, portal
    'dash.ringkas': { roles: S, fn: apiDashRingkas_ },
    'dash.pengingatWali': { roles: S, fn: apiPengingatWali_, write: true, audit: true },
    'santri.profil': { roles: A, fn: apiSantriProfil_ },
    'santri.riwayat': { roles: A, fn: apiSantriRiwayat_ },
    // --- Laporan & ekspor
    'laporan.tabel': { roles: S, fn: apiLaporanTabel_ },
    'laporan.grafik': { roles: S, fn: apiLaporanGrafik_ },
    'laporan.pdf': { roles: S, fn: apiLaporanPdf_ },
    'rekap.santri': { roles: A, fn: apiRekapSantri_ },
    'rekap.halaqah': { roles: S, fn: apiRekapHalaqah_ },
    'rekap.generate': { roles: M, fn: apiRekapGenerate_, write: true, audit: true },
    'rekap.status': { roles: M, fn: apiRekapStatus_ },
    // --- Pengaturan & sistem (Mudir)
    'pengaturan.get': { roles: M, fn: apiPengaturanGet_ },
    'pengaturan.save': { roles: M, fn: apiPengaturanSave_, write: true, audit: true },
    'rahasia.simpan': { roles: M, fn: apiRahasiaSimpan_, write: true, audit: true },
    'log.list': { roles: M, fn: apiLogList_ },
    'sys.status': { roles: M, fn: apiSysStatus_ },
    'sys.backup': { roles: M, fn: apiSysBackup_, write: true, audit: true },
    'sys.segarkan': { roles: M, fn: apiSysSegarkan_, audit: true },
    'sys.trigger': { roles: M, fn: apiSysTrigger_, audit: true },
    // --- Notifikasi WA & Email + CRM
    'notif.config': { roles: M, fn: apiNotifConfig_ },
    'notif.configSave': { roles: M, fn: apiNotifConfigSave_, write: true, audit: true },
    'notif.queue': { roles: M, fn: apiNotifQueue_ },
    'notif.retry': { roles: M, fn: apiNotifRetry_, write: true, audit: true },
    'notif.processNow': { roles: M, fn: apiNotifProcessNow_ },
    'wa.device': { roles: M, fn: apiWaDevice_ },
    'wa.test': { roles: M, fn: apiWaTest_, audit: true },
    'email.test': { roles: M, fn: apiEmailTest_, audit: true },
    'wa.validate': { roles: M, fn: apiWaValidate_, write: true },
    'wa.audience': { roles: M, fn: apiWaAudience_ },
    'wa.blastCreate': { roles: M, fn: apiWaBlastCreate_, write: true, audit: true },
    'wa.blastList': { roles: M, fn: apiWaBlastList_ },
    'wa.blastProcess': { roles: M, fn: apiWaBlastProcess_ },
    'wa.blastStop': { roles: M, fn: apiWaBlastStop_, write: true, audit: true },
    'crm.list': { roles: M, fn: apiCrmList_ },
    'crm.stats': { roles: M, fn: apiCrmStats_ },
    'crm.detail': { roles: M, fn: apiCrmDetail_ },
    'crm.sync': { roles: M, fn: apiCrmSync_, write: true, audit: true },
    'crm.save': { roles: M, fn: apiCrmSave_, write: true, audit: true },
    'crm.bulk': { roles: M, fn: apiCrmBulk_, write: true, audit: true },
    'crm.interaksi': { roles: M, fn: apiCrmInteraksi_, write: true },
    'crm.import': { roles: M, fn: apiCrmImport_, write: true, audit: true },
    'crm.merge': { roles: M, fn: apiCrmMerge_, write: true, audit: true },
    'crm.export': { roles: M, fn: apiCrmExport_, audit: true },
    // --- Migrasi & arsip
    'migrasi.skema': { roles: M, fn: apiMigrasiSkema_, write: true, audit: true },
    'migrasi.scan': { roles: M, fn: apiMigrasiScan_ },
    'migrasi.run': { roles: M, fn: apiMigrasiRun_, write: true, audit: true },
    'arsip.scan': { roles: M, fn: apiArsipScan_ },
    'arsip.run': { roles: M, fn: apiArsipRun_, write: true, audit: true }
  };
  return _ROUTES;
}

function dispatch_(action, token, d, body) {
  const route = routes_()[action];
  if (!route) return fail_('Aksi tidak dikenal: ' + String(action).substring(0, 40), { code: 'NO_ACTION' });
  const ctx = { action: action, body: body || {} };
  if (!route.pub) {
    const s = sesi_(token);
    if (!s) return fail_('Sesi Anda berakhir. Silakan masuk kembali.', { code: 'AUTH' });
    if (route.roles.indexOf(s.role) === -1) return fail_('Anda tidak memiliki akses untuk fitur ini.', { code: 'FORBIDDEN' });
    ctx.session = s;
  }
  // Idempoten: permintaan tulis yang diulang (mis. sinkron offline) tidak diproses dua kali
  const idem = route.write && body && body.idem ? 'idem_' + String(body.idem).substring(0, 80) : '';
  if (idem) { const hit = cacheGet_(idem); if (hit) { hit.idem = true; return hit; } }
  let res;
  if (route.write) {
    res = withLock_(function () {
      const r = route.fn(ctx, d || {});
      if (r && r.success && route.audit) audit_(ctx, action, r.auditEntitas || '', r.auditDetail || ringkasData_(d));
      flushAudit_();
      return r;
    });
  } else {
    res = route.fn(ctx, d || {});
    if (res && res.success && route.audit) audit_(ctx, action, res.auditEntitas || '', res.auditDetail || ringkasData_(d));
  }
  if (res) { delete res.auditEntitas; delete res.auditDetail; }
  if (res && ctx.session && ctx.session.perluPerpanjang) res.nt = perpanjangToken_(ctx.session);
  if (idem && res && res.success) cachePut_(idem, res, 21600);
  return res;
}

/** Gabungkan beberapa aksi BACA dalam 1 eksekusi (hemat cold start). */
function apiBatch_(ctx, d) {
  const calls = (d.calls || []).slice(0, 10), out = [];
  calls.forEach(function (c) {
    const r = routes_()[c.action];
    if (!r || r.write || c.action === 'batch') { out.push(fail_('Aksi batch tidak diizinkan: ' + c.action)); return; }
    try {
      if (!r.pub && r.roles.indexOf(ctx.session.role) === -1) { out.push(fail_('Tidak ada akses.', { code: 'FORBIDDEN' })); return; }
      out.push(r.fn({ action: c.action, session: ctx.session, body: {} }, c.data || {}));
    } catch (e) { out.push(fail_(pesanError_(e))); }
  });
  return ok_(out);
}

/* ================================================================
 *  RESPONS & GALAT
 * ================================================================ */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ok_(data, message) { return { success: true, message: message || '', data: data === undefined ? null : data }; }
function fail_(message, extra) { const r = { success: false, message: message || 'Terjadi kesalahan.' }; if (extra) Object.keys(extra).forEach(function (k) { if (extra[k] !== undefined) r[k] = extra[k]; }); return r; }
function err_(msg, code) { const e = new Error(msg); e.code = code || 'VALIDASI'; e.user = true; return e; }
function pesanError_(e) {
  if (!e) return 'Terjadi kesalahan.';
  if (e.user) return e.message;
  console.error(e && e.stack ? e.stack : e);
  const m = String(e.message || e);
  if (/Service invoked too many times|quota/i.test(m)) return 'Kuota layanan Google hari ini hampir habis. Coba lagi nanti.';
  if (/Lock|lock/.test(m)) return 'Server sedang sibuk. Coba lagi sebentar.';
  return 'Kesalahan server: ' + m.substring(0, 160);
}

/* ================================================================
 *  WAKTU & FORMAT
 * ================================================================ */
function TZ_() { return Session.getScriptTimeZone() || 'Asia/Jakarta'; }
function fmt_(d, f) { return Utilities.formatDate(d, TZ_(), f); }
function nowIso_() { return fmt_(new Date(), "yyyy-MM-dd'T'HH:mm:ss"); }
function today_() { return fmt_(new Date(), 'yyyy-MM-dd'); }
function bulanIni_() { return fmt_(new Date(), 'yyyy-MM'); }
function tglValid_(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
}
function parseTgl_(s) { const p = String(s).split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
function tambahHari_(s, n) { const d = parseTgl_(s); d.setDate(d.getDate() + n); return fmt_(d, 'yyyy-MM-dd'); }
function selisihHari_(a, b) { return Math.round((parseTgl_(b) - parseTgl_(a)) / 86400000); }
function bulanGeser_(ym, n) { const p = ym.split('-'); const d = new Date(Number(p[0]), Number(p[1]) - 1 + n, 1); return fmt_(d, 'yyyy-MM'); }
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function namaBulan_(ym) { const p = String(ym).split('-'); return NAMA_BULAN[Number(p[1]) - 1] + ' ' + p[0]; }

/* ================================================================
 *  NORMALISASI & SANITASI
 * ================================================================ */
function hp08_(v) {
  let s = String(v == null ? '' : v).trim().replace(/\.0+$/, '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
  if (!s) return '';
  if (s.indexOf('62') === 0) s = '0' + s.substring(2); else if (s.indexOf('8') === 0) s = '0' + s;
  return s;
}
function hp62_(v) { const s = hp08_(v); return s ? (s[0] === '0' ? '62' + s.substring(1) : s) : ''; }
function hpValid_(v) { return /^08\d{8,12}$/.test(hp08_(v)); }
function emailValid_(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim()); }
function str_(v, max) { return String(v == null ? '' : v).trim().substring(0, max || 500); }
function num_(v, def) { const n = Number(v); return isNaN(n) ? (def === undefined ? 0 : def) : n; }

let _NUMSET = {};
function numSet_(name) {
  if (_NUMSET[name]) return _NUMSET[name];
  const m = {}; ((SCHEMA[name] && SCHEMA[name].angka) || []).forEach(function (k) { m[k] = 1; });
  return (_NUMSET[name] = m);
}
/** Nilai sel saat dibaca → tipe konsisten (tanggal → teks, HP → 08…). */
function normCell_(v, isNum, col) {
  if (isNum) { if (v === '' || v === null || v === undefined) return ''; const n = Number(v); return isNaN(n) ? '' : n; }
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    if (v.getFullYear() < 1901) return fmt_(v, 'HH:mm');
    const t = fmt_(v, 'HH:mm:ss');
    return t === '00:00:00' ? fmt_(v, 'yyyy-MM-dd') : fmt_(v, "yyyy-MM-dd'T'HH:mm:ss");
  }
  let s = v === null || v === undefined ? '' : String(v);
  if (KOLOM_HP[col]) s = hp08_(s);
  return s;
}
/** Nilai sel saat ditulis → cegah injeksi formula Sheets (=, +, -, @). */
function cellOut_(v, isNum) {
  if (isNum) { if (v === '' || v === null || v === undefined) return ''; const n = Number(v); return isNaN(n) ? '' : n; }
  let s = v === null || v === undefined ? '' : String(v);
  if (s.length > 5000) s = s.substring(0, 5000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

/* ================================================================
 *  CACHE: memo per eksekusi → CacheService (berversi, dipecah)
 * ================================================================ */
function cache_() { return CacheService.getScriptCache(); }
function cacheGet_(k) { try { const v = cache_().get(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } }
function cachePut_(k, v, ttl) { try { const s = JSON.stringify(v); if (s.length < 95000) cache_().put(k, s, ttl || 21600); } catch (e) { } }
function cacheDel_(k) { try { cache_().remove(k); } catch (e) { } }

/** Nilai > 100 KB dipecah menjadi beberapa potongan (kepala ditulis terakhir). */
const CacheX = {
  SZ: 90000, MAX: 40,
  get: function (key) {
    try {
      const c = cache_(), head = c.get(key);
      if (head == null) return null;
      if (head.indexOf('__chunks:') !== 0) return JSON.parse(head);
      const n = Number(head.slice(9)), keys = [];
      for (let i = 0; i < n; i++) keys.push(key + '#' + i);
      const parts = c.getAll(keys); let s = '';
      for (let i = 0; i < n; i++) { if (parts[keys[i]] == null) return null; s += parts[keys[i]]; }
      return JSON.parse(s);
    } catch (e) { return null; }
  },
  put: function (key, val, ttl) {
    try {
      const s = JSON.stringify(val), c = cache_();
      ttl = ttl || 21600;
      if (s.length <= this.SZ) { c.put(key, s, ttl); return true; }
      const n = Math.ceil(s.length / this.SZ); if (n > this.MAX) return false;
      const m = {}; for (let i = 0; i < n; i++) m[key + '#' + i] = s.substr(i * this.SZ, this.SZ);
      c.putAll(m, ttl); c.put(key, '__chunks:' + n, ttl);
      return true;
    } catch (e) { return false; }
  },
  del: function (key) { cacheDel_(key); }
};

/** Versi lingkup cache: naikkan versi = cache lama otomatis tidak terpakai. */
const _VER = {};
function vers_(scopes) {
  const c = cache_(), need = scopes.filter(function (s) { return _VER[s] === undefined; });
  if (need.length) {
    const got = c.getAll(need.map(function (s) { return 'ver_' + s; })), baru = {};
    need.forEach(function (s) {
      let v = got['ver_' + s];
      if (!v) { v = String(Date.now() % 1e9) + Math.floor(Math.random() * 1000); baru['ver_' + s] = v; }
      _VER[s] = v;
    });
    if (Object.keys(baru).length) c.putAll(baru, 21600);
  }
  return scopes.map(function (s) { return _VER[s]; });
}
function ver1_(s) { return vers_([s])[0]; }
function bump_(scope) {
  const v = String(Date.now() % 1e9) + Math.floor(Math.random() * 1000);
  cache_().put('ver_' + scope, v, 21600); _VER[scope] = v;
}

/* ================================================================
 *  LOCK — kunci tulis singkat (notifikasi & UrlFetch DI LUAR kunci)
 * ================================================================ */
let _LOCK_DEPTH = 0;
function withLock_(fn, ms) {
  if (_LOCK_DEPTH > 0) return fn();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(ms || 25000)) throw err_('Server sedang menyimpan data lain. Coba lagi beberapa detik lagi.', 'BUSY');
  _LOCK_DEPTH++;
  try { return fn(); }
  finally { _LOCK_DEPTH--; try { SpreadsheetApp.flush(); } catch (e) { } lock.releaseLock(); }
}

/* ================================================================
 *  DATABASE — lapisan batch di atas Google Sheets
 * ================================================================ */
const DB = {
  _ss: null, _sh: {}, _h: {}, _memo: {},
  ss: function () {
    if (!this._ss) {
      const id = prop_('SPREADSHEET_ID');
      if (!id) throw err_('Database belum disiapkan. Jalankan setupAppEnvironment() dari editor Apps Script.', 'SETUP');
      this._ss = SpreadsheetApp.openById(id);
    }
    return this._ss;
  },
  sh: function (name) {
    if (!this._sh[name]) {
      const s = this.ss().getSheetByName(name);
      if (!s) throw err_('Sheet "' + name + '" belum ada. Jalankan migrasiSkema() dari editor atau menu Pengaturan → Data.', 'SETUP');
      this._sh[name] = s;
    }
    return this._sh[name];
  },
  /** Header sesuai urutan di sheet (boleh ada kolom tambahan buatan pengguna). */
  h: function (name) {
    if (this._h[name]) return this._h[name];
    const ck = 'hdr_' + name + '_' + ver1_('schema');
    let h = cacheGet_(ck);
    if (!h) {
      const sh = this.sh(name), lc = Math.max(1, sh.getLastColumn());
      h = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (x) { return String(x).trim(); });
      cachePut_(ck, h, 21600);
    }
    return (this._h[name] = h);
  },
  ci: function (name, col) { const i = this.h(name).indexOf(col); if (i === -1) throw err_('Kolom ' + col + ' tidak ada di sheet ' + name + '. Jalankan migrasiSkema().', 'SETUP'); return i; },
  objs: function (name, values, startRow) {
    const h = this.h(name), num = numSet_(name);
    return values.map(function (r, i) {
      const o = { _row: startRow + i };
      for (let j = 0; j < h.length; j++) if (h[j]) o[h[j]] = normCell_(r[j], num[h[j]], h[j]);
      return o;
    });
  },
  kosong_: function (o) { for (const k in o) if (k !== '_row' && o[k] !== '' && o[k] !== null) return false; return true; },
  lastRow: function (name) { return this.sh(name).getLastRow(); },
  /** Semua baris (memo + cache berversi untuk tabel kecil). fresh=true → baca langsung (wajib sebelum update). */
  all: function (name, fresh) {
    if (!fresh && this._memo[name]) return this._memo[name];
    const sc = SCHEMA[name] || {}, self = this;
    const ck = sc.cache ? 'tbl_' + name + '_' + ver1_('t_' + name) : null;
    if (!fresh && ck) { const hit = CacheX.get(ck); if (hit) return (this._memo[name] = hit); }
    const sh = this.sh(name), last = sh.getLastRow(), n = this.h(name).length;
    let rows = [];
    if (last >= 2) rows = this.objs(name, sh.getRange(2, 1, last - 1, n).getValues(), 2).filter(function (o) { return !self.kosong_(o); });
    this._memo[name] = rows;
    if (ck) CacheX.put(ck, rows, 21600);
    return rows;
  },
  /** Satu kolom saja (murah) → array nilai, indeks 0 = baris 2. */
  col: function (name, col) {
    const sh = this.sh(name), last = sh.getLastRow();
    if (last < 2) return [];
    const c = this.ci(name, col) + 1, num = numSet_(name);
    return sh.getRange(2, c, last - 1, 1).getValues().map(function (r) { return normCell_(r[0], num[col], col); });
  },
  /** Baca baris tertentu, digabung per segmen agar jumlah panggilan minimal. */
  rowsAt: function (name, rowNums, gap) {
    if (!rowNums || !rowNums.length) return [];
    gap = gap || 40;
    const nums = rowNums.slice().sort(function (a, b) { return a - b; }).filter(function (x, i, a) { return i === 0 || x !== a[i - 1]; });
    const want = {}; nums.forEach(function (r) { want[r] = 1; });
    const h = this.h(name), sh = this.sh(name), out = [], self = this;
    let s = nums[0], e = nums[0];
    function read() { self.objs(name, sh.getRange(s, 1, e - s + 1, h.length).getValues(), s).forEach(function (o) { if (want[o._row]) out.push(o); }); }
    for (let i = 1; i < nums.length; i++) { if (nums[i] - e <= gap) e = nums[i]; else { read(); s = e = nums[i]; } }
    read();
    return out;
  },
  /** n baris terakhir (data terbaru ada di bawah). */
  tail: function (name, n) {
    const sh = this.sh(name), last = sh.getLastRow();
    if (last < 2) return [];
    const start = Math.max(2, last - n + 1), self = this;
    return this.objs(name, sh.getRange(start, 1, last - start + 1, this.h(name).length).getValues(), start).filter(function (o) { return !self.kosong_(o); });
  },
  /** Baris dengan kolom tanggal dalam rentang [dari, sampai] (yyyy-MM-dd). */
  byTanggal: function (name, dari, sampai, col) {
    col = col || 'Tanggal';
    const v = this.col(name, col), rows = [];
    for (let i = 0; i < v.length; i++) { const t = String(v[i]).substring(0, 10); if (t && t >= dari && t <= sampai) rows.push(i + 2); }
    return this.rowsAt(name, rows, 200);
  },
  /** Baris dengan kolom = salah satu nilai (Set/objek). */
  byNilai: function (name, col, nilaiMap, batas) {
    const v = this.col(name, col), rows = [];
    for (let i = v.length - 1; i >= 0; i--) { if (nilaiMap[v[i]]) { rows.push(i + 2); if (batas && rows.length >= batas) break; } }
    return this.rowsAt(name, rows, 60);
  },
  append: function (name, objs) {
    if (!objs || !objs.length) return;
    const h = this.h(name), num = numSet_(name), sh = this.sh(name);
    const rows = objs.map(function (o) { return h.map(function (k) { return cellOut_(o[k], num[k]); }); });
    const start = sh.getLastRow() + 1;
    sh.getRange(start, 1, rows.length, h.length).setValues(rows);
    objs.forEach(function (o, i) { o._row = start + i; });
    this.touch(name);
  },
  /** Tulis ulang baris (objek wajib membawa _row dari baca fresh). Segmen berurutan ditulis sekali. */
  write: function (name, objs) {
    if (!objs || !objs.length) return;
    const h = this.h(name), num = numSet_(name), sh = this.sh(name);
    const sorted = objs.slice().sort(function (a, b) { return a._row - b._row; });
    let seg = [sorted[0]];
    function flush() { sh.getRange(seg[0]._row, 1, seg.length, h.length).setValues(seg.map(function (o) { return h.map(function (k) { return cellOut_(o[k], num[k]); }); })); }
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]._row === seg[seg.length - 1]._row + 1) seg.push(sorted[i]); else { flush(); seg = [sorted[i]]; }
    }
    flush();
    this.touch(name);
  },
  /** Hapus baris fisik (urut dari bawah). Hanya untuk data yang memang boleh dihapus. */
  hapus: function (name, rowNums) {
    const sh = this.sh(name);
    rowNums.slice().sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
    this.touch(name);
  },
  touch: function (name) {
    delete this._memo[name];
    bump_('t_' + name);
    if (name === 'Santri' || name === 'Wali' || name === 'Muhaffidz' || name === 'Halaqah' || name === 'Target' || name === 'HafalanAwal') bump_('master');
  }
};

/** ID berprefiks (SNT-0001) dengan penanda tertinggi di Script Properties — dipanggil di bawah kunci. */
function reserveIds_(name, n) {
  const sc = SCHEMA[name], key = 'SEQ_' + name;
  let cur = Number(prop_(key) || 0);
  if (!cur) {   // pertama kali: hitung dari data yang sudah ada (mis. hasil impor)
    const ids = DB.lastRow(name) >= 2 ? DB.col(name, sc.key) : [];
    ids.forEach(function (id) { const m = String(id).match(/(\d+)$/); if (m) cur = Math.max(cur, Number(m[1])); });
  }
  const out = [];
  for (let i = 1; i <= n; i++) { const x = String(cur + i); out.push(sc.prefix + '-' + (x.length < sc.pad ? ('000000000' + x).slice(-sc.pad) : x)); }
  setProp_(key, String(cur + n));
  return out;
}

/* ================================================================
 *  PENGATURAN (sheet Pengaturan, cache berversi)
 * ================================================================ */
let _SET = null;
function settings_() {
  if (_SET) return _SET;
  const m = {};
  SETTING_DEFAULT.forEach(function (r) { m[r[0]] = r[1]; });
  try { DB.all('Pengaturan').forEach(function (r) { if (r.Kunci) m[r.Kunci] = String(r.Nilai); }); } catch (e) { }
  return (_SET = m);
}
function setting_(k, def) { const v = settings_()[k]; return v === undefined || v === '' ? (def === undefined ? '' : def) : v; }
function settingsPublik_() { const s = settings_(), o = {}; SETTING_PUBLIK.forEach(function (k) { o[k] = s[k]; }); return o; }
function simpanSetting_(obj) {
  const rows = DB.all('Pengaturan', true), baru = [], ubah = [];
  Object.keys(obj).forEach(function (k) {
    const r = rows.filter(function (x) { return x.Kunci === k; })[0];
    if (r) { if (String(r.Nilai) !== String(obj[k])) { r.Nilai = String(obj[k]); ubah.push(r); } }
    else { const d = SETTING_DEFAULT.filter(function (x) { return x[0] === k; })[0]; baru.push({ Kunci: k, Nilai: String(obj[k]), Keterangan: d ? d[2] : '' }); }
  });
  if (ubah.length) DB.write('Pengaturan', ubah);
  if (baru.length) DB.append('Pengaturan', baru);
  _SET = null;
}
function skalaNilai_() { try { return JSON.parse(setting_('SKALA_NILAI')); } catch (e) { return JSON.parse(SETTING_DEFAULT[6][1]); } }
function predikat_(n) {
  if (n === '' || n === null || n === undefined || isNaN(Number(n))) return '';
  const sk = skalaNilai_().slice().sort(function (a, b) { return b.min - a.min; });
  for (let i = 0; i < sk.length; i++) if (Number(n) >= sk[i].min) return sk[i].label;
  return '';
}

/* ================================================================
 *  LOG AKTIVITAS (audit) — dibuffer, ditulis sekali per permintaan
 * ================================================================ */
let _AUDIT = [];
function audit_(ctx, aksi, entitas, detail) {
  const s = (ctx && ctx.session) || {};
  _AUDIT.push({ Waktu: nowIso_(), Pengguna: s.email || s.nama || '-', Peran: s.role || '-', Aksi: aksi, Entitas: str_(entitas, 200), Detail: str_(detail, 400) });
}
function flushAudit_() {
  if (!_AUDIT.length) return;
  const rows = _AUDIT; _AUDIT = [];
  withLock_(function () {
    const ids = reserveIds_('LogAktivitas', rows.length);
    rows.forEach(function (r, i) { r.ID_Log = ids[i]; });
    DB.append('LogAktivitas', rows);
  });
}

/* ================================================================
 *  SETUP — jalankan SEKALI dari editor (aman diulang / idempoten)
 * ================================================================ */
function setupAppEnvironment() {
  Logger.log('🚀 Menyiapkan ' + APP_NAME + ' v' + APP_VERSION + ' ...');
  // 1) Folder Drive (cari ulang bila sudah ada)
  let root = null;
  const rootId = prop_('DRIVE_ROOT_FOLDER_ID');
  if (rootId) { try { root = DriveApp.getFolderById(rootId); } catch (e) { root = null; } }
  if (!root) root = DriveApp.createFolder(APP_NAME);
  function sub(nama) { const it = root.getFoldersByName(nama); return it.hasNext() ? it.next() : root.createFolder(nama); }
  const f = { FOLDER_REKAP_BULANAN: sub('Rekap_Bulanan'), FOLDER_REKAP_HALAQAH: sub('Rekap_Halaqah'), FOLDER_FOTO: sub('Foto_Santri'),
    FOLDER_ARSIP_KARTU: sub('Arsip_Kartu_Fisik'), FOLDER_BACKUP: sub('Backup') };
  // 2) Spreadsheet database
  let ss = null;
  const ssId = prop_('SPREADSHEET_ID');
  if (ssId) { try { ss = SpreadsheetApp.openById(ssId); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('Database — ' + APP_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(root);
  }
  const props = { SPREADSHEET_ID: ss.getId(), DRIVE_ROOT_FOLDER_ID: root.getId() };
  Object.keys(f).forEach(function (k) { props[k] = f[k].getId(); });
  if (!prop_('OWNER_EMAIL')) { try { props.OWNER_EMAIL = Session.getEffectiveUser().getEmail(); } catch (e) { } }
  setProps_(props);
  DB._ss = ss;
  // 3) Skema (aditif, tidak pernah menghapus)
  const lap = migrasiSkema_(false);
  Logger.log('🗂️ Skema: ' + JSON.stringify(lap.ringkas));
  // 4) Rahasia internal (dibangkitkan sekali, tidak ditimpa)
  setupRahasia_();
  // 5) Catatan Kelas B (baca-saja) di sheet AppConfig
  cerminAppConfig_();
  // 6) Trigger
  pasangTrigger();
  // 7) Hangatkan cache
  try { warmCaches_('setup'); } catch (e) { }
  Logger.log('');
  Logger.log('✅ SETUP SELESAI');
  Logger.log('   Spreadsheet : ' + ss.getUrl());
  Logger.log('   Folder Drive: ' + root.getUrl());
  Logger.log('   Mudir awal  : ' + (prop_('OWNER_EMAIL') || '(isi manual di sheet Muhaffidz, Peran = Mudir)'));
  Logger.log('➡️  Lanjut: Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone');
}

/** Cerminkan HANYA konfigurasi Kelas B (bukan rahasia) sebagai catatan baca-saja. */
function cerminAppConfig_() {
  const sh = DB.sh('AppConfig');
  const rows = [['Kunci', 'Nilai', 'Keterangan'],
    ['APP_NAME', APP_NAME, 'Nama aplikasi'], ['APP_VERSION', APP_VERSION, 'Versi backend'], ['SCHEMA_VERSION', String(SCHEMA_VERSION), 'Versi skema'],
    ['SPREADSHEET_ID', prop_('SPREADSHEET_ID'), 'Catatan saja — sumber kebenaran di Script Properties'],
    ['DRIVE_ROOT_FOLDER_ID', prop_('DRIVE_ROOT_FOLDER_ID'), 'Folder root Drive'],
    ['DIPERBARUI', nowIso_(), 'Waktu setup terakhir'],
    ['CATATAN', 'Token, secret, hash PIN & sandi TIDAK disimpan di sini (ada di Script Properties).', '']];
  sh.clearContents();
  sh.getRange(1, 1, rows.length, 3).setNumberFormat('@').setValues(rows);
  sh.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#262626').setFontColor('#D8F43C');
}

/* ================================================================
 *  TRIGGER
 * ================================================================ */
const TRIGGER_DEF = [
  { fn: 'tickMenit', jenis: 'menit', ket: 'Antrean notifikasi, blast, warmup cache (tiap 1 menit)' },
  { fn: 'rekapBulananOtomatis', jenis: 'bulanan', ket: 'Rekap PDF bulanan per santri & halaqah (tgl 1, ±02.00)' },
  { fn: 'backupMingguan', jenis: 'mingguan', ket: 'Salin spreadsheet ke folder Backup (Minggu ±01.00)' },
  { fn: 'pengingatMingguan', jenis: 'pengingat', ket: 'Pengingat santri di bawah target (Sabtu ±07.00)' }
];
function pasangTrigger() {
  const ada = {};
  ScriptApp.getProjectTriggers().forEach(function (t) { ada[t.getHandlerFunction()] = true; });
  TRIGGER_DEF.forEach(function (d) {
    if (ada[d.fn]) return;
    if (d.fn === 'tickMenit' && prop_('KEEP_WARM') === 'off' && prop_('TICK_OFF') === '1') return;
    const b = ScriptApp.newTrigger(d.fn).timeBased();
    if (d.jenis === 'menit') b.everyMinutes(1).create();
    else if (d.jenis === 'bulanan') b.onMonthDay(1).atHour(2).create();
    else if (d.jenis === 'mingguan') b.onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(1).create();
    else b.onWeekDay(ScriptApp.WeekDay.SATURDAY).atHour(7).create();
  });
  Logger.log('⏱️ Trigger aktif: ' + ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); }).join(', '));
}
function hapusSemuaTrigger() { ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); }); Logger.log('Semua trigger dihapus.'); }
function matikanKeepWarm() { setProp_('KEEP_WARM', 'off'); Logger.log('Keep-warm dimatikan (antrean notifikasi tetap diproses).'); }
function nyalakanKeepWarm() { delProp_('KEEP_WARM'); Logger.log('Keep-warm dinyalakan.'); }

/** Trigger tiap menit: antrean notifikasi → blast → lanjutan job → warmup. */
function tickMenit() {
  const t0 = Date.now();
  try { prosesAntrianNotif({}); } catch (e) { console.error('antrean: ' + e.message); }
  try { lanjutkanJob_(t0); } catch (e) { console.error('job: ' + e.message); }
  try { if (prop_('KEEP_WARM') !== 'off' && Date.now() - t0 < 20000) warmCaches_('tick'); } catch (e) { console.error('warm: ' + e.message); }
}

/* ================================================================
 *  WARMUP 3 LAPIS: browser (?w=) • trigger tiap menit • setelah setup
 * ================================================================ */
function warmCaches_(scope) {
  const c = cache_(), flag = 'warm_' + scope;
  if (scope !== 'setup' && c.get(flag)) return 'skip';
  c.put(flag, '1', scope === 'tick' ? 240 : 60);
  if (!prop_('SPREADSHEET_ID')) return 'belum-setup';
  const step = [];
  ['Pengaturan', 'Santri', 'Wali', 'Muhaffidz', 'Halaqah', 'Target', 'HafalanAwal'].forEach(function (t) { DB.all(t); step.push(t); });
  aggSetoran_(); step.push('agg');
  presensiBulan_(bulanIni_()); step.push('presensi');
  c.put('warm_last', JSON.stringify({ at: nowIso_(), scope: scope }), 21600);
  return step.join(',');
}

/* ===== Auth.gs ===== */
/**
 * ================================================================
 *  MutqinSpace — Auth.gs
 *  • Satu pintu Script Properties (rahasia Kelas A & konfigurasi Kelas B)
 *  • Token sesi HMAC-SHA256 tanpa state + pencabutan
 *  • Login Google (staf, whitelist sheet Muhaffidz) — diverifikasi di server
 *  • Login NIS + PIN (wali / santri dewasa) dengan kunci 5× gagal
 *  • Akses darurat (Mudir) dengan penguncian
 *  • Cakupan data per peran (RBAC kepemilikan data)
 * ================================================================
 */

/* ---------------- Script Properties: satu pintu ---------------- */
const PROPS = PropertiesService.getScriptProperties();
let _PROP_MEMO = null;
function prop_(key, def) {
  if (!_PROP_MEMO) _PROP_MEMO = PROPS.getProperties();
  const v = _PROP_MEMO[key];
  return v === undefined || v === null || v === '' ? (def === undefined ? '' : def) : v;
}
function setProp_(key, val) { PROPS.setProperty(key, String(val)); if (_PROP_MEMO) _PROP_MEMO[key] = String(val); }
function setProps_(obj) { PROPS.setProperties(obj); if (_PROP_MEMO) Object.keys(obj).forEach(function (k) { _PROP_MEMO[k] = String(obj[k]); }); }
function delProp_(key) { PROPS.deleteProperty(key); if (_PROP_MEMO) delete _PROP_MEMO[key]; }

/* ---------------- Kriptografi ---------------- */
function acak_(n, huruf) {
  huruf = huruf || 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  while (s.length < n) {
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid())
      .forEach(function (b) { if (s.length < n) s += huruf[(b & 0xff) % huruf.length]; });
  }
  return s;
}
function sandiAcak_(n) { const s = acak_(n || 16); return /\d/.test(s) && /[A-Za-z]/.test(s) ? s : sandiAcak_(n); }
function pinAcak_() { return acak_(6, '0123456789'); }
function hashPass_(pass, salt, iter) {
  let h = String(pass);
  const n = iter || 300;
  for (let i = 0; i < n; i++) h = Utilities.base64Encode(Utilities.computeHmacSha256Signature(h + salt, salt));
  return h;
}
/** PIN: hash HMAC dengan pepper rahasia (Script Properties) + ID santri sebagai salt. */
function hashPin_(pin, idSantri) { return hashPass_(String(pin), pinPepper_() + '|' + idSantri, 40); }
function pinPepper_() {
  let p = prop_('PIN_PEPPER');
  if (!p) { p = acak_(48); setProp_('PIN_PEPPER', p); }
  return p;
}
function samaAman_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function samarkan_(v) { v = String(v || ''); return !v ? '' : v.length <= 8 ? '••••••' : v.slice(0, 4) + '••••••' + v.slice(-3); }

/* ---------------- Token sesi HMAC ---------------- */
function secret_() {
  let s = prop_('SESSION_SECRET');
  if (!s) { s = acak_(64); setProp_('SESSION_SECRET', s); }
  return s;
}
function hmac_(s) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, secret_())).replace(/=+$/, ''); }
function signToken_(p) { const body = Utilities.base64EncodeWebSafe(JSON.stringify(p)).replace(/=+$/, ''); return 'm1.' + body + '.' + hmac_(body); }
function buatSesi_(o) {
  const now = Date.now(), jam = Math.max(1, Math.min(168, num_(setting_('SESI_JAM', '12'), 12)));
  return signToken_({ e: o.email, r: o.role, n: o.nama || '', id: o.id || '', sid: o.sid || '', i: now, x: now + jam * 3600e3, d: o.darurat ? 1 : 0 });
}
function verifyToken_(t) {
  try {
    const parts = String(t || '').split('.');
    if (parts.length !== 3 || parts[0] !== 'm1' || !samaAman_(hmac_(parts[1]), parts[2])) return null;
    if (cache_().get('rvt_' + parts[2].substring(0, 40))) return null;      // logout
    let b = parts[1]; while (b.length % 4) b += '=';
    const p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(b)).getDataAsString());
    if (!p.x || p.x < Date.now()) return null;
    const rev = Number(cache_().get('rev_' + p.e) || prop_('REV_' + p.e) || 0);
    if (p.i < rev) return null;                                             // dicabut
    return { email: p.e, role: p.r, nama: p.n || '', id: p.id || '', sid: p.sid || '', iat: p.i, exp: p.x, darurat: !!p.d, sig: parts[2] };
  } catch (e) { return null; }
}
function revokeAll_(email) { const t = String(Date.now()); setProp_('REV_' + email, t); cache_().put('rev_' + email, t, 21600); }
function rotasiSecretSesi() { setProp_('SESSION_SECRET', acak_(64)); Logger.log('✅ SESSION_SECRET dirotasi — semua pengguna harus login ulang.'); }
/** Sesi diperpanjang otomatis (sliding) bila sudah lewat separuh umur. */
function perpanjangToken_(s) { return buatSesi_({ email: s.email, role: s.role, nama: s.nama, id: s.id, sid: s.sid, darurat: s.darurat }); }

/**
 * Validasi token + pastikan pengguna masih aktif & perannya tidak berubah.
 * Dipanggil di setiap permintaan non-publik.
 */
function sesi_(token) {
  const s = verifyToken_(token);
  if (!s) return null;
  if (s.darurat) { s.role = PERAN.MUDIR; }
  else if (s.role === PERAN.MUDIR || s.role === PERAN.GURU) {
    const u = stafByEmail_(s.email);
    if (!u || u.Status === 'Nonaktif') return null;
    const r = u.Peran === 'Mudir' ? PERAN.MUDIR : PERAN.GURU;
    if (r !== s.role) return null;
    s.id = u.ID_Muhaffidz; s.nama = u.Nama;
  } else {
    const sn = santriById_(s.sid);
    if (!sn || sn.Status === 'Nonaktif') return null;
    if (s.role === PERAN.SANTRI && setting_('PORTAL_SANTRI_AKTIF') !== 'YA') return null;
  }
  s.perluPerpanjang = (Date.now() - s.iat) > (s.exp - s.iat) / 2;
  return s;
}

/* ---------------- Indeks master (memo per eksekusi) ---------------- */
let _IDX = null;
function idx_() {
  if (_IDX) return _IDX;
  const I = { santri: {}, nis: {}, staf: {}, stafEmail: {}, halaqah: {}, waliBySantri: {}, waliByHp: {} };
  DB.all('Santri').forEach(function (r) { I.santri[r.ID_Santri] = r; if (r.NIS) I.nis[String(r.NIS).trim()] = r; });
  DB.all('Muhaffidz').forEach(function (r) { I.staf[r.ID_Muhaffidz] = r; if (r.Email_Google) I.stafEmail[String(r.Email_Google).toLowerCase().trim()] = r; });
  DB.all('Halaqah').forEach(function (r) { I.halaqah[r.ID_Halaqah] = r; });
  DB.all('Wali').forEach(function (r) {
    (I.waliBySantri[r.ID_Santri] = I.waliBySantri[r.ID_Santri] || []).push(r);
    if (r.No_WA) (I.waliByHp[r.No_WA] = I.waliByHp[r.No_WA] || []).push(r);
  });
  return (_IDX = I);
}
function resetIdx_() { _IDX = null; }
function santriById_(id) { return idx_().santri[id] || null; }
function stafByEmail_(email) { return idx_().stafEmail[String(email || '').toLowerCase().trim()] || null; }

/** Anak-anak yang boleh dilihat wali: santri yang berbagi nomor WA wali yang sama. */
function anakWali_(sidLogin) {
  const I = idx_(), set = {};
  set[sidLogin] = 1;
  (I.waliBySantri[sidLogin] || []).forEach(function (w) {
    (I.waliByHp[w.No_WA] || []).forEach(function (w2) { const s = I.santri[w2.ID_Santri]; if (s && s.Status !== 'Nonaktif') set[w2.ID_Santri] = 1; });
  });
  return Object.keys(set);
}

/**
 * Cakupan data per peran:
 *  mudir → semua • muhaffidz → halaqah yang diampu • wali → anak • santri → diri sendiri
 */
function scope_(ctx) {
  if (ctx._scope) return ctx._scope;
  const s = ctx.session, I = idx_();
  let sc;
  if (s.role === PERAN.MUDIR) sc = { semua: true, halaqah: null, santri: null };
  else if (s.role === PERAN.GURU) {
    const hq = {}, sn = {};
    Object.keys(I.halaqah).forEach(function (h) { if (I.halaqah[h].ID_Muhaffidz === s.id) hq[h] = 1; });
    Object.keys(I.santri).forEach(function (id) { if (hq[I.santri[id].ID_Halaqah]) sn[id] = 1; });
    sc = { semua: false, halaqah: hq, santri: sn };
  } else if (s.role === PERAN.WALI) {
    const sn = {}; anakWali_(s.sid).forEach(function (id) { sn[id] = 1; });
    sc = { semua: false, halaqah: {}, santri: sn };
  } else { const sn = {}; sn[s.sid] = 1; sc = { semua: false, halaqah: {}, santri: sn }; }
  return (ctx._scope = sc);
}
function bolehSantri_(ctx, id) { const sc = scope_(ctx); return sc.semua ? !!santriById_(id) : !!sc.santri[id]; }
function bolehHalaqah_(ctx, id) { const sc = scope_(ctx); return sc.semua ? !!idx_().halaqah[id] : !!sc.halaqah[id]; }
function wajibSantri_(ctx, id) { if (!bolehSantri_(ctx, id)) throw err_('Data santri ini di luar hak akses Anda.', 'FORBIDDEN'); return santriById_(id); }

/* ================================================================
 *  ENDPOINT AUTH
 * ================================================================ */
function apiAuthConfig_(ctx, d) {
  return ok_({ googleClientId: prop_('GOOGLE_CLIENT_ID'), namaLembaga: setting_('NAMA_LEMBAGA'), labelPeriode: setting_('LABEL_PERIODE'),
    portalSantri: setting_('PORTAL_SANTRI_AKTIF') === 'YA', siap: !!prop_('SPREADSHEET_ID'), v: APP_VERSION });
}

function verifyGoogleIdToken_(idToken) {
  const cid = prop_('GOOGLE_CLIENT_ID');
  if (!cid) throw err_('Login Google belum dikonfigurasi. Masuk lewat Akses Darurat lalu isi Client ID di Pengaturan → Keamanan.', 'SETUP');
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw err_('Token Google tidak valid atau kedaluwarsa.');
  const p = JSON.parse(r.getContentText());
  if (p.aud !== cid) throw err_('Token Google bukan untuk aplikasi ini.');
  if (['accounts.google.com', 'https://accounts.google.com'].indexOf(p.iss) === -1) throw err_('Penerbit token tidak dikenal.');
  if (String(p.email_verified) !== 'true') throw err_('Email Google belum terverifikasi.');
  if (Number(p.exp) * 1000 < Date.now()) throw err_('Token Google kedaluwarsa.');
  return { email: String(p.email).toLowerCase(), nama: p.name || '', foto: p.picture || '' };
}

function apiAuthGoogle_(ctx, d) {
  const g = verifyGoogleIdToken_(String(d.credential || ''));
  const u = stafByEmail_(g.email);
  if (!u || u.Status === 'Nonaktif') {
    audit_({ session: { email: g.email, role: '-' } }, 'LOGIN_DITOLAK', 'Auth', 'Email tidak terdaftar/nonaktif');
    return fail_('Email ' + g.email + ' belum terdaftar sebagai Mudir/Muhaffidz aktif. Hubungi Mudir.', { code: 'NOT_WHITELISTED' });
  }
  const role = u.Peran === 'Mudir' ? PERAN.MUDIR : PERAN.GURU;
  const me = { email: g.email, role: role, nama: u.Nama, id: u.ID_Muhaffidz, foto: u.Foto_URL || g.foto };
  if (role === PERAN.MUDIR && d.appUrl && !setting_('APP_URL') && /^https:\/\//.test(d.appUrl)) withLock_(function () { simpanSetting_({ APP_URL: str_(d.appUrl, 300) }); });
  audit_({ session: me }, 'LOGIN', 'Auth', 'Google');
  return ok_({ token: buatSesi_(me), me: me });
}

/** Login wali / santri dewasa: NIS + PIN, kunci sementara setelah 5× gagal. */
function apiAuthPin_(ctx, d) {
  const nis = str_(d.nis, 40), pin = str_(d.pin, 20), mode = d.mode === 'santri' ? PERAN.SANTRI : PERAN.WALI;
  if (!nis || !pin) return fail_('NIS dan PIN wajib diisi.');
  if (mode === PERAN.SANTRI && setting_('PORTAL_SANTRI_AKTIF') !== 'YA') return fail_('Portal santri belum diaktifkan lembaga.');
  const c = cache_(), kk = 'pinlock_' + nis, kg = 'pingagal_' + nis;
  const kunci = Number(c.get(kk) || 0);
  if (kunci > Date.now()) return fail_('Terlalu banyak percobaan. Coba lagi ' + Math.ceil((kunci - Date.now()) / 60000) + ' menit lagi.', { code: 'LOCKED' });
  const s = idx_().nis[nis];
  const cocok = s && s.Status !== 'Nonaktif' && s.PIN_Hash && samaAman_(hashPin_(pin, s.ID_Santri), s.PIN_Hash);
  if (!cocok) {
    const n = Number(c.get(kg) || 0) + 1;
    c.put(kg, String(n), 900);
    if (n >= 5) { c.put(kk, String(Date.now() + 15 * 60000), 900); c.remove(kg); }
    audit_({ session: { email: 'nis:' + nis, role: mode } }, 'LOGIN_PIN_GAGAL', 'Auth', 'Percobaan ke-' + n);
    Utilities.sleep(400);
    return fail_('NIS atau PIN salah.' + (n >= 3 && n < 5 ? ' Sisa percobaan: ' + (5 - n) + '.' : n >= 5 ? ' Akun dikunci 15 menit.' : ''));
  }
  c.remove(kg);
  const wali = (idx_().waliBySantri[s.ID_Santri] || [])[0];
  const nama = mode === PERAN.WALI ? (wali ? wali.Nama : 'Wali ' + s.Nama) : s.Nama;
  const me = { email: 'nis:' + nis, role: mode, nama: nama, sid: s.ID_Santri };
  audit_({ session: me }, 'LOGIN', 'Auth', 'PIN ' + mode);
  return ok_({ token: buatSesi_(me), me: me });
}

function apiAuthDarurat_(ctx, d) {
  const c = cache_(), kunci = Number(prop_('DARURAT_KUNCI_SAMPAI') || 0);
  if (kunci > Date.now()) return fail_('Akses darurat dikunci sementara. Coba lagi ' + Math.ceil((kunci - Date.now()) / 60000) + ' menit lagi.', { code: 'LOCKED' });
  const user = prop_('EMERGENCY_USER'), hash = prop_('EMERGENCY_PASS_HASH'), salt = prop_('EMERGENCY_SALT');
  if (!user || !hash || !salt) return fail_('Akses darurat belum dikonfigurasi. Jalankan setupAppEnvironment().');
  const ok = samaAman_(String(d.username || ''), user) && samaAman_(hashPass_(String(d.password || ''), salt), hash);
  if (!ok) {
    const n = Number(c.get('darurat_gagal') || 0) + 1;
    c.put('darurat_gagal', String(n), 900);
    if (n >= 5) { setProp_('DARURAT_KUNCI_SAMPAI', String(Date.now() + 15 * 60000)); c.remove('darurat_gagal'); }
    audit_({ session: { email: 'darurat' } }, 'LOGIN_DARURAT_GAGAL', 'Keamanan', 'Percobaan ke-' + n);
    Utilities.sleep(600);
    return fail_('Nama pengguna atau kata sandi salah.' + (n >= 3 ? ' Sisa percobaan: ' + Math.max(0, 5 - n) + '.' : ''));
  }
  c.remove('darurat_gagal');
  const me = { email: 'darurat', role: PERAN.MUDIR, nama: 'Akses Darurat', darurat: true, id: '' };
  audit_({ session: me }, 'LOGIN_DARURAT', 'Keamanan', 'Akses darurat dipakai');
  return ok_({ token: buatSesi_(me), me: me });
}

function apiAuthMe_(ctx) { return ok_(meOf_(ctx)); }
function meOf_(ctx) {
  const s = ctx.session, o = { email: s.email, role: s.role, nama: s.nama, id: s.id, sid: s.sid, darurat: s.darurat };
  if (s.role === PERAN.MUDIR || s.role === PERAN.GURU) { const u = idx_().staf[s.id]; if (u) o.foto = u.Foto_URL || ''; }
  return o;
}
function apiAuthLogout_(ctx) { cache_().put('rvt_' + ctx.session.sig.substring(0, 40), '1', 21600); return ok_(null, 'Anda telah keluar.'); }
function apiKeluarSemua_(ctx, d) {
  if (d.email) revokeAll_(String(d.email).toLowerCase()); else rotasiSecretSesiInternal_();
  return ok_(null, d.email ? 'Sesi akun dicabut.' : 'Semua pengguna dikeluarkan.');
}
function rotasiSecretSesiInternal_() { setProp_('SESSION_SECRET', acak_(64)); }

function apiGantiPin_(ctx, d) {
  const s = DB.all('Santri', true).filter(function (r) { return r.ID_Santri === ctx.session.sid; })[0];
  if (!s) return fail_('Data santri tidak ditemukan.');
  if (!samaAman_(hashPin_(str_(d.pinLama, 20), s.ID_Santri), s.PIN_Hash)) return fail_('PIN lama salah.');
  const baru = str_(d.pinBaru, 20);
  if (!/^\d{6}$/.test(baru)) return fail_('PIN baru harus 6 digit angka.');
  s.PIN_Hash = hashPin_(baru, s.ID_Santri); s.Diubah_Pada = nowIso_();
  DB.write('Santri', [s]);
  const r = ok_(null, 'PIN berhasil diganti.'); r.auditEntitas = s.ID_Santri; r.auditDetail = 'PIN diganti oleh ' + ctx.session.role;
  return r;
}

function apiRotasiDarurat_(ctx, d) {
  const p = String(d.passwordBaru || '');
  if (p.length < 12 || !/\d/.test(p) || !/[A-Za-z]/.test(p)) return fail_('Kata sandi minimal 12 karakter berisi huruf dan angka.');
  const salt = Utilities.getUuid();
  setProps_({ EMERGENCY_USER: str_(d.username || 'darurat', 40) || 'darurat', EMERGENCY_SALT: salt, EMERGENCY_PASS_HASH: hashPass_(p, salt) });
  delProp_('DARURAT_KUNCI_SAMPAI');
  revokeAll_('darurat');
  audit_(ctx, 'ROTASI_DARURAT', 'Keamanan', 'Kredensial darurat diganti');
  return ok_(null, 'Kredensial darurat diperbarui. Sesi darurat lama dicabut.');
}

/* ---------------- Setup rahasia (sekali, tidak menimpa) ---------------- */
function setupRahasia_() {
  secret_();
  pinPepper_();
  if (!prop_('EMERGENCY_PASS_HASH')) {
    const sandi = sandiAcak_(16), salt = Utilities.getUuid();
    setProps_({ EMERGENCY_USER: 'darurat', EMERGENCY_SALT: salt, EMERGENCY_PASS_HASH: hashPass_(sandi, salt) });
    Logger.log('🔐 AKSES DARURAT — CATAT SEKARANG (hanya tampil sekali, ganti setelah login pertama)');
    Logger.log('   Nama pengguna : darurat');
    Logger.log('   Kata sandi    : ' + sandi);
  } else {
    Logger.log('🔐 Akses darurat sudah ada (tidak diubah). Lupa? Jalankan resetAksesDarurat().');
  }
}
function resetAksesDarurat() {
  const p = sandiAcak_(16), salt = Utilities.getUuid();
  setProps_({ EMERGENCY_USER: 'darurat', EMERGENCY_SALT: salt, EMERGENCY_PASS_HASH: hashPass_(p, salt) });
  delProp_('DARURAT_KUNCI_SAMPAI'); revokeAll_('darurat');
  Logger.log('🔐 Akses darurat baru → darurat / ' + p);
}

/* ---------------- Rahasia pihak ketiga dari dashboard (allowlist) ---------------- */
const RAHASIA_DASHBOARD = {
  FONNTE_TOKEN: { maks: 200 },
  GOOGLE_CLIENT_ID: { pola: /\.apps\.googleusercontent\.com$/, pesan: 'Client ID harus berakhiran .apps.googleusercontent.com' }
};
function apiRahasiaSimpan_(ctx, d) {
  const k = String(d.kunci || ''), aturan = RAHASIA_DASHBOARD[k];
  if (!aturan) return fail_('Kunci tidak diizinkan.');
  if (d.nilai === '__HAPUS__') delProp_(k);
  else {
    const v = String(d.nilai || '').trim();
    if (!v) return fail_('Nilai kosong — tidak ada yang diubah.');
    if (aturan.pola && !aturan.pola.test(v)) return fail_(aturan.pesan || 'Format tidak valid.');
    setProp_(k, v.slice(0, aturan.maks || 500));
  }
  const res = ok_({ kunci: k, ada: !!prop_(k), samar: k === 'GOOGLE_CLIENT_ID' ? prop_(k) : samarkan_(prop_(k)) }, 'Tersimpan.');
  res.auditEntitas = 'Rahasia:' + k;
  res.auditDetail = d.nilai === '__HAPUS__' ? 'dihapus' : 'diperbarui';
  return res;
}

/* ---------------- Redaksi untuk log ---------------- */
const POLA_RAHASIA = /(token|password|passwd|sandi|secret|rahasia|credential|kredensial|api[_-]?key|apikey|hash|salt|authorization|otp|pin)/i;
function redaksi_(o, d) {
  d = d || 0;
  if (o === null || typeof o !== 'object' || d > 4) return o;
  if (Array.isArray(o)) return o.length > 20 ? '[' + o.length + ' item]' : o.map(function (x) { return redaksi_(x, d + 1); });
  const out = {};
  Object.keys(o).forEach(function (k) { out[k] = POLA_RAHASIA.test(k) ? '[DISAMARKAN]' : redaksi_(o[k], d + 1); });
  return out;
}
function ringkasData_(d) { try { const s = JSON.stringify(redaksi_(d || {})); return s.length > 300 ? s.slice(0, 297) + '…' : s; } catch (e) { return ''; } }

/* ================================================================
 *  BOOT — muatan awal SPA sesuai peran (sekali, lalu SWR di browser)
 * ================================================================ */
function apiBoot_(ctx, d) {
  const s = ctx.session, I = idx_(), sc = scope_(ctx);
  const out = { me: meOf_(ctx), setting: settingsPublik_(), server: { v: APP_VERSION, today: today_(), now: nowIso_() } };
  const staf = DB.all('Muhaffidz');
  out.staf = staf.map(function (u) { return { id: u.ID_Muhaffidz, nama: u.Nama, foto: u.Foto_URL || '', peran: u.Peran, status: u.Status }; });
  const halaqah = DB.all('Halaqah').filter(function (h) { return sc.semua || sc.halaqah[h.ID_Halaqah] || (s.role === PERAN.WALI || s.role === PERAN.SANTRI); });
  const santriTerlihat = DB.all('Santri').filter(function (r) { return sc.semua || sc.santri[r.ID_Santri]; });
  const hqTerpakai = {}; santriTerlihat.forEach(function (r) { hqTerpakai[r.ID_Halaqah] = 1; });
  out.halaqah = halaqah.filter(function (h) { return sc.semua || sc.halaqah[h.ID_Halaqah] || hqTerpakai[h.ID_Halaqah]; })
    .map(function (h) { return { id: h.ID_Halaqah, nama: h.Nama_Halaqah, muhaffidz: h.ID_Muhaffidz, jadwal: h.Jadwal, tingkat: h.Tingkat, status: h.Status }; });
  out.santri = santriTerlihat.map(function (r) {
    return { id: r.ID_Santri, nis: r.NIS, nama: r.Nama, jk: r.Jenis_Kelamin, halaqah: r.ID_Halaqah, status: r.Status, foto: r.Foto_URL || '', masuk: r.Tanggal_Masuk, punyaPin: !!r.PIN_Hash };
  });
  if (s.role === PERAN.MUDIR && d.appUrl && !setting_('APP_URL') && /^https:\/\//.test(d.appUrl)) withLock_(function () { simpanSetting_({ APP_URL: str_(d.appUrl, 300) }); });
  return ok_(out);
}

/** drain: proses antrean notifikasi kecil setelah aksi tulis (dipicu frontend). */
function apiDrain_(ctx) {
  if (prop_('ANTRIAN_ADA') !== '1') return ok_({ left: 0 });
  const r = prosesAntrianNotif({ maks: 15, dariWeb: true });
  return ok_({ left: r && r.sisa ? 1 : 0, terkirim: r ? r.terkirim : 0 });
}

/* ===== Quran.gs ===== */
/**
 * ================================================================
 *  MutqinSpace — Quran.gs
 *  Data referensi Al-Qur'an (mushaf Madinah, riwayat Hafs):
 *  114 surah + jumlah ayat, 30 awal juz, estimasi halaman.
 *  Dipakai untuk validasi ayat (FR-13), juz otomatis, peta hafalan.
 * ================================================================
 */

// [nama surah, jumlah ayat] — indeks 0 = surah ke-1
const DATA_SURAH = [
  ['Al-Fatihah', 7], ['Al-Baqarah', 286], ["Ali 'Imran", 200], ["An-Nisa'", 176], ["Al-Ma'idah", 120],
  ["Al-An'am", 165], ["Al-A'raf", 206], ['Al-Anfal', 75], ['At-Taubah', 129], ['Yunus', 109],
  ['Hud', 123], ['Yusuf', 111], ["Ar-Ra'd", 43], ['Ibrahim', 52], ['Al-Hijr', 99],
  ['An-Nahl', 128], ["Al-Isra'", 111], ['Al-Kahf', 110], ['Maryam', 98], ['Taha', 135],
  ["Al-Anbiya'", 112], ['Al-Hajj', 78], ["Al-Mu'minun", 118], ['An-Nur', 64], ['Al-Furqan', 77],
  ["Asy-Syu'ara'", 227], ['An-Naml', 93], ['Al-Qasas', 88], ["Al-'Ankabut", 69], ['Ar-Rum', 60],
  ['Luqman', 34], ['As-Sajdah', 30], ['Al-Ahzab', 73], ["Saba'", 54], ['Fatir', 45],
  ['Yasin', 83], ['As-Saffat', 182], ['Sad', 88], ['Az-Zumar', 75], ['Gafir', 85],
  ['Fussilat', 54], ['Asy-Syura', 53], ['Az-Zukhruf', 89], ['Ad-Dukhan', 59], ['Al-Jasiyah', 37],
  ['Al-Ahqaf', 35], ['Muhammad', 38], ['Al-Fath', 29], ['Al-Hujurat', 18], ['Qaf', 45],
  ['Az-Zariyat', 60], ['At-Tur', 49], ['An-Najm', 62], ['Al-Qamar', 55], ['Ar-Rahman', 78],
  ["Al-Waqi'ah", 96], ['Al-Hadid', 29], ['Al-Mujadilah', 22], ['Al-Hasyr', 24], ['Al-Mumtahanah', 13],
  ['As-Saff', 14], ["Al-Jumu'ah", 11], ['Al-Munafiqun', 11], ['At-Tagabun', 18], ['At-Talaq', 12],
  ['At-Tahrim', 12], ['Al-Mulk', 30], ['Al-Qalam', 52], ['Al-Haqqah', 52], ["Al-Ma'arij", 44],
  ['Nuh', 28], ['Al-Jinn', 28], ['Al-Muzzammil', 20], ['Al-Muddassir', 56], ['Al-Qiyamah', 40],
  ['Al-Insan', 31], ['Al-Mursalat', 50], ["An-Naba'", 40], ["An-Nazi'at", 46], ["'Abasa", 42],
  ['At-Takwir', 29], ['Al-Infitar', 19], ['Al-Mutaffifin', 36], ['Al-Insyiqaq', 25], ['Al-Buruj', 22],
  ['At-Tariq', 17], ["Al-A'la", 19], ['Al-Gasyiyah', 26], ['Al-Fajr', 30], ['Al-Balad', 20],
  ['Asy-Syams', 15], ['Al-Lail', 21], ['Ad-Duha', 11], ['Asy-Syarh', 8], ['At-Tin', 8],
  ["Al-'Alaq", 19], ['Al-Qadr', 5], ['Al-Bayyinah', 8], ['Az-Zalzalah', 8], ["Al-'Adiyat", 11],
  ["Al-Qari'ah", 11], ['At-Takasur', 8], ["Al-'Asr", 3], ['Al-Humazah', 9], ['Al-Fil', 5],
  ['Quraisy', 4], ["Al-Ma'un", 7], ['Al-Kausar', 3], ['Al-Kafirun', 6], ['An-Nasr', 3],
  ['Al-Lahab', 5], ['Al-Ikhlas', 4], ['Al-Falaq', 5], ['An-Nas', 6]
];

// Awal setiap juz: [surah, ayat] — indeks 0 = juz 1
const DATA_JUZ = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1]
];

const HALAMAN_PER_JUZ = 20;   // estimasi standar mushaf 15 baris (604 halaman)
let _Q = null;

/** Bangun indeks global ayat (1..6236) sekali per eksekusi. */
function Q_() {
  if (_Q) return _Q;
  const off = [0], total = [];
  let g = 0;
  DATA_SURAH.forEach(function (s, i) { off[i + 1] = g; g += s[1]; });
  const juzAwal = DATA_JUZ.map(function (j) { return off[j[0]] + j[1]; });          // global index awal juz
  const juzAyat = juzAwal.map(function (a, i) { return (i < 29 ? juzAwal[i + 1] : g + 1) - a; });
  // bobot halaman kumulatif: tiap ayat = 20 / jumlah ayat di juznya
  const W = new Float64Array(g + 1);
  let j = 0;
  for (let k = 1; k <= g; k++) {
    while (j < 29 && k >= juzAwal[j + 1]) j++;
    W[k] = W[k - 1] + HALAMAN_PER_JUZ / juzAyat[j];
  }
  _Q = { off: off, total: g, juzAwal: juzAwal, juzAyat: juzAyat, W: W };
  return _Q;
}

function namaSurah_(s) { const d = DATA_SURAH[Number(s) - 1]; return d ? d[0] : ''; }
function jumlahAyat_(s) { const d = DATA_SURAH[Number(s) - 1]; return d ? d[1] : 0; }
function gIdx_(s, a) { return Q_().off[Number(s)] + Number(a); }

/** Juz dari indeks global. */
function juzG_(g) {
  const ja = Q_().juzAwal;
  let lo = 0, hi = 29;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ja[m] <= g) lo = m; else hi = m - 1; }
  return lo + 1;
}
function juzOf_(s, a) { return juzG_(gIdx_(s, a)); }

/** Estimasi jumlah halaman untuk rentang ayat dalam satu surah. */
function halaman_(s, a1, a2) {
  const q = Q_(), g1 = gIdx_(s, a1), g2 = gIdx_(s, a2);
  if (!(g2 >= g1)) return 0;
  return Math.round((q.W[g2] - q.W[g1 - 1]) * 100) / 100;
}

/** Rentang global [awal, akhir] sebuah juz. */
function rentangJuz_(j) {
  const q = Q_();
  return [q.juzAwal[j - 1], j < 30 ? q.juzAwal[j] - 1 : q.total];
}

/** Label surah pertama–terakhir dalam juz, mis. "Al-Mulk – Al-Mursalat". */
function labelJuz_(j) {
  const a = DATA_JUZ[j - 1], b = j < 30 ? DATA_JUZ[j] : [114, 6];
  const akhirSurah = b[1] === 1 ? b[0] - 1 : b[0];
  return namaSurah_(a[0]) + (akhirSurah !== a[0] ? ' – ' + namaSurah_(akhirSurah) : '');
}

/** Validasi rentang ayat (FR-13). Mengembalikan pesan galat atau ''. */
function cekAyat_(s, a1, a2) {
  s = Number(s); a1 = Number(a1); a2 = Number(a2);
  if (!(s >= 1 && s <= 114) || Math.floor(s) !== s) return 'Surah tidak valid.';
  const n = jumlahAyat_(s);
  if (!(a1 >= 1) || Math.floor(a1) !== a1) return 'Ayat awal tidak valid.';
  if (!(a2 >= a1) || Math.floor(a2) !== a2) return 'Ayat akhir harus ≥ ayat awal.';
  if (a2 > n) return 'Surah ' + namaSurah_(s) + ' hanya ' + n + ' ayat.';
  return '';
}

// ---------------- Operasi interval (cakupan hafalan) ----------------
/** Gabungkan interval [[a,b],...] yang tumpang tindih/bersebelahan. */
function gabungInterval_(list) {
  if (!list || !list.length) return [];
  const s = list.filter(function (x) { return x && x[1] >= x[0]; }).sort(function (x, y) { return x[0] - y[0]; });
  const out = [];
  s.forEach(function (x) {
    const last = out[out.length - 1];
    if (last && x[0] <= last[1] + 1) { if (x[1] > last[1]) last[1] = x[1]; } else out.push([x[0], x[1]]);
  });
  return out;
}
function tambahInterval_(list, a, b) { list.push([a, b]); return gabungInterval_(list); }

/** Jumlah ayat dari interval yang jatuh di rentang [lo, hi]. */
function cakupan_(list, lo, hi) {
  let n = 0;
  (list || []).forEach(function (x) { const a = Math.max(x[0], lo), b = Math.min(x[1], hi); if (b >= a) n += b - a + 1; });
  return n;
}
/** Irisan dua daftar interval. */
function irisanInterval_(A, B) {
  const out = []; let i = 0, j = 0;
  A = A || []; B = B || [];
  while (i < A.length && j < B.length) {
    const a = Math.max(A[i][0], B[j][0]), b = Math.min(A[i][1], B[j][1]);
    if (b >= a) out.push([a, b]);
    if (A[i][1] < B[j][1]) i++; else j++;
  }
  return out;
}
/** Halaman (estimasi) dari daftar interval. */
function halamanInterval_(list) {
  const W = Q_().W; let h = 0;
  (list || []).forEach(function (x) { h += W[x[1]] - W[x[0] - 1]; });
  return Math.round(h * 100) / 100;
}
/** Serialisasi interval ke teks "a-b,c-d" (untuk disimpan di sheet). */
function intervalKeTeks_(list) { return (list || []).map(function (x) { return x[0] === x[1] ? String(x[0]) : x[0] + '-' + x[1]; }).join(','); }
function teksKeInterval_(t) {
  const out = [];
  String(t || '').split(',').forEach(function (p) {
    const m = p.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (m) out.push([Number(m[1]), Number(m[2] || m[1])]);
  });
  return gabungInterval_(out);
}
/** Ringkasan manusiawi interval → "Juz 29–30, Al-Baqarah 1–20". */
function ringkasInterval_(list) {
  const juzPenuh = [], sisa = [];
  for (let j = 1; j <= 30; j++) {
    const r = rentangJuz_(j);
    if (cakupan_(list, r[0], r[1]) === r[1] - r[0] + 1) juzPenuh.push(j);
  }
  const bagian = [];
  let i = 0;
  while (i < juzPenuh.length) {
    let k = i; while (k + 1 < juzPenuh.length && juzPenuh[k + 1] === juzPenuh[k] + 1) k++;
    bagian.push(i === k ? 'Juz ' + juzPenuh[i] : 'Juz ' + juzPenuh[i] + '–' + juzPenuh[k]);
    i = k + 1;
  }
  const n = cakupan_(list, 1, Q_().total);
  const nPenuh = juzPenuh.reduce(function (t, j) { const r = rentangJuz_(j); return t + r[1] - r[0] + 1; }, 0);
  if (n > nPenuh) sisa.push('+' + (n - nPenuh) + ' ayat');
  return bagian.concat(sisa).join(', ') || '-';
}

/* ===== Data.gs ===== */
/**
 * ================================================================
 *  MutqinSpace — Data.gs
 *  • Agregat hafalan berinkremen (AGG) — dasar dashboard, peta, target
 *  • Presensi per bulan (cache berversi per bulan)
 *  • Target & capaian
 *  • Master data (FR-05..FR-09), impor massal, PIN wali, hafalan awal
 *  • Setoran (FR-10..FR-16) & presensi
 * ================================================================
 */

/* ================================================================
 *  AGREGAT SETORAN (inkremental)
 *  Disimpan di CacheX; pembaca mengejar baris baru (A.rows → lastRow),
 *  edit/hapus di tengah → naikkan versi 'agg' → bangun ulang penuh.
 *  Rekaman per santri:
 *   z  : interval global ayat yang sudah diziyadahkan
 *   m  : interval yang dimurojaah lancar (≥ MUTQIN_MIN) → mutqin
 *   n  : jumlah setoran, last: tanggal terakhir, r: baris terakhir
 *   lz / lm : [surah, ayatSampai, tanggal, ayatDari] ziyadah/murojaah terakhir; pz: surah ziyadah sebelumnya
 *   mon[YYYY-MM] : [cnt, halZ, halM, sumTajwid, sumKelancaran, nNilai, ayatZ, maskHari, cntZ, cntM]
 *   sur[surah]   : [cnt, sumKelancaran, nK]
 * ================================================================ */
let _AGG = null;
function bumpAgg_() { bump_('agg'); _AGG = null; }

function aggSetoran_() {
  if (_AGG) return _AGG;
  const key = 'agg_' + ver1_('agg');
  let A = CacheX.get(key);
  const sh = DB.sh('Setoran'), last = sh.getLastRow();
  if (!A || A.sv !== SCHEMA_VERSION || last < A.rows) A = aggBaru_();
  if (last > A.rows) {
    const H = DB.h('Setoran'), ix = {};
    H.forEach(function (k, i) { ix[k] = i; });
    const mq = num_(setting_('MUTQIN_MIN', '85'), 85);
    for (let r = A.rows + 1; r <= last; r += 15000) {
      const n = Math.min(15000, last - r + 1);
      const vals = sh.getRange(r, 1, n, H.length).getValues();
      for (let i = 0; i < vals.length; i++) aggTambah_(A, vals[i], ix, r + i, mq);
    }
    A.rows = last;
    aggPangkas_(A);
    A.at = nowIso_();
    CacheX.put(key, A, 21600);
  }
  return (_AGG = A);
}

function aggBaru_() {
  const A = { sv: SCHEMA_VERSION, rows: 1, at: '', s: {}, g: {} };
  DB.all('HafalanAwal').forEach(function (h) {
    if (!h.ID_Santri) return;
    A.s[h.ID_Santri] = { z: teksKeInterval_(h.Ziyadah), m: irisanInterval_(teksKeInterval_(h.Mutqin), teksKeInterval_(h.Ziyadah)),
      n: num_(h.Total_Setoran), b: num_(h.Total_Setoran), last: '', r: 0, mon: {}, sur: {} };
  });
  return A;
}

function tglSel_(v) { return v instanceof Date ? fmt_(v, 'yyyy-MM-dd') : String(v || '').substring(0, 10); }

function aggTambah_(A, row, ix, rowNum, mq) {
  const id = String(row[ix.ID_Santri] || '');
  if (!id) return;
  const s = Number(row[ix.Surah]), a1 = Number(row[ix.Ayat_Dari]);
  let a2 = Number(row[ix.Ayat_Sampai]);
  if (!(s >= 1 && s <= 114) || !(a1 >= 1) || !(a2 >= a1)) return;
  a2 = Math.min(a2, jumlahAyat_(s));
  const tgl = tglSel_(row[ix.Tanggal]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) return;
  const g1 = gIdx_(s, a1), g2 = gIdx_(s, a2);
  const T = row[ix.Nilai_Tajwid], K = row[ix.Nilai_Kelancaran];
  const adaNilai = T !== '' && K !== '' && !isNaN(Number(T)) && !isNaN(Number(K));
  const hal = Number(row[ix.Jumlah_Baris_Halaman]) || halaman_(s, a1, a2);
  const rec = A.s[id] || (A.s[id] = { z: [], m: [], n: 0, b: 0, last: '', r: 0, mon: {}, sur: {} });
  rec.n++;
  if (tgl > rec.last) rec.last = tgl;
  if (rowNum > rec.r) rec.r = rowNum;
  const ym = tgl.substring(0, 7), day = Number(tgl.substring(8, 10));
  const M = rec.mon[ym] || (rec.mon[ym] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  M[0]++; M[7] |= (1 << (day - 1));
  if (/^z/i.test(String(row[ix.Jenis]))) {
    M[1] += hal; M[6] += a2 - a1 + 1; M[8]++;
    rec.z = tambahInterval_(rec.z, g1, g2);
    if (!rec.lz || tgl >= rec.lz[2]) { if (rec.lz && rec.lz[0] !== s) rec.pz = rec.lz[0]; rec.lz = [s, a2, tgl, a1]; }
  } else {
    M[2] += hal; M[9]++;
    if (adaNilai && Number(K) >= mq) rec.m = tambahInterval_(rec.m, g1, g2);
    if (!rec.lm || tgl >= rec.lm[2]) rec.lm = [s, a2, tgl, a1];
  }
  if (adaNilai) { M[3] += Number(T); M[4] += Number(K); M[5]++; }
  const su = rec.sur[s] || (rec.sur[s] = [0, 0, 0]);
  su[0]++; if (adaNilai) { su[1] += Number(K); su[2]++; }
  const mh = String(row[ix.ID_Muhaffidz] || '');
  if (mh) { const G = A.g[mh] || (A.g[mh] = {}); const gm = G[ym] || (G[ym] = [0, 0]); gm[0]++; gm[1] |= (1 << (day - 1)); }
}

/** Buang data bulanan > 13 bulan & bulatkan angka agar cache tetap ringkas. */
function aggPangkas_(A) {
  const batas = bulanGeser_(bulanIni_(), -13);
  Object.keys(A.s).forEach(function (id) {
    const mon = A.s[id].mon;
    Object.keys(mon).forEach(function (ym) {
      if (ym < batas) delete mon[ym];
      else { mon[ym][1] = Math.round(mon[ym][1] * 100) / 100; mon[ym][2] = Math.round(mon[ym][2] * 100) / 100; }
    });
  });
  Object.keys(A.g).forEach(function (id) { Object.keys(A.g[id]).forEach(function (ym) { if (ym < batas) delete A.g[id][ym]; }); });
}
function recKosong_() { return { z: [], m: [], n: 0, b: 0, last: '', r: 0, mon: {}, sur: {} }; }
function popcount_(x) { let n = 0; x = x >>> 0; while (x) { n += x & 1; x >>>= 1; } return n; }

/* ================================================================
 *  PRESENSI PER BULAN (cache berversi per bulan)
 *  P.s[id] = { h, i, s, a, d: { 'dd': 'H' | 'I:ket' | ... } }
 * ================================================================ */
const KODE_PRESENSI = { Hadir: 'H', Izin: 'I', Sakit: 'S', Alpa: 'A' };
const NAMA_PRESENSI = { H: 'Hadir', I: 'Izin', S: 'Sakit', A: 'Alpa' };
const _PM = {};
function presensiBulan_(ym) {
  if (_PM[ym]) return _PM[ym];
  const key = 'pm_' + ym + '_' + ver1_('pm_' + ym);
  let P = CacheX.get(key);
  if (!P) {
    P = { s: {}, n: 0 };
    const rows = DB.byTanggal('Presensi', ym + '-01', ym + '-31');
    rows.sort(function (a, b) { return String(a.Diubah_Pada).localeCompare(String(b.Diubah_Pada)); });
    const seen = {};
    rows.forEach(function (r) {
      const kode = KODE_PRESENSI[r.Status]; if (!kode || !r.ID_Santri) return;
      const dd = String(r.Tanggal).substring(8, 10), k = r.ID_Santri + dd;
      const rec = P.s[r.ID_Santri] || (P.s[r.ID_Santri] = { h: 0, i: 0, s: 0, a: 0, d: {} });
      if (seen[k]) { const lama = String(rec.d[dd]).charAt(0); rec[lama.toLowerCase()]--; }
      seen[k] = 1;
      rec[kode.toLowerCase()]++;
      rec.d[dd] = r.Keterangan ? kode + ':' + String(r.Keterangan).substring(0, 80) : kode;
    });
    P.n = rows.length;
    CacheX.put(key, P, 21600);
  }
  return (_PM[ym] = P);
}

/* ================================================================
 *  TARGET & CAPAIAN
 *  Target_Juz_atau_Surah: "Juz 28-30" | "Juz 29, 30" | "Surah 67-77" | "20 Halaman" | "150 Ayat" | "3 Juz"
 *  Target_Murojaah      : "40 Halaman" | "2 Juz"
 *  Periode              : "2026-11" | "2026-07..2026-12" | "SEMESTER"
 * ================================================================ */
function daftarAngka_(t) {
  const out = [];
  String(t || '').split(/[,;]/).forEach(function (p) {
    const m = p.trim().match(/^(\d+)\s*(?:[-–]|s\/d|sd)\s*(\d+)$/i);
    if (m) { let a = Number(m[1]), b = Number(m[2]); if (a > b) { const x = a; a = b; b = x; } for (let i = a; i <= b; i++) out.push(i); }
    else if (/^\d+$/.test(p.trim())) out.push(Number(p.trim()));
  });
  return out;
}
function parseTarget_(teks) {
  const t = String(teks || '').trim();
  let m;
  if ((m = t.match(/^juz\s+([\d,;\s\-–sd\/]+)$/i))) {
    const j = daftarAngka_(m[1]).filter(function (x) { return x >= 1 && x <= 30; });
    return j.length ? { jenis: 'juz', daftar: j, rentang: j.map(rentangJuz_), label: t } : null;
  }
  if ((m = t.match(/^surah\s+([\d,;\s\-–sd\/]+)$/i))) {
    const s = daftarAngka_(m[1]).filter(function (x) { return x >= 1 && x <= 114; });
    return s.length ? { jenis: 'surah', daftar: s, rentang: s.map(function (x) { return [gIdx_(x, 1), gIdx_(x, jumlahAyat_(x))]; }), label: t } : null;
  }
  if ((m = t.match(/^([\d.,]+)\s*(hal|halaman)\b/i))) return { jenis: 'halaman', nilai: Number(m[1].replace(',', '.')), label: t };
  if ((m = t.match(/^([\d.,]+)\s*juz$/i))) return { jenis: 'halaman', nilai: Number(m[1].replace(',', '.')) * HALAMAN_PER_JUZ, label: t };
  if ((m = t.match(/^([\d.,]+)\s*ayat$/i))) return { jenis: 'ayat', nilai: Number(m[1].replace(',', '.')), label: t };
  return null;
}
function parseVolume_(teks) {
  const t = String(teks || '').trim(); let m;
  if ((m = t.match(/^([\d.,]+)\s*(hal|halaman)\b/i))) return Number(m[1].replace(',', '.'));
  if ((m = t.match(/^([\d.,]+)\s*juz\b/i))) return Number(m[1].replace(',', '.')) * HALAMAN_PER_JUZ;
  if ((m = t.match(/^([\d.,]+)$/))) return Number(m[1].replace(',', '.'));
  return 0;
}
function periodeRentang_(p) {
  p = String(p || '').trim();
  if (/^semester$/i.test(p)) return [setting_('SEMESTER_MULAI'), setting_('SEMESTER_SELESAI')];
  const ymOk = function (x) { const b = Number(x.substring(5, 7)); return b >= 1 && b <= 12; };
  let m = p.match(/^(\d{4}-\d{2})$/);
  if (m) return ymOk(m[1]) ? [m[1] + '-01', akhirBulan_(m[1])] : null;
  m = p.match(/^(\d{4}-\d{2})\s*\.\.\s*(\d{4}-\d{2})$/);
  if (m) return ymOk(m[1]) && ymOk(m[2]) && m[1] <= m[2] ? [m[1] + '-01', akhirBulan_(m[2])] : null;
  m = p.match(/^(\d{4}-\d{2}-\d{2})\s*\.\.\s*(\d{4}-\d{2}-\d{2})$/);
  if (m) return tglValid_(m[1]) && tglValid_(m[2]) && m[1] <= m[2] ? [m[1], m[2]] : null;
  return null;
}
function akhirBulan_(ym) { const p = ym.split('-'); return fmt_(new Date(Number(p[0]), Number(p[1]), 0), 'yyyy-MM-dd'); }
function labelPeriode_(p) {
  const r = periodeRentang_(p); if (!r) return String(p);
  if (/^semester$/i.test(p)) return setting_('LABEL_PERIODE') || 'Semester';
  return r[0].substring(0, 7) === r[1].substring(0, 7) ? namaBulan_(r[0].substring(0, 7)) : namaBulan_(r[0].substring(0, 7)) + ' – ' + namaBulan_(r[1].substring(0, 7));
}

/** Target yang berlaku untuk santri pada tanggal tertentu (khusus santri > per tingkat). */
function targetSantri_(santri, tgl) {
  tgl = tgl || today_();
  const hq = idx_().halaqah[santri.ID_Halaqah] || {}, tingkat = String(hq.Tingkat || '').toLowerCase();
  let pilih = null, skor = -1;
  DB.all('Target').forEach(function (t) {
    const sasaran = String(t.Level_atau_ID_Santri || '').trim();
    const cocok = sasaran === santri.ID_Santri ? 2 : (sasaran.toLowerCase() === tingkat && tingkat ? 1 : (/^semua$/i.test(sasaran) ? 0.5 : -1));
    if (cocok < 0) return;
    const r = periodeRentang_(t.Periode); if (!r || tgl < r[0] || tgl > r[1]) return;
    if (cocok > skor) { skor = cocok; pilih = t; }
  });
  return pilih;
}

/** Hitung capaian target dari rekaman agregat. */
function capaian_(rec, t, tgl) {
  tgl = tgl || today_();
  const out = { ada: false };
  if (!t) return out;
  const p = parseTarget_(t.Target_Juz_atau_Surah), r = periodeRentang_(t.Periode);
  if (!p || !r) return { ada: false, label: t.Target_Juz_atau_Surah, galat: 'Format target tidak dikenali' };
  rec = rec || recKosong_();
  const bulan = []; let ym = r[0].substring(0, 7);
  while (ym <= r[1].substring(0, 7) && bulan.length < 24) { bulan.push(ym); ym = bulanGeser_(ym, 1); }
  const jumlah = function (idx) { return bulan.reduce(function (t2, b) { return t2 + (rec.mon[b] ? rec.mon[b][idx] : 0); }, 0); };
  let pct = 0, sisaHal = 0, totalHal = 0;
  if (p.rentang) {
    let total = 0, tercapai = 0, hTot = 0, hCap = 0;
    p.rentang.forEach(function (x) {
      total += x[1] - x[0] + 1; tercapai += cakupan_(rec.z, x[0], x[1]);
      hTot += halamanInterval_([x]); hCap += halamanInterval_(irisanInterval_(rec.z, [x]));
    });
    pct = total ? tercapai / total : 0; totalHal = hTot; sisaHal = Math.max(0, hTot - hCap);
  } else if (p.jenis === 'halaman') { const v = jumlah(1); pct = p.nilai ? v / p.nilai : 0; totalHal = p.nilai; sisaHal = Math.max(0, p.nilai - v); }
  else if (p.jenis === 'ayat') { const v = jumlah(6); pct = p.nilai ? v / p.nilai : 0; sisaHal = 0; }
  const durasi = selisihHari_(r[0], r[1]) + 1, lewat = Math.min(durasi, Math.max(0, selisihHari_(r[0], tgl) + 1));
  const harap = durasi ? lewat / durasi : 1;
  const mur = parseVolume_(t.Target_Murojaah), murVal = jumlah(2);
  return {
    ada: true, id: t.ID_Target, label: t.Target_Juz_atau_Surah, periode: t.Periode, periodeLabel: labelPeriode_(t.Periode),
    dari: r[0], sampai: r[1], pct: Math.min(1, Math.round(pct * 1000) / 1000), harap: Math.round(harap * 1000) / 1000,
    tertinggal: pct + 0.1 < harap, sisaHal: Math.round(sisaHal * 10) / 10, totalHal: Math.round(totalHal * 10) / 10,
    murojaah: t.Target_Murojaah || '', murPct: mur ? Math.min(1, Math.round(murVal / mur * 1000) / 1000) : null, murHal: Math.round(murVal * 10) / 10
  };
}

/* ================================================================
 *  MASTER DATA (FR-05 .. FR-09)
 * ================================================================ */
const ENTITAS = {
  santri: { sheet: 'Santri', key: 'ID_Santri' }, wali: { sheet: 'Wali', key: 'ID_Wali' },
  muhaffidz: { sheet: 'Muhaffidz', key: 'ID_Muhaffidz' }, halaqah: { sheet: 'Halaqah', key: 'ID_Halaqah' },
  target: { sheet: 'Target', key: 'ID_Target' }, riwayat: { sheet: 'RiwayatHalaqah', key: 'ID_Riwayat' }
};
const STATUS_SANTRI = ['Aktif', 'Cuti', 'Lulus', 'Nonaktif'];

function bersihkanBaris_(entitas, r) {
  const o = {}; Object.keys(r).forEach(function (k) { if (k !== '_row' && k !== 'PIN_Hash') o[k] = r[k]; });
  if (entitas === 'santri') o.punyaPin = !!r.PIN_Hash;
  return o;
}

function apiMasterList_(ctx, d) {
  const e = ENTITAS[d.entity];
  if (!e) return fail_('Entitas tidak dikenal.');
  const role = ctx.session.role, sc = scope_(ctx);
  if (role === PERAN.GURU && ['santri', 'halaqah', 'target'].indexOf(d.entity) === -1) return fail_('Data ini hanya untuk Mudir.', { code: 'FORBIDDEN' });
  let rows = DB.all(e.sheet);
  if (!sc.semua) {
    if (d.entity === 'santri') rows = rows.filter(function (r) { return sc.santri[r.ID_Santri]; });
    if (d.entity === 'halaqah') rows = rows.filter(function (r) { return sc.halaqah[r.ID_Halaqah]; });
  }
  return ok_(rows.map(function (r) { return bersihkanBaris_(d.entity, r); }));
}

function apiMasterSave_(ctx, d) {
  const ent = String(d.entity || ''), e = ENTITAS[ent];
  if (!e || ent === 'riwayat') return fail_('Entitas tidak dikenal.');
  const v = d.row || {}, now = nowIso_();
  const rows = DB.all(e.sheet, true);
  const lama = v[e.key] ? rows.filter(function (r) { return r[e.key] === v[e.key]; })[0] : null;
  if (v[e.key] && !lama) return fail_('Data tidak ditemukan (mungkin sudah dihapus).');
  const o = lama ? Object.assign({}, lama) : { Dibuat_Pada: now };
  let riwayat = null;
  if (ent === 'santri') {
    o.NIS = str_(v.NIS, 40); o.Nama = str_(v.Nama, 120); o.Jenis_Kelamin = /^p/i.test(v.Jenis_Kelamin) ? 'P' : 'L';
    o.Tanggal_Masuk = str_(v.Tanggal_Masuk, 10); o.Foto_URL = fotoUrl_(v.Foto_URL); o.Catatan = str_(v.Catatan, 500);
    o.Status = STATUS_SANTRI.indexOf(v.Status) > -1 ? v.Status : (o.Status || 'Aktif');
    if (!o.NIS) return fail_('NIS wajib diisi.');
    if (!o.Nama) return fail_('Nama santri wajib diisi.');
    if (o.Tanggal_Masuk && !tglValid_(o.Tanggal_Masuk)) return fail_('Format tanggal masuk harus yyyy-MM-dd.');
    if (rows.some(function (r) { return String(r.NIS) === o.NIS && r.ID_Santri !== o.ID_Santri; })) return fail_('NIS ' + o.NIS + ' sudah dipakai santri lain.');
    const hq = str_(v.ID_Halaqah, 20);
    if (hq && !idx_().halaqah[hq]) return fail_('Halaqah tidak valid.');
    if (lama && lama.ID_Halaqah !== hq) riwayat = { dari: lama.ID_Halaqah, ke: hq };
    o.ID_Halaqah = hq;
  } else if (ent === 'wali') {
    o.Nama = str_(v.Nama, 120); o.No_WA = hp08_(v.No_WA); o.Email = str_(v.Email, 120).toLowerCase(); o.ID_Santri = str_(v.ID_Santri, 20);
    o.Hubungan = ['Ayah', 'Ibu', 'Wali'].indexOf(v.Hubungan) > -1 ? v.Hubungan : 'Wali';
    if (!o.Nama) return fail_('Nama wali wajib diisi.');
    if (!hpValid_(o.No_WA)) return fail_('Nomor WhatsApp tidak valid (contoh: 081234567890).');
    if (o.Email && !emailValid_(o.Email)) return fail_('Format email tidak valid.');
    if (!idx_().santri[o.ID_Santri]) return fail_('Santri yang dihubungkan tidak valid.');
    if (rows.some(function (r) { return r.ID_Santri === o.ID_Santri && r.No_WA === o.No_WA && r.ID_Wali !== o.ID_Wali; })) return fail_('Wali dengan nomor ini sudah terhubung ke santri tersebut.');
    if (lama && lama.No_WA !== o.No_WA) { o.StatusWA = ''; o.CekWAAt = ''; }
  } else if (ent === 'muhaffidz') {
    o.Nama = str_(v.Nama, 120); o.Email_Google = str_(v.Email_Google, 120).toLowerCase(); o.No_WA = hp08_(v.No_WA);
    o.Peran = v.Peran === 'Mudir' ? 'Mudir' : 'Muhaffidz'; o.Status = v.Status === 'Nonaktif' ? 'Nonaktif' : 'Aktif'; o.Foto_URL = fotoUrl_(v.Foto_URL);
    if (!o.Nama) return fail_('Nama wajib diisi.');
    if (!emailValid_(o.Email_Google)) return fail_('Email Google tidak valid.');
    if (o.No_WA && !hpValid_(o.No_WA)) return fail_('Nomor WhatsApp tidak valid.');
    if (rows.some(function (r) { return String(r.Email_Google).toLowerCase() === o.Email_Google && r.ID_Muhaffidz !== o.ID_Muhaffidz; })) return fail_('Email sudah terdaftar.');
    if (lama && lama.Peran === 'Mudir' && o.Peran !== 'Mudir' || lama && lama.Peran === 'Mudir' && o.Status === 'Nonaktif') {
      const mudirLain = rows.filter(function (r) { return r.Peran === 'Mudir' && r.Status !== 'Nonaktif' && r.ID_Muhaffidz !== o.ID_Muhaffidz; });
      if (!mudirLain.length) return fail_('Minimal harus ada satu Mudir aktif.');
    }
    if (lama && (lama.Peran !== o.Peran || o.Status === 'Nonaktif')) revokeAll_(o.Email_Google);
  } else if (ent === 'halaqah') {
    o.Nama_Halaqah = str_(v.Nama_Halaqah, 120); o.ID_Muhaffidz = str_(v.ID_Muhaffidz, 20); o.Jadwal = str_(v.Jadwal, 200);
    o.Tingkat = str_(v.Tingkat, 60); o.Status = v.Status === 'Nonaktif' ? 'Nonaktif' : 'Aktif';
    if (!o.Nama_Halaqah) return fail_('Nama halaqah wajib diisi.');
    const g = idx_().staf[o.ID_Muhaffidz];
    if (!g || g.Status === 'Nonaktif') return fail_('Muhaffidz penanggung jawab tidak valid / nonaktif.');
    if (rows.some(function (r) { return String(r.Nama_Halaqah).toLowerCase() === o.Nama_Halaqah.toLowerCase() && r.ID_Halaqah !== o.ID_Halaqah; })) return fail_('Nama halaqah sudah dipakai.');
  } else if (ent === 'target') {
    o.Level_atau_ID_Santri = str_(v.Level_atau_ID_Santri, 60); o.Periode = str_(v.Periode, 40);
    o.Target_Juz_atau_Surah = str_(v.Target_Juz_atau_Surah, 120); o.Target_Murojaah = str_(v.Target_Murojaah, 60); o.Keterangan = str_(v.Keterangan, 300);
    if (!o.Level_atau_ID_Santri) return fail_('Sasaran target (tingkat atau ID santri) wajib diisi.');
    if (/^SNT-/i.test(o.Level_atau_ID_Santri) && !idx_().santri[o.Level_atau_ID_Santri]) return fail_('ID santri tidak ditemukan.');
    if (!periodeRentang_(o.Periode)) return fail_('Format periode: 2026-11, 2026-07..2026-12, atau SEMESTER.');
    if (!parseTarget_(o.Target_Juz_atau_Surah)) return fail_('Format target: "Juz 28-30", "Surah 67-77", "20 Halaman", atau "150 Ayat".');
    if (o.Target_Murojaah && !parseVolume_(o.Target_Murojaah)) return fail_('Format target murojaah: "40 Halaman" atau "2 Juz".');
  }
  o.Diubah_Pada = now;
  if (lama) DB.write(e.sheet, [o]);
  else { o[e.key] = reserveIds_(e.sheet, 1)[0]; DB.append(e.sheet, [o]); }
  if (riwayat) catatRiwayat_([{ id: o.ID_Santri, dari: riwayat.dari, ke: riwayat.ke }], str_(d.alasan, 200) || 'Ubah data santri', ctx);
  resetIdx_();
  const res = ok_(bersihkanBaris_(ent, o), lama ? 'Perubahan tersimpan.' : 'Data baru tersimpan.');
  res.auditEntitas = ent + ':' + o[e.key]; res.auditDetail = lama ? 'ubah' : 'tambah';
  return res;
}
function fotoUrl_(u) {
  u = str_(u, 400); if (!u) return '';
  const m = u.match(/\/d\/([A-Za-z0-9_-]{20,})/) || u.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w300';
  return /^https:\/\//.test(u) ? u : '';
}

/** FR-09: nonaktifkan (bukan hapus) agar riwayat tetap utuh. */
function apiMasterStatus_(ctx, d) {
  const e = ENTITAS[d.entity]; if (!e || ['santri', 'muhaffidz', 'halaqah'].indexOf(d.entity) === -1) return fail_('Entitas tidak mendukung status.');
  const st = String(d.status || '');
  const izin = d.entity === 'santri' ? STATUS_SANTRI : ['Aktif', 'Nonaktif'];
  if (izin.indexOf(st) === -1) return fail_('Status tidak valid.');
  const ids = [].concat(d.ids || d.id || []), rows = DB.all(e.sheet, true), ubah = [];
  rows.forEach(function (r) { if (ids.indexOf(r[e.key]) > -1 && r.Status !== st) { r.Status = st; r.Diubah_Pada = nowIso_(); ubah.push(r); } });
  if (d.entity === 'muhaffidz' && st === 'Nonaktif') {
    const sisa = rows.filter(function (r) { return r.Peran === 'Mudir' && r.Status !== 'Nonaktif'; });
    if (!sisa.length) return fail_('Minimal harus ada satu Mudir aktif.');
    ubah.forEach(function (r) { revokeAll_(String(r.Email_Google).toLowerCase()); });
  }
  if (ubah.length) DB.write(e.sheet, ubah);
  resetIdx_();
  const res = ok_({ diubah: ubah.length }, ubah.length + ' data diubah menjadi ' + st + '.');
  res.auditEntitas = d.entity; res.auditDetail = st + ': ' + ids.slice(0, 20).join(',');
  return res;
}

/** Hapus permanen hanya untuk relasi wali & target (bukan data riwayat). */
function apiMasterHapus_(ctx, d) {
  const e = ENTITAS[d.entity]; if (!e || ['wali', 'target'].indexOf(d.entity) === -1) return fail_('Data ini tidak boleh dihapus — gunakan nonaktifkan.');
  const ids = [].concat(d.ids || d.id || []), rows = DB.all(e.sheet, true).filter(function (r) { return ids.indexOf(r[e.key]) > -1; });
  if (!rows.length) return fail_('Data tidak ditemukan.');
  DB.hapus(e.sheet, rows.map(function (r) { return r._row; }));
  resetIdx_();
  const res = ok_({ dihapus: rows.length }, rows.length + ' data dihapus.');
  res.auditEntitas = d.entity; res.auditDetail = ids.join(',');
  return res;
}

/** FR-06: pindah halaqah dengan riwayat tercatat. */
function apiMasterPindah_(ctx, d) {
  const ke = str_(d.keHalaqah, 20), ids = [].concat(d.santriIds || []);
  if (!idx_().halaqah[ke]) return fail_('Halaqah tujuan tidak valid.');
  const rows = DB.all('Santri', true), ubah = [], riw = [];
  rows.forEach(function (r) { if (ids.indexOf(r.ID_Santri) > -1 && r.ID_Halaqah !== ke) { riw.push({ id: r.ID_Santri, dari: r.ID_Halaqah, ke: ke }); r.ID_Halaqah = ke; r.Diubah_Pada = nowIso_(); ubah.push(r); } });
  if (!ubah.length) return fail_('Tidak ada santri yang dipindahkan.');
  DB.write('Santri', ubah);
  catatRiwayat_(riw, str_(d.alasan, 200), ctx);
  resetIdx_();
  const res = ok_({ dipindah: ubah.length }, ubah.length + ' santri dipindahkan ke ' + idx_().halaqah[ke].Nama_Halaqah + '.');
  res.auditEntitas = 'Santri'; res.auditDetail = 'Pindah ' + ubah.length + ' santri → ' + ke;
  return res;
}
function catatRiwayat_(list, alasan, ctx) {
  if (!list.length) return;
  const ids = reserveIds_('RiwayatHalaqah', list.length), tgl = today_(), oleh = ctx.session.nama || ctx.session.email;
  DB.append('RiwayatHalaqah', list.map(function (x, i) { return { ID_Riwayat: ids[i], Tanggal: tgl, ID_Santri: x.id, Dari_Halaqah: x.dari || '-', Ke_Halaqah: x.ke || '-', Alasan: alasan || '', Oleh: oleh }; }));
}

/**
 * FR-07: impor santri + wali massal (dari Excel/CSV yang sudah diurai di browser).
 * commit=false → pratinjau & validasi saja (tidak menulis apa pun).
 */
function apiMasterImport_(ctx, d) {
  const rows = (d.rows || []).slice(0, 2000), commit = !!d.commit;
  if (!rows.length) return fail_('Tidak ada baris untuk diimpor.');
  const santri = DB.all('Santri', true), wali = DB.all('Wali', true), I = idx_();
  const byNis = {}; santri.forEach(function (s) { byNis[String(s.NIS)] = s; });
  const hqByNama = {}; Object.keys(I.halaqah).forEach(function (h) { hqByNama[String(I.halaqah[h].Nama_Halaqah).toLowerCase()] = h; hqByNama[h.toLowerCase()] = h; });
  const nisFile = {}, hasil = [];
  rows.forEach(function (r, i) {
    const x = { baris: i + 2, nis: str_(r.nis || r.NIS, 40), nama: str_(r.nama || r.Nama, 120), jk: /^p/i.test(r.jk || r.Jenis_Kelamin || '') ? 'P' : 'L',
      masuk: str_(r.tanggal_masuk || r.Tanggal_Masuk, 10), halaqah: str_(r.halaqah || r.Halaqah, 120), status: str_(r.status || 'Aktif', 20),
      namaWali: str_(r.nama_wali || r.Nama_Wali, 120), wa: hp08_(r.no_wa || r.No_WA || r.wa_wali), email: str_(r.email || r.email_wali, 120).toLowerCase(),
      hubungan: ['Ayah', 'Ibu', 'Wali'].indexOf(r.hubungan) > -1 ? r.hubungan : 'Wali', galat: [] };
    if (!x.nis) x.galat.push('NIS kosong');
    if (!x.nama) x.galat.push('Nama kosong');
    if (nisFile[x.nis]) x.galat.push('NIS ganda di file (baris ' + nisFile[x.nis] + ')');
    nisFile[x.nis] = x.baris;
    if (x.masuk && !tglValid_(x.masuk)) x.galat.push('Tanggal masuk harus yyyy-MM-dd');
    x.idHalaqah = x.halaqah ? hqByNama[x.halaqah.toLowerCase()] || '' : '';
    if (x.halaqah && !x.idHalaqah) x.galat.push('Halaqah "' + x.halaqah + '" tidak ditemukan');
    if (STATUS_SANTRI.indexOf(x.status) === -1) x.status = 'Aktif';
    if (x.namaWali || r.no_wa || r.No_WA) {
      if (!x.namaWali) x.galat.push('Nama wali kosong');
      if (!hpValid_(x.wa)) x.galat.push('No. WA wali tidak valid');
      if (x.email && !emailValid_(x.email)) x.galat.push('Email wali tidak valid');
    }
    x.aksi = x.galat.length ? 'galat' : (byNis[x.nis] ? 'perbarui' : 'baru');
    hasil.push(x);
  });
  const ringkas = { total: hasil.length, baru: 0, perbarui: 0, galat: 0 };
  hasil.forEach(function (x) { ringkas[x.aksi]++; });
  if (!commit) return ok_({ pratinjau: hasil.slice(0, 500), ringkas: ringkas });
  // --- commit (baris galat dilewati)
  const now = nowIso_(), baruS = [], ubahS = [], riw = [];
  const valid = hasil.filter(function (x) { return x.aksi !== 'galat'; });
  const idBaru = reserveIds_('Santri', valid.filter(function (x) { return x.aksi === 'baru'; }).length);
  let k = 0;
  valid.forEach(function (x) {
    let s = byNis[x.nis];
    if (s) {
      if (s.ID_Halaqah !== x.idHalaqah && x.idHalaqah) riw.push({ id: s.ID_Santri, dari: s.ID_Halaqah, ke: x.idHalaqah });
      s.Nama = x.nama; s.Jenis_Kelamin = x.jk; if (x.masuk) s.Tanggal_Masuk = x.masuk; if (x.idHalaqah) s.ID_Halaqah = x.idHalaqah;
      s.Status = x.status; s.Diubah_Pada = now; ubahS.push(s);
    } else {
      s = { ID_Santri: idBaru[k++], NIS: x.nis, Nama: x.nama, Jenis_Kelamin: x.jk, Tanggal_Masuk: x.masuk || today_(), ID_Halaqah: x.idHalaqah,
        PIN_Hash: '', Foto_URL: '', Status: x.status, Catatan: 'Impor ' + today_(), Dibuat_Pada: now, Diubah_Pada: now };
      baruS.push(s); byNis[x.nis] = s;
    }
    x.idSantri = s.ID_Santri;
  });
  if (ubahS.length) DB.write('Santri', ubahS);
  if (baruS.length) DB.append('Santri', baruS);
  if (riw.length) catatRiwayat_(riw, 'Impor massal', ctx);
  // wali
  const waliKey = {}; wali.forEach(function (w) { waliKey[w.ID_Santri + '|' + w.No_WA] = w; });
  const baruW = [], ubahW = [];
  valid.forEach(function (x) {
    if (!x.namaWali || !hpValid_(x.wa)) return;
    const w = waliKey[x.idSantri + '|' + x.wa];
    if (w) { if (w.Nama !== x.namaWali || (x.email && w.Email !== x.email) || w.Hubungan !== x.hubungan) { w.Nama = x.namaWali; if (x.email) w.Email = x.email; w.Hubungan = x.hubungan; w.Diubah_Pada = now; ubahW.push(w); } }
    else { const nw = { Nama: x.namaWali, No_WA: x.wa, Email: x.email, ID_Santri: x.idSantri, Hubungan: x.hubungan, StatusWA: '', CekWAAt: '', Dibuat_Pada: now, Diubah_Pada: now }; baruW.push(nw); waliKey[x.idSantri + '|' + x.wa] = nw; }
  });
  if (baruW.length) { const ids = reserveIds_('Wali', baruW.length); baruW.forEach(function (w, i) { w.ID_Wali = ids[i]; }); DB.append('Wali', baruW); }
  if (ubahW.length) DB.write('Wali', ubahW);
  resetIdx_();
  const res = ok_({ ringkas: ringkas, santriBaru: baruS.length, santriDiperbarui: ubahS.length, waliBaru: baruW.length, waliDiperbarui: ubahW.length },
    'Impor selesai: ' + baruS.length + ' santri baru, ' + ubahS.length + ' diperbarui, ' + baruW.length + ' wali baru.');
  res.auditEntitas = 'Impor'; res.auditDetail = JSON.stringify(ringkas);
  return res;
}

/** FR-04: buat / reset PIN wali (ditampilkan sekali untuk dicetak / dikirim). */
function apiMasterPin_(ctx, d) {
  const rows = DB.all('Santri', true);
  let target = rows.filter(function (r) { return r.Status !== 'Nonaktif'; });
  if (d.ids && d.ids.length) target = target.filter(function (r) { return d.ids.indexOf(r.ID_Santri) > -1; });
  else if (d.tanpaPin) target = target.filter(function (r) { return !r.PIN_Hash; });
  else return fail_('Pilih santri atau gunakan opsi "semua yang belum punya PIN".');
  target = target.slice(0, 300);
  if (!target.length) return fail_('Tidak ada santri yang perlu dibuatkan PIN.');
  const now = nowIso_(), out = [], I = idx_();
  target.forEach(function (r) {
    const pin = pinAcak_();
    r.PIN_Hash = hashPin_(pin, r.ID_Santri); r.Diubah_Pada = now;
    const w = I.waliBySantri[r.ID_Santri] || [];
    out.push({ id: r.ID_Santri, nis: r.NIS, nama: r.Nama, pin: pin, halaqah: (I.halaqah[r.ID_Halaqah] || {}).Nama_Halaqah || '', wali: w.map(function (x) { return x.Nama; }).join(', '), wa: w.map(function (x) { return x.No_WA; }).join(', ') });
  });
  DB.write('Santri', target);
  if (d.kirim) {
    const daftar = [];
    out.forEach(function (o) {
      (I.waliBySantri[o.id] || []).forEach(function (w) {
        daftar.push({ penerima: { nama: w.Nama, hp: w.No_WA, email: w.Email }, vars: { nama_santri: o.nama, nis: o.nis, pin: o.pin }, refId: o.id, idWali: w.ID_Wali });
      });
    });
    kirimNotifBatch_('PIN_WALI', daftar);
  }
  const res = ok_({ daftar: out }, out.length + ' PIN dibuat. Simpan/cetak sekarang — PIN tidak bisa ditampilkan ulang.');
  res.auditEntitas = 'PIN'; res.auditDetail = 'PIN dibuat untuk ' + out.length + ' santri' + (d.kirim ? ' (dikirim ke wali)' : '');
  return res;
}

/* ---------------- Hafalan awal (riwayat sebelum aplikasi / kartu fisik) ---------------- */
function apiHafalanAwalGet_(ctx, d) {
  wajibSantri_(ctx, d.santriId);
  const h = DB.all('HafalanAwal').filter(function (r) { return r.ID_Santri === d.santriId; })[0];
  const z = h ? teksKeInterval_(h.Ziyadah) : [], m = h ? teksKeInterval_(h.Mutqin) : [];
  const juz = [];
  for (let j = 1; j <= 30; j++) { const r = rentangJuz_(j), n = r[1] - r[0] + 1; juz.push({ juz: j, hafal: cakupan_(z, r[0], r[1]) / n, mutqin: cakupan_(m, r[0], r[1]) / n }); }
  return ok_({ santriId: d.santriId, juz: juz, ringkasan: h ? h.Ringkasan : '', catatan: h ? h.Catatan : '', sumber: h ? h.Sumber : '', total: h ? h.Total_Setoran : 0 });
}
function kurangiInterval_(list, buang) {
  let out = list;
  buang.forEach(function (b) {
    const n = [];
    out.forEach(function (x) { if (x[1] < b[0] || x[0] > b[1]) n.push(x); else { if (x[0] < b[0]) n.push([x[0], b[0] - 1]); if (x[1] > b[1]) n.push([b[1] + 1, x[1]]); } });
    out = n;
  });
  return gabungInterval_(out);
}
function apiHafalanAwalSimpan_(ctx, d) {
  wajibSantri_(ctx, d.santriId);
  const rows = DB.all('HafalanAwal', true), lama = rows.filter(function (r) { return r.ID_Santri === d.santriId; })[0];
  const hafal = (d.juzHafal || []).map(Number), mutqin = (d.juzMutqin || []).map(Number);
  let z = lama ? teksKeInterval_(lama.Ziyadah) : [], m = lama ? teksKeInterval_(lama.Mutqin) : [];
  const semua = []; for (let j = 1; j <= 30; j++) semua.push(j);
  z = kurangiInterval_(z, semua.filter(function (j) { return hafal.indexOf(j) === -1; }).map(rentangJuz_));
  m = kurangiInterval_(m, semua.filter(function (j) { return mutqin.indexOf(j) === -1; }).map(rentangJuz_));
  hafal.forEach(function (j) { if (j >= 1 && j <= 30) { const r = rentangJuz_(j); z = tambahInterval_(z, r[0], r[1]); } });
  mutqin.forEach(function (j) { if (j >= 1 && j <= 30) { const r = rentangJuz_(j); m = tambahInterval_(m, r[0], r[1]); z = tambahInterval_(z, r[0], r[1]); } });
  const o = lama || { ID_Santri: d.santriId, Total_Setoran: 0 };
  o.Ziyadah = intervalKeTeks_(z); o.Mutqin = intervalKeTeks_(irisanInterval_(m, z)); o.Ringkasan = ringkasInterval_(z);
  o.Sumber = lama && /arsip/i.test(lama.Sumber) ? 'Arsip + Manual' : 'Manual'; o.Catatan = str_(d.catatan, 300); o.Diubah_Pada = nowIso_();
  if (lama) DB.write('HafalanAwal', [o]); else DB.append('HafalanAwal', [o]);
  bumpAgg_();
  const res = ok_({ ringkasan: o.Ringkasan }, 'Hafalan awal tersimpan: ' + o.Ringkasan);
  res.auditEntitas = 'HafalanAwal:' + d.santriId; res.auditDetail = o.Ringkasan;
  return res;
}

/* ================================================================
 *  SETORAN
 * ================================================================ */
function nilai_(v) { if (v === '' || v === null || v === undefined) return ''; const n = Math.round(Number(v) * 10) / 10; return isNaN(n) ? NaN : n; }
function kunciSetoran_(r) { return [r.ID_Santri, String(r.Tanggal).substring(0, 10), r.Jenis, Number(r.Surah), Number(r.Ayat_Dari), Number(r.Ayat_Sampai)].join('|'); }

function enrichSetoran_(r, ctx) {
  const I = idx_(), s = I.santri[r.ID_Santri] || {}, h = I.halaqah[r.ID_Halaqah] || {}, g = I.staf[r.ID_Muhaffidz] || {};
  const T = r.Nilai_Tajwid, K = r.Nilai_Kelancaran, adaN = T !== '' && K !== '';
  const o = {
    id: r.ID_Setoran, tanggal: String(r.Tanggal).substring(0, 10), santriId: r.ID_Santri, santri: s.Nama || r.ID_Santri, nis: s.NIS || '', foto: s.Foto_URL || '',
    halaqahId: r.ID_Halaqah, halaqah: h.Nama_Halaqah || '', jenis: r.Jenis, juz: r.Juz, surah: r.Surah, namaSurah: r.Nama_Surah || namaSurah_(r.Surah),
    a1: r.Ayat_Dari, a2: r.Ayat_Sampai, vol: r.Jumlah_Baris_Halaman, tajwid: T, kelancaran: K, predT: predikat_(T), predK: predikat_(K),
    nilai: adaN ? Math.round((Number(T) + Number(K)) / 2 * 10) / 10 : '', catatan: r.Catatan, muhaffidzId: r.ID_Muhaffidz, muhaffidz: g.Nama || (r.ID_Muhaffidz === 'darurat' ? 'Akses Darurat' : ''),
    mhfFoto: g.Foto_URL || '', dibuat: r.Dibuat_Pada, diubah: r.Diubah_Pada
  };
  o.pred = predikat_(o.nilai);
  if (ctx && ctx.session) o.bisaEdit = bisaEditSetoran_(ctx, r);
  return o;
}
function bisaEditSetoran_(ctx, r) {
  if (ctx.session.role === PERAN.MUDIR) return true;
  if (ctx.session.role !== PERAN.GURU || !bolehSantri_(ctx, r.ID_Santri)) return false;
  const jam = num_(setting_('EDIT_JAM', '24'), 24), dibuat = new Date(String(r.Dibuat_Pada || '').replace(' ', 'T'));
  return !isNaN(dibuat.getTime()) && (Date.now() - dibuat.getTime()) <= jam * 3600e3;
}

function filterSetoran_(ctx, rows, d) {
  const sc = scope_(ctx), I = idx_(), q = String(d.q || '').toLowerCase().trim();
  return rows.filter(function (r) {
    if (!sc.semua && !sc.santri[r.ID_Santri]) return false;
    if (d.halaqah && r.ID_Halaqah !== d.halaqah) return false;
    if (d.santri && r.ID_Santri !== d.santri) return false;
    if (d.muhaffidz && r.ID_Muhaffidz !== d.muhaffidz) return false;
    if (d.jenis && String(r.Jenis).toLowerCase() !== String(d.jenis).toLowerCase()) return false;
    if (d.predikat) { const n = r.Nilai_Tajwid !== '' && r.Nilai_Kelancaran !== '' ? (Number(r.Nilai_Tajwid) + Number(r.Nilai_Kelancaran)) / 2 : ''; if (predikat_(n) !== d.predikat) return false; }
    if (q) {
      const s = I.santri[r.ID_Santri] || {};
      if ((String(s.Nama) + ' ' + s.NIS + ' ' + r.Nama_Surah + ' ' + r.ID_Setoran + ' ' + r.Catatan).toLowerCase().indexOf(q) === -1) return false;
    }
    return true;
  });
}
function rentangAman_(d, defHari) {
  const hari = today_();
  let dari = tglValid_(d.dari) ? d.dari : tambahHari_(hari, -(defHari || 0)), sampai = tglValid_(d.sampai) ? d.sampai : hari;
  if (dari > sampai) { const x = dari; dari = sampai; sampai = x; }
  if (selisihHari_(dari, sampai) > 400) dari = tambahHari_(sampai, -400);
  return [dari, sampai];
}

function apiSetoranList_(ctx, d) {
  const r = rentangAman_(d, 0);
  let rows = filterSetoran_(ctx, DB.byTanggal('Setoran', r[0], r[1]), Object.assign({}, d, { jenis: '' }));
  const hitung = { semua: rows.length, ziyadah: 0, murojaah: 0 };
  rows.forEach(function (x) { if (/^z/i.test(x.Jenis)) hitung.ziyadah++; else hitung.murojaah++; });
  if (d.jenis) rows = rows.filter(function (x) { return String(x.Jenis).toLowerCase() === String(d.jenis).toLowerCase(); });
  rows.sort(function (a, b) { return String(b.Tanggal).localeCompare(String(a.Tanggal)) || String(b.Dibuat_Pada).localeCompare(String(a.Dibuat_Pada)); });
  const per = Math.min(200, Math.max(10, num_(d.per, 50))), page = Math.max(0, num_(d.page, 0));
  return ok_({ dari: r[0], sampai: r[1], total: rows.length, hitung: hitung, page: page, per: per,
    rows: rows.slice(page * per, page * per + per).map(function (x) { return enrichSetoran_(x, ctx); }) });
}

function apiSetoranSave_(ctx, d) {
  const items = (d.items || []).slice(0, 80);
  if (!items.length) return fail_('Tidak ada setoran untuk disimpan.');
  const I = idx_(), now = nowIso_(), hariIni = today_(), mudir = ctx.session.role === PERAN.MUDIR;
  const tersimpan = [], dilewati = [], galat = [], baru = [];
  const kunciAda = {}, clientAda = {};
  DB.tail('Setoran', 2500).forEach(function (r) { kunciAda[kunciSetoran_(r)] = r.ID_Setoran; if (r.Client_ID) clientAda[r.Client_ID] = r.ID_Setoran; });
  items.forEach(function (it, i) {
    const cid = str_(it.clientId, 60), tolak = function (p) { galat.push({ clientId: cid, i: i, pesan: p }); };
    if (cid && clientAda[cid]) { tersimpan.push({ clientId: cid, id: clientAda[cid], ulang: true }); return; }
    const sid = str_(it.santriId, 20), s = I.santri[sid];
    if (!s) return tolak('Santri tidak ditemukan.');
    if (!bolehSantri_(ctx, sid)) return tolak(s.Nama + ' bukan santri binaan Anda.');
    if (s.Status === 'Nonaktif' || s.Status === 'Lulus') return tolak(s.Nama + ' berstatus ' + s.Status + '.');
    const tgl = str_(it.tanggal || hariIni, 10);
    if (!tglValid_(tgl)) return tolak('Tanggal tidak valid.');
    if (tgl > hariIni) return tolak('Tanggal tidak boleh di masa depan.');
    if (!mudir && selisihHari_(tgl, hariIni) > 31) return tolak('Muhaffidz hanya bisa mencatat setoran maksimal 31 hari ke belakang.');
    const jenisRaw = String(it.jenis || '');
    if (!/^(ziyadah|murojaah|muroja'ah)$/i.test(jenisRaw)) return tolak('Jenis harus Ziyadah atau Murojaah.');
    const jenis = /^z/i.test(jenisRaw) ? 'Ziyadah' : 'Murojaah';
    const surah = Number(it.surah), a1 = Number(it.ayatDari), a2 = Number(it.ayatSampai);
    const e = cekAyat_(surah, a1, a2); if (e) return tolak(e);
    const T = nilai_(it.tajwid), K = nilai_(it.kelancaran);
    if (T === '' || K === '') return tolak('Nilai tajwid dan kelancaran wajib diisi.');
    if (isNaN(T) || T < 0 || T > 100 || isNaN(K) || K < 0 || K > 100) return tolak('Nilai harus 0–100.');
    const row = { Tanggal: tgl, ID_Santri: sid, Jenis: jenis, Surah: surah, Ayat_Dari: a1, Ayat_Sampai: a2 };
    const k = kunciSetoran_(row);
    if (kunciAda[k]) { dilewati.push({ clientId: cid, id: kunciAda[k] === '*' ? '' : kunciAda[k], pesan: s.Nama + ': setoran identik sudah tercatat.' }); return; }
    kunciAda[k] = '*';
    const vol = it.volume !== undefined && it.volume !== '' && !isNaN(Number(it.volume)) ? Math.round(Number(it.volume) * 100) / 100 : halaman_(surah, a1, a2);
    baru.push(Object.assign(row, { ID_Setoran: '', ID_Halaqah: s.ID_Halaqah, Juz: juzOf_(surah, a1), Nama_Surah: namaSurah_(surah), Jumlah_Baris_Halaman: vol,
      Nilai_Tajwid: T, Nilai_Kelancaran: K, Catatan: str_(it.catatan, 1000), ID_Muhaffidz: ctx.session.id || (ctx.session.darurat ? 'darurat' : ''),
      Dibuat_Pada: now, Diubah_Pada: now, Client_ID: cid }));
  });
  if (baru.length) {
    const ids = reserveIds_('Setoran', baru.length);
    baru.forEach(function (b, i) { b.ID_Setoran = ids[i]; tersimpan.push({ clientId: b.Client_ID, id: b.ID_Setoran }); });
    DB.append('Setoran', baru);
    if (d.kirimWali !== false) antreNotifSetoran_(baru, ctx);
  }
  if (!baru.length && !tersimpan.length && galat.length) return fail_(galat[0].pesan, { data: { tersimpan: tersimpan, dilewati: dilewati, galat: galat } });
  const res = ok_({ tersimpan: tersimpan, dilewati: dilewati, galat: galat, rows: baru.map(function (b) { return enrichSetoran_(b, ctx); }) },
    baru.length + ' setoran tersimpan' + (dilewati.length ? ', ' + dilewati.length + ' duplikat dilewati' : '') + (galat.length ? ', ' + galat.length + ' gagal' : '') + '.');
  res.auditEntitas = 'Setoran'; res.auditDetail = baru.length + ' baru: ' + baru.slice(0, 12).map(function (b) { return b.ID_Setoran; }).join(',');
  return res;
}

function cariSetoran_(id) {
  const r = DB.byNilai('Setoran', 'ID_Setoran', (function () { const m = {}; m[id] = 1; return m; })(), 1)[0];
  if (!r) throw err_('Setoran ' + id + ' tidak ditemukan.');
  return r;
}

function apiSetoranUpdate_(ctx, d) {
  const r = cariSetoran_(str_(d.id, 20));
  if (!bolehSantri_(ctx, r.ID_Santri)) return fail_('Setoran ini di luar hak akses Anda.', { code: 'FORBIDDEN' });
  if (!bisaEditSetoran_(ctx, r)) return fail_('Batas waktu koreksi (' + setting_('EDIT_JAM', '24') + ' jam) sudah lewat. Hubungi Mudir.');
  const sebelum = kunciSetoran_(r) + '|T' + r.Nilai_Tajwid + '|K' + r.Nilai_Kelancaran;
  if (d.tanggal !== undefined) { if (!tglValid_(d.tanggal) || d.tanggal > today_()) return fail_('Tanggal tidak valid.'); r.Tanggal = d.tanggal; }
  if (d.jenis !== undefined) r.Jenis = /^z/i.test(d.jenis) ? 'Ziyadah' : 'Murojaah';
  const s = d.surah !== undefined ? Number(d.surah) : Number(r.Surah), a1 = d.ayatDari !== undefined ? Number(d.ayatDari) : Number(r.Ayat_Dari), a2 = d.ayatSampai !== undefined ? Number(d.ayatSampai) : Number(r.Ayat_Sampai);
  const e = cekAyat_(s, a1, a2); if (e) return fail_(e);
  const ayatBerubah = s !== Number(r.Surah) || a1 !== Number(r.Ayat_Dari) || a2 !== Number(r.Ayat_Sampai);
  r.Surah = s; r.Ayat_Dari = a1; r.Ayat_Sampai = a2; r.Juz = juzOf_(s, a1); r.Nama_Surah = namaSurah_(s);
  if (d.volume !== undefined && d.volume !== '') r.Jumlah_Baris_Halaman = Math.round(num_(d.volume) * 100) / 100;
  else if (ayatBerubah) r.Jumlah_Baris_Halaman = halaman_(s, a1, a2);
  if (d.tajwid !== undefined) { const T = nilai_(d.tajwid); if (T === '' || isNaN(T) || T < 0 || T > 100) return fail_('Nilai tajwid 0–100.'); r.Nilai_Tajwid = T; }
  if (d.kelancaran !== undefined) { const K = nilai_(d.kelancaran); if (K === '' || isNaN(K) || K < 0 || K > 100) return fail_('Nilai kelancaran 0–100.'); r.Nilai_Kelancaran = K; }
  if (d.catatan !== undefined) r.Catatan = str_(d.catatan, 1000);
  r.Diubah_Pada = nowIso_();
  DB.write('Setoran', [r]);
  bumpAgg_();
  const res = ok_(enrichSetoran_(r, ctx), 'Setoran diperbarui.');
  res.auditEntitas = 'Setoran:' + r.ID_Setoran; res.auditDetail = 'Sebelum ' + sebelum + ' → ' + kunciSetoran_(r) + '|T' + r.Nilai_Tajwid + '|K' + r.Nilai_Kelancaran;
  return res;
}

function apiSetoranHapus_(ctx, d) {
  const r = cariSetoran_(str_(d.id, 20));
  DB.hapus('Setoran', [r._row]);
  bumpAgg_();
  const res = ok_({ id: r.ID_Setoran }, 'Setoran ' + r.ID_Setoran + ' dihapus.');
  res.auditEntitas = 'Setoran:' + r.ID_Setoran; res.auditDetail = 'HAPUS ' + kunciSetoran_(r);
  return res;
}

/** FR-14: saran titik lanjut ziyadah & murojaah terakhir per santri. */
function apiSetoranSaran_(ctx, d) {
  const A = aggSetoran_(), out = {};
  [].concat(d.santriIds || []).slice(0, 200).forEach(function (id) {
    if (!bolehSantri_(ctx, id)) return;
    const rec = A.s[id];
    out[id] = saranLanjut_(rec);
  });
  return ok_(out);
}
function saranLanjut_(rec) {
  if (!rec || !rec.lz) return { z: null, m: rec && rec.lm ? { surah: rec.lm[0], dari: rec.lm[3], sampai: rec.lm[1], tgl: rec.lm[2] } : null, last: rec ? rec.last : '' };
  const s = rec.lz[0], a2 = rec.lz[1], n = jumlahAyat_(s);
  let lanjut;
  if (a2 < n) lanjut = { surah: s, ayatDari: a2 + 1 };
  else {
    const arah = rec.pz ? (s < rec.pz ? -1 : 1) : (s >= 78 ? -1 : 1);
    const ns = s + arah;
    lanjut = ns >= 1 && ns <= 114 ? { surah: ns, ayatDari: 1 } : null;
  }
  return { z: { surah: s, dari: rec.lz[3], sampai: a2, tgl: rec.lz[2] }, lanjut: lanjut,
    m: rec.lm ? { surah: rec.lm[0], dari: rec.lm[3], sampai: rec.lm[1], tgl: rec.lm[2] } : null, last: rec.last };
}

function apiSetoranKirimWali_(ctx, d) {
  const r = cariSetoran_(str_(d.id, 20));
  if (!bolehSantri_(ctx, r.ID_Santri)) return fail_('Di luar hak akses.', { code: 'FORBIDDEN' });
  const n = antreNotifSetoran_([r], ctx, true);
  if (!n) return fail_(waAktif_() || emailAktif_() ? 'Wali santri ini belum punya nomor WA / email valid.' : 'Notifikasi WA & Email sedang nonaktif. Aktifkan di menu Notifikasi.');
  const res = ok_({ antre: n }, 'Laporan setoran masuk antrean kirim ke wali (' + n + ' pesan).');
  res.auditEntitas = 'Setoran:' + r.ID_Setoran; res.auditDetail = 'Kirim ulang ke wali';
  return res;
}

function antreNotifSetoran_(rows, ctx, paksa) {
  const I = idx_(), daftar = [];
  rows.forEach(function (r) {
    const s = I.santri[r.ID_Santri] || {}, g = I.staf[r.ID_Muhaffidz] || {};
    (I.waliBySantri[r.ID_Santri] || []).forEach(function (w) {
      daftar.push({ penerima: { nama: w.Nama, hp: w.No_WA, email: w.Email }, idWali: w.ID_Wali, refId: r.ID_Setoran,
        vars: { nama_santri: s.Nama, jenis: r.Jenis, surah: r.Nama_Surah || namaSurah_(r.Surah), ayat: r.Ayat_Dari + '–' + r.Ayat_Sampai, juz: r.Juz,
          tajwid: r.Nilai_Tajwid + ' (' + predikat_(r.Nilai_Tajwid) + ')', kelancaran: r.Nilai_Kelancaran + ' (' + predikat_(r.Nilai_Kelancaran) + ')',
          catatan: r.Catatan || '-', muhaffidz: g.Nama || ctx.session.nama || 'Muhaffidz', tanggal: String(r.Tanggal).substring(0, 10) } });
    });
  });
  return kirimNotifBatch_('SETORAN_BARU', daftar, { paksa: !!paksa });
}

/* ================================================================
 *  PRESENSI (FR-10)
 * ================================================================ */
function apiPresensiGet_(ctx, d) {
  const hq = str_(d.halaqahId, 20), tgl = tglValid_(d.tanggal) ? d.tanggal : today_();
  if (!bolehHalaqah_(ctx, hq)) return fail_('Halaqah di luar hak akses Anda.', { code: 'FORBIDDEN' });
  const P = presensiBulan_(tgl.substring(0, 7)), dd = tgl.substring(8, 10), A = aggSetoran_();
  const rows = DB.all('Santri').filter(function (s) { return s.ID_Halaqah === hq && (s.Status === 'Aktif' || s.Status === 'Cuti'); })
    .sort(function (a, b) { return String(a.Nama).localeCompare(String(b.Nama)); })
    .map(function (s) {
      const v = P.s[s.ID_Santri] && P.s[s.ID_Santri].d[dd];
      const kode = v ? String(v).charAt(0) : '', ket = v && String(v).length > 2 ? String(v).substring(2) : '';
      const rec = A.s[s.ID_Santri];
      return { id: s.ID_Santri, nama: s.Nama, nis: s.NIS, foto: s.Foto_URL || '', status: kode ? NAMA_PRESENSI[kode] : '', keterangan: ket, statusSantri: s.Status,
        sudahSetor: !!(rec && rec.last === tgl) };
    });
  return ok_({ halaqahId: hq, tanggal: tgl, tercatat: rows.some(function (r) { return r.status; }), rows: rows });
}

function apiPresensiSave_(ctx, d) {
  const hq = str_(d.halaqahId, 20), tgl = str_(d.tanggal || today_(), 10), hariIni = today_();
  if (!bolehHalaqah_(ctx, hq)) return fail_('Halaqah di luar hak akses Anda.', { code: 'FORBIDDEN' });
  if (!tglValid_(tgl) || tgl > hariIni) return fail_('Tanggal tidak valid.');
  if (ctx.session.role !== PERAN.MUDIR && selisihHari_(tgl, hariIni) > 31) return fail_('Presensi hanya bisa dicatat maksimal 31 hari ke belakang.');
  const I = idx_(), now = nowIso_(), items = (d.items || []).slice(0, 300);
  const lama = {};
  DB.byTanggal('Presensi', tgl, tgl).forEach(function (r) { if (r.ID_Halaqah === hq) lama[r.ID_Santri] = r; });
  const baru = [], ubah = [], alpa = [];
  const hitung = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
  items.forEach(function (it) {
    const s = I.santri[it.santriId];
    if (!s || s.ID_Halaqah !== hq) return;
    const st = KODE_PRESENSI[it.status] ? it.status : 'Hadir', ket = str_(it.keterangan, 200);
    hitung[st]++;
    const r = lama[it.santriId];
    if (r) { if (r.Status !== st || r.Keterangan !== ket) { r.Status = st; r.Keterangan = ket; r.ID_Muhaffidz = ctx.session.id || 'darurat'; r.Diubah_Pada = now; ubah.push(r); if (st === 'Alpa') alpa.push(s); } }
    else { baru.push({ ID_Presensi: '', Tanggal: tgl, ID_Santri: s.ID_Santri, ID_Halaqah: hq, Status: st, Keterangan: ket, ID_Muhaffidz: ctx.session.id || 'darurat', Diubah_Pada: now }); if (st === 'Alpa') alpa.push(s); }
  });
  if (baru.length) { const ids = reserveIds_('Presensi', baru.length); baru.forEach(function (b, i) { b.ID_Presensi = ids[i]; }); DB.append('Presensi', baru); }
  if (ubah.length) DB.write('Presensi', ubah);
  bump_('pm_' + tgl.substring(0, 7)); delete _PM[tgl.substring(0, 7)];
  if (alpa.length) {
    const daftar = [];
    alpa.forEach(function (s) { (I.waliBySantri[s.ID_Santri] || []).forEach(function (w) { daftar.push({ penerima: { nama: w.Nama, hp: w.No_WA, email: w.Email }, idWali: w.ID_Wali, refId: s.ID_Santri, vars: { nama_santri: s.Nama, tanggal: tgl, halaqah: (I.halaqah[hq] || {}).Nama_Halaqah } }); }); });
    kirimNotifBatch_('PRESENSI_ALPA', daftar);
  }
  const res = ok_({ baru: baru.length, diubah: ubah.length, hitung: hitung }, 'Presensi tersimpan (' + hitung.Hadir + ' hadir, ' + hitung.Izin + ' izin, ' + hitung.Sakit + ' sakit, ' + hitung.Alpa + ' alpa).');
  res.auditEntitas = 'Presensi:' + hq + ':' + tgl; res.auditDetail = JSON.stringify(hitung);
  return res;
}

/* ===== Laporan.gs ===== */
/**
 * ================================================================
 *  MutqinSpace — Laporan.gs
 *  • Dashboard Mudir & Muhaffidz (FR-17, FR-18)
 *  • Profil capaian santri, peta 30 juz, portal wali (FR-19..FR-23)
 *  • Laporan tabel & grafik + ekspor PDF (FR-27..FR-29)
 *  • Rekap bulanan otomatis PDF ke Drive (FR-30), backup, pengingat
 *  • Pengaturan, log aktivitas, status sistem, arsip tahunan
 * ================================================================
 */

/* ================================================================
 *  DASHBOARD
 * ================================================================ */
function santriLingkup_(ctx, hqF, semuaStatus) {
  const sc = scope_(ctx);
  return DB.all('Santri').filter(function (s) {
    return (sc.semua || sc.santri[s.ID_Santri]) && (!hqF || s.ID_Halaqah === hqF) && (semuaStatus || s.Status === 'Aktif');
  });
}

/** Daftar santri yang perlu perhatian beserta alasannya. */
function hitungPerhatian_(santri, A, P, hari) {
  const minHari = num_(setting_('MIN_HARI_TANPA_SETORAN', '3'), 3), out = [];
  santri.forEach(function (s) {
    const rec = A.s[s.ID_Santri] || recKosong_(), t = capaian_(rec, targetSantri_(s, hari), hari), p = P.s[s.ID_Santri];
    const sejak = rec.last ? selisihHari_(rec.last, hari) : (s.Tanggal_Masuk && tglValid_(s.Tanggal_Masuk) ? selisihHari_(s.Tanggal_Masuk, hari) : 999);
    const alasan = []; let skor = 0;
    if (sejak >= minHari) { alasan.push(rec.last ? 'Tidak setor ' + sejak + ' hari' : 'Belum pernah setor'); skor += Math.min(30, sejak); }
    if (t.ada && t.tertinggal) { alasan.push('Target ' + Math.round(t.pct * 100) + '% dari harapan ' + Math.round(t.harap * 100) + '%'); skor += Math.round((t.harap - t.pct) * 100); }
    if (p && p.a >= 3) { alasan.push('Alpa ' + p.a + '× bulan ini'); skor += p.a * 3; }
    if (alasan.length) out.push({ id: s.ID_Santri, nama: s.Nama, nis: s.NIS, foto: s.Foto_URL || '', halaqahId: s.ID_Halaqah, alasan: alasan, skor: skor,
      pct: t.ada ? t.pct : null, last: rec.last || '' });
  });
  return out.sort(function (a, b) { return b.skor - a.skor; });
}

function apiDashRingkas_(ctx, d) {
  const A = aggSetoran_(), sc = scope_(ctx), I = idx_(), hari = today_(), ym = hari.substring(0, 7);
  const hqF = d.halaqah && bolehHalaqah_(ctx, d.halaqah) ? d.halaqah : '';
  const key = 'dash_' + (sc.semua ? 'all' : ctx.session.id) + '_' + hqF + '_' + hari + '_' + A.rows + '_' + vers_(['agg', 'master', 'pm_' + ym, 't_Target', 't_Pengaturan']).join('.');
  const hit = d._fresh ? null : CacheX.get(key);
  if (hit) { const r = ok_(hit); r.cached = true; return r; }

  const aktif = santriLingkup_(ctx, hqF), P = presensiBulan_(ym), bl = bulanGeser_(ym, -1);
  const k = { santriAktif: aktif.length, setoranBulan: 0, halZ: 0, halM: 0, halBulanLalu: 0, sudahSetor: 0, sumPct: 0, nTarget: 0, tertinggal: 0,
    h: 0, i: 0, s: 0, a: 0, sumNilai: 0, nNilai: 0 };
  aktif.forEach(function (s) {
    const rec = A.s[s.ID_Santri] || recKosong_(), M = rec.mon[ym], L = rec.mon[bl];
    if (M) { k.setoranBulan += M[0]; k.halZ += M[1]; k.halM += M[2]; k.sumNilai += M[3] + M[4]; k.nNilai += M[5] * 2; }
    if (L) k.halBulanLalu += L[1] + L[2];
    if (rec.last === hari) k.sudahSetor++;
    const t = capaian_(rec, targetSantri_(s, hari), hari);
    if (t.ada) { k.sumPct += t.pct; k.nTarget++; if (t.tertinggal) k.tertinggal++; }
    const p = P.s[s.ID_Santri]; if (p) { k.h += p.h; k.i += p.i; k.s += p.s; k.a += p.a; }
  });
  const hariKe = Number(hari.substring(8, 10)), hariBulan = Number(akhirBulan_(ym).substring(8, 10));
  const harapLalu = k.halBulanLalu * hariKe / hariBulan, halBulan = k.halZ + k.halM, totP = k.h + k.i + k.s + k.a;
  const kpi = {
    santriAktif: k.santriAktif, setoranBulan: k.setoranBulan, halamanBulan: Math.round(halBulan * 10) / 10, halZ: Math.round(k.halZ * 10) / 10, halM: Math.round(k.halM * 10) / 10,
    deltaBulan: harapLalu > 0 ? Math.round((halBulan - harapLalu) / harapLalu * 1000) / 10 : null,
    pencapaian: k.nTarget ? Math.round(k.sumPct / k.nTarget * 1000) / 10 : null, nTarget: k.nTarget, tertinggal: k.tertinggal,
    kehadiran: totP ? Math.round(k.h / totP * 1000) / 10 : null, presensi: { h: k.h, i: k.i, s: k.s, a: k.a },
    sudahSetor: k.sudahSetor, nilaiRata: k.nNilai ? Math.round(k.sumNilai / k.nNilai * 10) / 10 : null
  };
  kpi.predikatRata = predikat_(kpi.nilaiRata);

  // Tiga bulan terakhir: setoran tercatat dibanding kehadiran + muhaffidz aktif
  const mhfLingkup = {};
  Object.keys(I.halaqah).forEach(function (h) { const x = I.halaqah[h]; if ((sc.semua || sc.halaqah[h]) && (!hqF || h === hqF)) mhfLingkup[x.ID_Muhaffidz] = 1; });
  const bulan = [-2, -1, 0].map(function (n) {
    const m = bulanGeser_(ym, n), Pm = presensiBulan_(m);
    let hariSetor = 0, hariHadir = 0, adaSetor = 0;
    aktif.forEach(function (s) {
      const M = (A.s[s.ID_Santri] || recKosong_()).mon[m];
      if (M) { hariSetor += popcount_(M[7]); adaSetor++; }
      const p = Pm.s[s.ID_Santri]; if (p) hariHadir += p.h;
    });
    const pct = hariHadir ? Math.min(1, hariSetor / hariHadir) : (aktif.length ? adaSetor / aktif.length : 0);
    const mhf = Object.keys(A.g).filter(function (id) { return mhfLingkup[id] && A.g[id][m] && A.g[id][m][0] > 0; });
    return { ym: m, label: NAMA_BULAN[Number(m.substring(5, 7)) - 1], pct: Math.round(pct * 1000) / 10, dasar: hariHadir ? 'kehadiran' : 'santri', muhaffidz: mhf };
  });

  // Santri perlu perhatian dikelompokkan per halaqah
  const perhatian = hitungPerhatian_(aktif, A, P, hari), perHq = {};
  perhatian.forEach(function (x) { (perHq[x.halaqahId] = perHq[x.halaqahId] || []).push(x); });
  const grupPerhatian = Object.keys(perHq).map(function (h) {
    const hq = I.halaqah[h] || {}, g = I.staf[hq.ID_Muhaffidz] || {};
    return { id: h, nama: hq.Nama_Halaqah || 'Tanpa halaqah', muhaffidz: g.Nama || '-', jumlah: perHq[h].length, santri: perHq[h].slice(0, 8) };
  }).sort(function (a, b) { return b.jumlah - a.jumlah; });

  // Peringkat keaktifan input per muhaffidz (FR-17)
  const ranking = [];
  if (sc.semua) {
    DB.all('Muhaffidz').filter(function (u) { return u.Status !== 'Nonaktif'; }).forEach(function (u) {
      const hqs = Object.keys(I.halaqah).filter(function (h) { return I.halaqah[h].ID_Muhaffidz === u.ID_Muhaffidz && I.halaqah[h].Status !== 'Nonaktif'; });
      if (!hqs.length) return;
      const sn = DB.all('Santri').filter(function (s) { return s.Status === 'Aktif' && hqs.indexOf(s.ID_Halaqah) > -1; });
      const setor = sn.filter(function (s) { const r = A.s[s.ID_Santri]; return r && r.mon[ym]; }).length;
      const hariIni = sn.filter(function (s) { const r = A.s[s.ID_Santri]; return r && r.last === hari; }).length;
      const G = (A.g[u.ID_Muhaffidz] || {})[ym] || [0, 0];
      ranking.push({ id: u.ID_Muhaffidz, nama: u.Nama, foto: u.Foto_URL || '', halaqah: hqs.map(function (h) { return I.halaqah[h].Nama_Halaqah; }),
        santri: sn.length, santriSetor: setor, hariIni: hariIni, input: G[0], hariAktif: popcount_(G[1]), pct: sn.length ? Math.round(setor / sn.length * 1000) / 10 : 0 });
    });
    ranking.sort(function (a, b) { return b.pct - a.pct || b.input - a.input; });
  }

  // Ringkasan per halaqah
  const hqList = Object.keys(I.halaqah).filter(function (h) { return (sc.semua || sc.halaqah[h]) && I.halaqah[h].Status !== 'Nonaktif'; }).map(function (h) {
    const x = I.halaqah[h], sn = aktif.filter(function (s) { return s.ID_Halaqah === h; });
    let n = 0, nil = 0, hd = 0, tp = 0, sudah = 0, hal = 0;
    sn.forEach(function (s) {
      const r = A.s[s.ID_Santri], M = r && r.mon[ym];
      if (M) { nil += M[3] + M[4]; n += M[5] * 2; hal += M[1] + M[2]; }
      if (r && r.last === hari) sudah++;
      const p = P.s[s.ID_Santri]; if (p) { hd += p.h; tp += p.h + p.i + p.s + p.a; }
    });
    return { id: h, nama: x.Nama_Halaqah, muhaffidz: x.ID_Muhaffidz, tingkat: x.Tingkat, jadwal: x.Jadwal, santri: sn.length, sudahSetor: sudah,
      nilai: n ? Math.round(nil / n * 10) / 10 : null, kehadiran: tp ? Math.round(hd / tp * 1000) / 10 : null, halaman: Math.round(hal * 10) / 10,
      perhatian: (perHq[h] || []).length };
  });

  const belumSetor = aktif.filter(function (s) { const r = A.s[s.ID_Santri]; return !(r && r.last === hari); })
    .map(function (s) { const r = A.s[s.ID_Santri]; return { id: s.ID_Santri, nama: s.Nama, foto: s.Foto_URL || '', halaqahId: s.ID_Halaqah, last: r ? r.last : '' }; });

  const out = { hari: hari, ym: ym, bulanLabel: namaBulan_(ym), halaqahFilter: hqF, kpi: kpi, bulan: bulan,
    perhatian: { total: perhatian.length, grup: grupPerhatian, santri: perhatian.slice(0, 40) }, ranking: ranking, halaqah: hqList,
    belumSetor: belumSetor.slice(0, 100), jumlahBelumSetor: belumSetor.length, aggAt: A.at };
  CacheX.put(key, out, 900);
  return ok_(out);
}

/** "Kirim Pengingat Wali" — antre pesan pengingat ke wali santri yang perlu perhatian. */
function apiPengingatWali_(ctx, d) {
  const I = idx_(), ids = [].concat(d.santriIds || []).filter(function (id) { return bolehSantri_(ctx, id); }).slice(0, 500);
  if (!ids.length) return fail_('Tidak ada santri yang dipilih.');
  const A = aggSetoran_(), hari = today_(), daftar = [];
  ids.forEach(function (id) {
    const s = I.santri[id], rec = A.s[id] || recKosong_(), t = capaian_(rec, targetSantri_(s, hari), hari);
    (I.waliBySantri[id] || []).forEach(function (w) {
      daftar.push({ penerima: { nama: w.Nama, hp: w.No_WA, email: w.Email }, idWali: w.ID_Wali, refId: id,
        vars: { nama_santri: s.Nama, terakhir: rec.last ? rec.last : 'belum ada', capaian: t.ada ? Math.round(t.pct * 100) + '% dari ' + t.label : '-',
          halaqah: (I.halaqah[s.ID_Halaqah] || {}).Nama_Halaqah || '' } });
    });
  });
  const n = kirimNotifBatch_('PENGINGAT_WALI', daftar, { paksa: true });
  if (!n) return fail_(waAktif_() || emailAktif_() ? 'Wali santri terpilih belum punya nomor WA / email valid.' : 'Notifikasi WA & Email nonaktif. Aktifkan di menu Notifikasi.');
  const res = ok_({ antre: n }, n + ' pengingat masuk antrean kirim.');
  res.auditEntitas = 'Pengingat'; res.auditDetail = ids.length + ' santri';
  return res;
}

/* ================================================================
 *  PROFIL SANTRI & PORTAL WALI
 * ================================================================ */
function petaHafalan_(rec) {
  const out = [];
  for (let j = 1; j <= 30; j++) {
    const r = rentangJuz_(j), n = r[1] - r[0] + 1, hz = cakupan_(rec.z, r[0], r[1]) / n, mq = cakupan_(irisanInterval_(rec.m, rec.z), r[0], r[1]) / n;
    out.push({ juz: j, label: labelJuz_(j), hafal: Math.round(hz * 1000) / 1000, mutqin: Math.round(mq * 1000) / 1000,
      status: mq >= 0.999 ? 'mutqin' : hz > 0 ? 'sedang' : 'belum' });
  }
  return out;
}

function riwayatSantri_(id, n, rec) {
  const key = 'riw_' + id + '_' + (rec ? rec.r + '_' + rec.n : '0') + '_' + ver1_('agg') + '_' + n;
  const hit = CacheX.get(key); if (hit) return hit;
  const m = {}; m[id] = 1;
  const rows = DB.byNilai('Setoran', 'ID_Santri', m, n).sort(function (a, b) {
    return String(b.Tanggal).localeCompare(String(a.Tanggal)) || String(b.Dibuat_Pada).localeCompare(String(a.Dibuat_Pada));
  });
  CacheX.put(key, rows, 21600);
  return rows;
}

function apiSantriProfil_(ctx, d) {
  const id = d.santriId || ctx.session.sid, s = wajibSantri_(ctx, id), I = idx_(), A = aggSetoran_(), hari = today_(), ym = hari.substring(0, 7);
  const rec = A.s[id] || recKosong_(), hq = I.halaqah[s.ID_Halaqah] || {}, g = I.staf[hq.ID_Muhaffidz] || {}, staf = ctx.session.role === PERAN.MUDIR || ctx.session.role === PERAN.GURU;
  const t = capaian_(rec, targetSantri_(s, hari), hari);
  const peta = petaHafalan_(rec);
  const bulanan = [];
  for (let n = -5; n <= 0; n++) {
    const m = bulanGeser_(ym, n), M = rec.mon[m];
    bulanan.push({ ym: m, label: NAMA_BULAN[Number(m.substring(5, 7)) - 1].substring(0, 3), setoran: M ? M[0] : 0, halZ: M ? Math.round(M[1] * 10) / 10 : 0,
      halM: M ? Math.round(M[2] * 10) / 10 : 0, tajwid: M && M[5] ? Math.round(M[3] / M[5] * 10) / 10 : null, kelancaran: M && M[5] ? Math.round(M[4] / M[5] * 10) / 10 : null,
      hariSetor: M ? popcount_(M[7]) : 0 });
  }
  let sT = 0, sK = 0, nN = 0;
  bulanan.forEach(function (b) { const M = rec.mon[b.ym]; if (M) { sT += M[3]; sK += M[4]; nN += M[5]; } });
  const sur = Object.keys(rec.sur).map(function (k) { const x = rec.sur[k]; return { surah: Number(k), nama: namaSurah_(k), n: x[0], k: x[2] ? Math.round(x[1] / x[2] * 10) / 10 : null }; })
    .filter(function (x) { return x.k !== null; });
  const lemah = sur.slice().sort(function (a, b) { return a.k - b.k; }).filter(function (x) { return x.k < 85; }).slice(0, 4);
  const kuat = sur.slice().sort(function (a, b) { return b.k - a.k || b.n - a.n; }).slice(0, 4);
  // kehadiran 30 hari & ringkas bulan
  const P0 = presensiBulan_(ym), P1 = presensiBulan_(bulanGeser_(ym, -1)), titik = [];
  for (let i = 29; i >= 0; i--) {
    const tg = tambahHari_(hari, -i), P = tg.substring(0, 7) === ym ? P0 : P1, v = P.s[id] && P.s[id].d[tg.substring(8, 10)];
    titik.push({ t: tg, st: v ? String(v).charAt(0) : '' });
  }
  const pb = P0.s[id] || { h: 0, i: 0, s: 0, a: 0 }, tp = pb.h + pb.i + pb.s + pb.a;
  const hit30 = { h: 0, i: 0, s: 0, a: 0 }; titik.forEach(function (x) { if (x.st) hit30[x.st.toLowerCase()]++; });
  const tot30 = hit30.h + hit30.i + hit30.s + hit30.a;
  const riw = riwayatSantri_(id, 30, rec).map(function (r) { return enrichSetoran_(r, ctx); });
  const halHafal = halamanInterval_(rec.z), halMutqin = halamanInterval_(irisanInterval_(rec.m, rec.z));
  const out = {
    santri: { id: id, nis: s.NIS, nama: s.Nama, jk: s.Jenis_Kelamin, foto: s.Foto_URL || '', status: s.Status, masuk: s.Tanggal_Masuk },
    halaqah: { id: hq.ID_Halaqah || '', nama: hq.Nama_Halaqah || '-', jadwal: hq.Jadwal || '', tingkat: hq.Tingkat || '' },
    muhaffidz: { id: g.ID_Muhaffidz || '', nama: g.Nama || '-', foto: g.Foto_URL || '',
      wa: (staf || setting_('TAMPILKAN_WA_GURU') === 'YA') && g.No_WA ? hp62_(g.No_WA) : '' },
    hafalan: { juz: Math.round(halHafal / HALAMAN_PER_JUZ * 10) / 10, mutqinJuz: Math.round(halMutqin / HALAMAN_PER_JUZ * 10) / 10, halaman: Math.round(halHafal * 10) / 10,
      ringkas: ringkasInterval_(rec.z), totalSetoran: rec.n, terakhir: rec.last, saran: saranLanjut_(rec) },
    target: t, peta: peta, bulanan: bulanan,
    nilai: { tajwid: nN ? Math.round(sT / nN * 10) / 10 : null, kelancaran: nN ? Math.round(sK / nN * 10) / 10 : null },
    surah: { lemah: lemah, kuat: kuat },
    kehadiran: { titik: titik, bulanIni: { h: pb.h, i: pb.i, s: pb.s, a: pb.a, pct: tp ? Math.round(pb.h / tp * 1000) / 10 : null },
      hari30: { h: hit30.h, i: hit30.i, s: hit30.s, a: hit30.a, pct: tot30 ? Math.round(hit30.h / tot30 * 1000) / 10 : null } },
    riwayat: riw
  };
  out.nilai.predikat = predikat_(out.nilai.kelancaran);
  if (staf) out.wali = (I.waliBySantri[id] || []).map(function (w) { return { id: w.ID_Wali, nama: w.Nama, hubungan: w.Hubungan, wa: w.No_WA, email: w.Email, statusWA: w.StatusWA }; });
  if (ctx.session.role === PERAN.WALI) {
    out.anak = anakWali_(ctx.session.sid).map(function (x) { const sn = I.santri[x]; return { id: x, nama: sn.Nama, foto: sn.Foto_URL || '', halaqah: (I.halaqah[sn.ID_Halaqah] || {}).Nama_Halaqah || '' }; });
  }
  return ok_(out);
}

function apiSantriRiwayat_(ctx, d) {
  const id = d.santriId || ctx.session.sid; wajibSantri_(ctx, id);
  const page = Math.max(0, num_(d.page, 0)), per = 30, rec = aggSetoran_().s[id];
  const rows = riwayatSantri_(id, per * (page + 1), rec);
  return ok_({ page: page, rows: rows.slice(page * per, page * per + per).map(function (r) { return enrichSetoran_(r, ctx); }), lagi: rows.length >= per * (page + 1) });
}

/* ================================================================
 *  LAPORAN TABEL & GRAFIK (FR-27..FR-29)
 * ================================================================ */
const KOLOM_LAPORAN = {
  setoran: [['tanggal', 'Tanggal'], ['nis', 'NIS'], ['santri', 'Santri'], ['halaqah', 'Halaqah'], ['jenis', 'Jenis'], ['juz', 'Juz'], ['namaSurah', 'Surah'],
    ['ayat', 'Ayat'], ['vol', 'Halaman'], ['tajwid', 'Tajwid'], ['kelancaran', 'Kelancaran'], ['pred', 'Predikat'], ['muhaffidz', 'Muhaffidz'], ['catatan', 'Catatan']],
  presensi: [['tanggal', 'Tanggal'], ['nis', 'NIS'], ['santri', 'Santri'], ['halaqah', 'Halaqah'], ['status', 'Status'], ['keterangan', 'Keterangan'], ['muhaffidz', 'Dicatat oleh']],
  target: [['nis', 'NIS'], ['santri', 'Santri'], ['halaqah', 'Halaqah'], ['target', 'Target'], ['periode', 'Periode'], ['capaian', 'Capaian %'], ['harapan', 'Harapan %'],
    ['status', 'Status'], ['murojaah', 'Murojaah %'], ['hafalan', 'Total Hafalan (Juz)'], ['terakhir', 'Setoran Terakhir']]
};

function dataLaporan_(ctx, d) {
  const jenis = KOLOM_LAPORAN[d.jenis] ? d.jenis : 'setoran', I = idx_(), sc = scope_(ctx), q = String(d.q || '').toLowerCase().trim();
  let rows = [], ringkas = {}, rg = null;
  if (jenis === 'setoran') {
    rg = rentangAman_(d, 30);
    rows = filterSetoran_(ctx, DB.byTanggal('Setoran', rg[0], rg[1]), { halaqah: d.halaqah, santri: d.santri, muhaffidz: d.muhaffidz, jenis: d.jenisSetoran, q: d.q, predikat: d.predikat })
      .map(function (r) { const o = enrichSetoran_(r); o.ayat = o.a1 + '–' + o.a2; return o; });
    ringkas = { setoran: rows.length, halaman: Math.round(rows.reduce(function (t, r) { return t + num_(r.vol); }, 0) * 10) / 10 };
  } else if (jenis === 'presensi') {
    rg = rentangAman_(d, 30);
    rows = DB.byTanggal('Presensi', rg[0], rg[1]).filter(function (r) {
      if (!sc.semua && !sc.santri[r.ID_Santri]) return false;
      if (d.halaqah && r.ID_Halaqah !== d.halaqah) return false;
      if (d.santri && r.ID_Santri !== d.santri) return false;
      if (d.status && r.Status !== d.status) return false;
      if (d.muhaffidz && r.ID_Muhaffidz !== d.muhaffidz) return false;
      return true;
    }).map(function (r) {
      const s = I.santri[r.ID_Santri] || {}, g = I.staf[r.ID_Muhaffidz] || {};
      return { id: r.ID_Presensi, tanggal: String(r.Tanggal).substring(0, 10), nis: s.NIS || '', santri: s.Nama || r.ID_Santri, santriId: r.ID_Santri,
        halaqah: (I.halaqah[r.ID_Halaqah] || {}).Nama_Halaqah || '', status: r.Status, keterangan: r.Keterangan, muhaffidz: g.Nama || '' };
    }).filter(function (r) { return !q || (r.santri + ' ' + r.nis + ' ' + r.keterangan).toLowerCase().indexOf(q) > -1; });
    ringkas = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 }; rows.forEach(function (r) { ringkas[r.status] = (ringkas[r.status] || 0) + 1; });
  } else {
    const A = aggSetoran_(), hari = today_();
    rows = santriLingkup_(ctx, d.halaqah).filter(function (s) { return !d.santri || s.ID_Santri === d.santri; }).map(function (s) {
      const rec = A.s[s.ID_Santri] || recKosong_(), t = capaian_(rec, targetSantri_(s, hari), hari);
      return { santriId: s.ID_Santri, nis: s.NIS, santri: s.Nama, halaqah: (I.halaqah[s.ID_Halaqah] || {}).Nama_Halaqah || '', target: t.ada ? t.label : '-',
        periode: t.ada ? t.periodeLabel : '-', capaian: t.ada ? Math.round(t.pct * 1000) / 10 : '', harapan: t.ada ? Math.round(t.harap * 1000) / 10 : '',
        status: !t.ada ? 'Tanpa target' : t.pct >= 1 ? 'Tercapai' : t.tertinggal ? 'Tertinggal' : 'Sesuai jalur',
        murojaah: t.ada && t.murPct !== null ? Math.round(t.murPct * 1000) / 10 : '', hafalan: Math.round(halamanInterval_(rec.z) / HALAMAN_PER_JUZ * 10) / 10, terakhir: rec.last || '-' };
    }).filter(function (r) { return (!d.status || r.status === d.status) && (!q || (r.santri + ' ' + r.nis).toLowerCase().indexOf(q) > -1); });
    ringkas = { Tercapai: 0, 'Sesuai jalur': 0, Tertinggal: 0, 'Tanpa target': 0 }; rows.forEach(function (r) { ringkas[r.status]++; });
  }
  const sk = d.sort && d.sort.k, arah = d.sort && d.sort.arah === 'asc' ? 1 : -1;
  if (sk) rows.sort(function (a, b) { const x = a[sk], y = b[sk]; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * arah; });
  return { jenis: jenis, kolom: KOLOM_LAPORAN[jenis].map(function (k) { return { k: k[0], label: k[1] }; }), rows: rows, ringkas: ringkas, dari: rg ? rg[0] : '', sampai: rg ? rg[1] : '' };
}

function apiLaporanTabel_(ctx, d) {
  const L = dataLaporan_(ctx, d), per = Math.min(500, Math.max(10, num_(d.per, 25))), page = Math.max(0, num_(d.page, 0));
  const total = L.rows.length;
  L.total = total; L.page = page; L.per = per;
  L.rows = d.semua ? L.rows.slice(0, 20000) : L.rows.slice(page * per, page * per + per);
  return ok_(L);
}

function apiLaporanGrafik_(ctx, d) {
  const A = aggSetoran_(), I = idx_(), hari = today_(), ym = hari.substring(0, 7), hqF = d.halaqah && bolehHalaqah_(ctx, d.halaqah) ? d.halaqah : '';
  const n = Math.min(12, Math.max(3, num_(d.bulan, 6))), aktif = santriLingkup_(ctx, hqF);
  const bulan = [];
  for (let i = -(n - 1); i <= 0; i++) bulan.push(bulanGeser_(ym, i));
  const capaian = bulan.map(function (m) {
    let z = 0, mu = 0, sT = 0, sK = 0, nn = 0, c = 0;
    aktif.forEach(function (s) { const M = (A.s[s.ID_Santri] || recKosong_()).mon[m]; if (M) { c += M[0]; z += M[1]; mu += M[2]; sT += M[3]; sK += M[4]; nn += M[5]; } });
    return { ym: m, label: NAMA_BULAN[Number(m.substring(5, 7)) - 1].substring(0, 3), setoran: c, ziyadah: Math.round(z * 10) / 10, murojaah: Math.round(mu * 10) / 10,
      juz: Math.round(z / HALAMAN_PER_JUZ * 100) / 100, tajwid: nn ? Math.round(sT / nn * 10) / 10 : null, kelancaran: nn ? Math.round(sK / nn * 10) / 10 : null };
  });
  const P = presensiBulan_(ym), dist = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
  aktif.forEach(function (s) { const p = P.s[s.ID_Santri]; if (p) { dist.Hadir += p.h; dist.Izin += p.i; dist.Sakit += p.s; dist.Alpa += p.a; } });
  const perHalaqah = Object.keys(I.halaqah).filter(function (h) { return bolehHalaqah_(ctx, h) && I.halaqah[h].Status !== 'Nonaktif' && (!hqF || h === hqF); }).map(function (h) {
    const sn = aktif.filter(function (s) { return s.ID_Santri && s.ID_Halaqah === h; });
    let hal = 0, nil = 0, nn = 0, hd = 0, tp = 0;
    sn.forEach(function (s) { const M = (A.s[s.ID_Santri] || recKosong_()).mon[ym]; if (M) { hal += M[1] + M[2]; nil += M[3] + M[4]; nn += M[5] * 2; } const p = P.s[s.ID_Santri]; if (p) { hd += p.h; tp += p.h + p.i + p.s + p.a; } });
    return { id: h, nama: I.halaqah[h].Nama_Halaqah, santri: sn.length, halPerSantri: sn.length ? Math.round(hal / sn.length * 10) / 10 : 0, nilai: nn ? Math.round(nil / nn * 10) / 10 : null, kehadiran: tp ? Math.round(hd / tp * 1000) / 10 : null };
  });
  const bucket = [['< 1 Juz', 0, 1], ['1–3 Juz', 1, 3], ['3–5 Juz', 3, 5], ['5–10 Juz', 5, 10], ['10–20 Juz', 10, 20], ['20–30 Juz', 20, 31]].map(function (b) { return { label: b[0], lo: b[1], hi: b[2], n: 0 }; });
  aktif.forEach(function (s) { const j = halamanInterval_((A.s[s.ID_Santri] || recKosong_()).z) / HALAMAN_PER_JUZ; for (let i = 0; i < bucket.length; i++) if (j >= bucket[i].lo && j < bucket[i].hi) { bucket[i].n++; break; } });
  return ok_({ capaian: capaian, kehadiran: dist, perHalaqah: perHalaqah, sebaranHafalan: bucket, santri: aktif.length });
}

/* ================================================================
 *  PDF (HTML → PDF di server, dikirim base64 — wali tidak butuh akses Drive)
 * ================================================================ */
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function htmlKePdf_(html, nama) {
  const blob = Utilities.newBlob(html, 'text/html', nama.replace(/\.pdf$/, '') + '.html').getAs('application/pdf').setName(nama);
  return blob;
}
const CSS_PDF = 'body{font-family:Arial,Helvetica,sans-serif;color:#161616;font-size:10.5px;margin:0}' +
  '.kop{background:#262626;color:#F5F5F5;padding:14px 18px}.kop b{color:#D8F43C;font-size:16px}.kop small{color:#cfcfcf}' +
  'h2{font-size:15px;margin:14px 0 6px}h3{font-size:12px;margin:12px 0 6px;color:#262626}' +
  'table{border-collapse:collapse;width:100%}th{background:#E8F0FF;text-align:left;padding:5px;border:1px solid #d7dce6;font-size:10px}' +
  'td{padding:4px 5px;border:1px solid #e3e6ee;vertical-align:top}.k td{border:none;padding:2px 6px 2px 0}' +
  '.kpi td{background:#EEF2F8;border:2px solid #fff;padding:8px}.kpi b{font-size:16px}.muted{color:#6B7280}' +
  '.bar{background:#e5e7eb;height:8px;width:100%}.fill{background:#C2DF28;height:8px}.juz td{text-align:center;font-size:9px;padding:4px 2px}' +
  '.mutqin{background:#D8F43C}.sedang{background:#F1F9C4}.belum{background:#F3F4F6;color:#9CA3AF}.foot{margin-top:16px;font-size:9px;color:#6B7280}';
function kopPdf_(judul, sub) {
  return '<div class="kop"><b>' + esc_(setting_('NAMA_LEMBAGA')) + '</b><br><span>' + esc_(judul) + '</span><br><small>' + esc_(sub || '') + '</small></div><div style="padding:6px 18px">';
}

function apiLaporanPdf_(ctx, d) {
  const L = dataLaporan_(ctx, d), rows = L.rows.slice(0, 2500);
  const judul = { setoran: 'Laporan Setoran Hafalan', presensi: 'Laporan Presensi Halaqah', target: 'Laporan Capaian Target' }[L.jenis];
  let h = '<html><head><meta charset="utf-8"><style>' + CSS_PDF + '</style></head><body>' + kopPdf_(judul, (L.dari ? 'Periode ' + L.dari + ' s/d ' + L.sampai + ' • ' : '') + 'Dicetak ' + nowIso_().replace('T', ' '));
  h += '<p class="muted">Ringkasan: ' + Object.keys(L.ringkas).map(function (k) { return esc_(k) + ' ' + esc_(L.ringkas[k]); }).join(' • ') + ' • ' + L.rows.length + ' baris' + (L.rows.length > rows.length ? ' (PDF memuat 2.500 baris pertama; gunakan Excel untuk data lengkap)' : '') + '</p>';
  h += '<table><tr>' + L.kolom.map(function (k) { return '<th>' + esc_(k.label) + '</th>'; }).join('') + '</tr>';
  rows.forEach(function (r) { h += '<tr>' + L.kolom.map(function (k) { return '<td>' + esc_(r[k.k]) + '</td>'; }).join('') + '</tr>'; });
  h += '</table><div class="foot">Dibuat otomatis oleh ' + APP_NAME + '.</div></div></body></html>';
  const nama = 'Laporan_' + L.jenis + '_' + today_() + '.pdf';
  return ok_({ nama: nama, mime: 'application/pdf', base64: Utilities.base64Encode(htmlKePdf_(h, nama).getBytes()) });
}

/** HTML rekap bulanan satu santri. rowsBulan = baris setoran bulan tsb (opsional, untuk massal). */
function htmlRekapSantri_(s, bulan, rowsBulan) {
  const I = idx_(), A = aggSetoran_(), rec = A.s[s.ID_Santri] || recKosong_(), hq = I.halaqah[s.ID_Halaqah] || {}, g = I.staf[hq.ID_Muhaffidz] || {};
  const M = rec.mon[bulan] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], P = presensiBulan_(bulan), p = P.s[s.ID_Santri] || { h: 0, i: 0, s: 0, a: 0 }, tp = p.h + p.i + p.s + p.a;
  const akhir = akhirBulan_(bulan), t = capaian_(rec, targetSantri_(s, akhir < today_() ? akhir : today_()), akhir < today_() ? akhir : today_());
  if (!rowsBulan) { const m = {}; m[s.ID_Santri] = 1; rowsBulan = DB.byNilai('Setoran', 'ID_Santri', m, 400).filter(function (r) { return String(r.Tanggal).substring(0, 7) === bulan; }); }
  rowsBulan = rowsBulan.slice().sort(function (a, b) { return String(a.Tanggal).localeCompare(String(b.Tanggal)); });
  const nil = M[5] ? Math.round((M[3] + M[4]) / (2 * M[5]) * 10) / 10 : '-';
  let h = '<html><head><meta charset="utf-8"><style>' + CSS_PDF + '</style></head><body>' + kopPdf_('Rekap Mutaba\'ah Bulanan — ' + namaBulan_(bulan), setting_('LABEL_PERIODE'));
  h += '<table class="k"><tr><td>Nama</td><td><b>' + esc_(s.Nama) + '</b></td><td>Halaqah</td><td>' + esc_(hq.Nama_Halaqah || '-') + '</td></tr>' +
    '<tr><td>NIS</td><td>' + esc_(s.NIS) + '</td><td>Muhaffidz</td><td>' + esc_(g.Nama || '-') + '</td></tr></table>';
  h += '<h3>Ringkasan Bulan Ini</h3><table class="kpi"><tr>' +
    '<td>Setoran<br><b>' + M[0] + '</b> kali</td><td>Ziyadah<br><b>' + (Math.round(M[1] * 10) / 10) + '</b> hal</td><td>Murojaah<br><b>' + (Math.round(M[2] * 10) / 10) + '</b> hal</td>' +
    '<td>Nilai rata-rata<br><b>' + nil + '</b> ' + esc_(predikat_(nil)) + '</td><td>Kehadiran<br><b>' + (tp ? Math.round(p.h / tp * 100) + '%' : '-') + '</b> (' + p.h + 'H ' + p.i + 'I ' + p.s + 'S ' + p.a + 'A)</td></tr></table>';
  h += '<h3>Target</h3>' + (t.ada ? '<p>' + esc_(t.label) + ' • ' + esc_(t.periodeLabel) + ' — capaian <b>' + Math.round(t.pct * 100) + '%</b> (harapan ' + Math.round(t.harap * 100) + '%)' +
    (t.murPct !== null ? ' • murojaah ' + Math.round(t.murPct * 100) + '%' : '') + '</p><div class="bar"><div class="fill" style="width:' + Math.round(t.pct * 100) + '%"></div></div>' : '<p class="muted">Belum ada target untuk periode ini.</p>');
  h += '<h3>Peta Hafalan 30 Juz</h3><p class="muted">Total hafalan ' + (Math.round(halamanInterval_(rec.z) / HALAMAN_PER_JUZ * 10) / 10) + ' juz • ' + esc_(ringkasInterval_(rec.z)) + '</p><table class="juz">';
  const peta = petaHafalan_(rec);
  for (let r = 0; r < 3; r++) { h += '<tr>'; for (let c = 0; c < 10; c++) { const x = peta[r * 10 + c]; h += '<td class="' + x.status + '"><b>' + x.juz + '</b><br>' + Math.round(x.hafal * 100) + '%</td>'; } h += '</tr>'; }
  h += '</table><h3>Rincian Setoran</h3>';
  if (!rowsBulan.length) h += '<p class="muted">Tidak ada setoran pada bulan ini.</p>';
  else {
    h += '<table><tr><th>Tanggal</th><th>Jenis</th><th>Surah & Ayat</th><th>Juz</th><th>Hal</th><th>Tajwid</th><th>Kelancaran</th><th>Catatan</th></tr>';
    rowsBulan.forEach(function (r) {
      h += '<tr><td>' + esc_(String(r.Tanggal).substring(0, 10)) + '</td><td>' + esc_(r.Jenis) + '</td><td>' + esc_((r.Nama_Surah || namaSurah_(r.Surah)) + ' ' + r.Ayat_Dari + '–' + r.Ayat_Sampai) + '</td><td>' + esc_(r.Juz) +
        '</td><td>' + esc_(r.Jumlah_Baris_Halaman) + '</td><td>' + esc_(r.Nilai_Tajwid) + '</td><td>' + esc_(r.Nilai_Kelancaran) + '</td><td>' + esc_(r.Catatan) + '</td></tr>';
    });
    h += '</table>';
  }
  h += '<div class="foot">Dokumen ini dibuat otomatis oleh ' + APP_NAME + ' pada ' + nowIso_().replace('T', ' ') + '.</div></div></body></html>';
  return h;
}

function apiRekapSantri_(ctx, d) {
  const id = d.santriId || ctx.session.sid, s = wajibSantri_(ctx, id), bulan = /^\d{4}-\d{2}$/.test(d.bulan) ? d.bulan : bulanIni_();
  const nama = 'Rekap_' + s.NIS + '_' + String(s.Nama).replace(/[^\w]+/g, '_') + '_' + bulan + '.pdf';
  return ok_({ nama: nama, mime: 'application/pdf', base64: Utilities.base64Encode(htmlKePdf_(htmlRekapSantri_(s, bulan), nama).getBytes()) });
}

function htmlRekapHalaqah_(hqId, bulan, rowsBulan) {
  const I = idx_(), A = aggSetoran_(), hq = I.halaqah[hqId], g = I.staf[hq.ID_Muhaffidz] || {}, P = presensiBulan_(bulan);
  const sn = DB.all('Santri').filter(function (s) { return s.ID_Halaqah === hqId && s.Status !== 'Nonaktif'; }).sort(function (a, b) { return String(a.Nama).localeCompare(String(b.Nama)); });
  const ref = bulan === bulanIni_() ? today_() : akhirBulan_(bulan);
  let h = '<html><head><meta charset="utf-8"><style>' + CSS_PDF + '</style></head><body>' + kopPdf_('Rekap Halaqah ' + hq.Nama_Halaqah + ' — ' + namaBulan_(bulan), 'Muhaffidz: ' + (g.Nama || '-') + ' • ' + (hq.Jadwal || ''));
  h += '<table><tr><th>No</th><th>NIS</th><th>Nama</th><th>Setoran</th><th>Ziyadah (hal)</th><th>Murojaah (hal)</th><th>Nilai</th><th>Hadir</th><th>Hafalan (juz)</th><th>Target</th></tr>';
  sn.forEach(function (s, i) {
    const rec = A.s[s.ID_Santri] || recKosong_(), M = rec.mon[bulan] || [0, 0, 0, 0, 0, 0], p = P.s[s.ID_Santri] || { h: 0, i: 0, s: 0, a: 0 }, tp = p.h + p.i + p.s + p.a;
    const t = capaian_(rec, targetSantri_(s, ref), ref);
    h += '<tr><td>' + (i + 1) + '</td><td>' + esc_(s.NIS) + '</td><td>' + esc_(s.Nama) + '</td><td>' + M[0] + '</td><td>' + (Math.round(M[1] * 10) / 10) + '</td><td>' + (Math.round(M[2] * 10) / 10) +
      '</td><td>' + (M[5] ? Math.round((M[3] + M[4]) / (2 * M[5])) : '-') + '</td><td>' + (tp ? Math.round(p.h / tp * 100) + '%' : '-') + '</td><td>' + (Math.round(halamanInterval_(rec.z) / HALAMAN_PER_JUZ * 10) / 10) +
      '</td><td>' + (t.ada ? Math.round(t.pct * 100) + '%' : '-') + '</td></tr>';
  });
  h += '</table><div class="foot">Dibuat otomatis oleh ' + APP_NAME + ' pada ' + nowIso_().replace('T', ' ') + '.</div></div></body></html>';
  return h;
}
function apiRekapHalaqah_(ctx, d) {
  const hq = str_(d.halaqahId, 20); if (!bolehHalaqah_(ctx, hq)) return fail_('Halaqah di luar hak akses.', { code: 'FORBIDDEN' });
  const bulan = /^\d{4}-\d{2}$/.test(d.bulan) ? d.bulan : bulanIni_(), nama = 'Rekap_Halaqah_' + String(idx_().halaqah[hq].Nama_Halaqah).replace(/[^\w]+/g, '_') + '_' + bulan + '.pdf';
  return ok_({ nama: nama, mime: 'application/pdf', base64: Utilities.base64Encode(htmlKePdf_(htmlRekapHalaqah_(hq, bulan), nama).getBytes()) });
}

/* ---------------- Rekap massal ke Drive (job bertahap, aman batas 6 menit) ---------------- */
function folderBulan_(propKey, bulan) {
  const root = DriveApp.getFolderById(prop_(propKey)), it = root.getFoldersByName(bulan);
  return it.hasNext() ? it.next() : root.createFolder(bulan);
}
function simpanFile_(folder, blob) {
  const it = folder.getFilesByName(blob.getName());
  while (it.hasNext()) it.next().setTrashed(true);
  return folder.createFile(blob);
}
function mulaiJobRekap_(bulan) {
  const job = { bulan: bulan, i: 0, h: 0, file: 0, gagal: 0, mulai: nowIso_(), selesai: false };
  setProp_('JOB_REKAP', JSON.stringify(job));
  return job;
}
function lanjutkanJob_(t0, budget) {
  const raw = prop_('JOB_REKAP'); if (!raw) return null;
  const job = JSON.parse(raw); if (job.selesai) return job;
  const c = cache_(); if (c.get('job_busy')) return job;
  c.put('job_busy', '1', 90);
  budget = budget || 40000; t0 = t0 || Date.now();
  try {
    const santri = DB.all('Santri').filter(function (s) { return s.Status === 'Aktif'; }).sort(function (a, b) { return a.ID_Santri < b.ID_Santri ? -1 : 1; });
    const hqs = Object.keys(idx_().halaqah).filter(function (h) { return idx_().halaqah[h].Status !== 'Nonaktif'; }).sort();
    job.total = santri.length + hqs.length;
    let grup = null;
    if (job.i < santri.length) {
      const fS = folderBulan_('FOLDER_REKAP_BULANAN', job.bulan);
      grup = {}; DB.byTanggal('Setoran', job.bulan + '-01', job.bulan + '-31').forEach(function (r) { (grup[r.ID_Santri] = grup[r.ID_Santri] || []).push(r); });
      while (job.i < santri.length && Date.now() - t0 < budget) {
        const s = santri[job.i];
        try { simpanFile_(fS, htmlKePdf_(htmlRekapSantri_(s, job.bulan, grup[s.ID_Santri] || []), 'Rekap_' + s.NIS + '_' + String(s.Nama).replace(/[^\w]+/g, '_') + '_' + job.bulan + '.pdf')); job.file++; }
        catch (e) { job.gagal++; console.error('rekap ' + s.ID_Santri + ': ' + e.message); }
        job.i++;
      }
    }
    if (job.i >= santri.length && job.h < hqs.length) {
      const fH = folderBulan_('FOLDER_REKAP_HALAQAH', job.bulan);
      while (job.h < hqs.length && Date.now() - t0 < budget) {
        const h = hqs[job.h];
        try { simpanFile_(fH, htmlKePdf_(htmlRekapHalaqah_(h, job.bulan), 'Rekap_Halaqah_' + String(idx_().halaqah[h].Nama_Halaqah).replace(/[^\w]+/g, '_') + '_' + job.bulan + '.pdf')); job.file++; }
        catch (e) { job.gagal++; }
        job.h++;
      }
    }
    if (job.i >= santri.length && job.h >= hqs.length) {
      job.selesai = true; job.selesaiPada = nowIso_();
      const I = idx_(), daftar = [];
      santri.forEach(function (s) { (I.waliBySantri[s.ID_Santri] || []).forEach(function (w) { daftar.push({ penerima: { nama: w.Nama, hp: w.No_WA, email: w.Email }, idWali: w.ID_Wali, refId: s.ID_Santri, vars: { nama_santri: s.Nama, bulan: namaBulan_(job.bulan) } }); }); });
      kirimNotifBatch_('REKAP_BULANAN', daftar);
    }
    setProp_('JOB_REKAP', JSON.stringify(job));
  } finally { c.remove('job_busy'); }
  return job;
}
function rekapBulananOtomatis() {
  if (setting_('REKAP_OTOMATIS', 'YA') !== 'YA') return;
  mulaiJobRekap_(bulanGeser_(bulanIni_(), -1));
  lanjutkanJob_(Date.now(), 240000);
}
function apiRekapGenerate_(ctx, d) {
  const bulan = /^\d{4}-\d{2}$/.test(d.bulan) ? d.bulan : bulanGeser_(bulanIni_(), -1);
  mulaiJobRekap_(bulan);
  return ok_({ job: JSON.parse(prop_('JOB_REKAP')) }, 'Pembuatan rekap ' + namaBulan_(bulan) + ' dimulai. Proses berjalan bertahap di latar belakang (±1 menit per 30 santri).');
}
function apiRekapStatus_(ctx, d) {
  let job = prop_('JOB_REKAP') ? JSON.parse(prop_('JOB_REKAP')) : null;
  if (job && !job.selesai && d.lanjut) job = lanjutkanJob_(Date.now(), 20000);
  let url = '';
  try { url = job ? DriveApp.getFolderById(prop_('FOLDER_REKAP_BULANAN')).getUrl() : ''; } catch (e) { }
  return ok_({ job: job, folder: url });
}

/* ================================================================
 *  BACKUP & PENGINGAT MINGGUAN
 * ================================================================ */
function backupMingguan() {
  const f = DriveApp.getFolderById(prop_('FOLDER_BACKUP')), nama = 'Backup ' + APP_NAME + ' ' + today_();
  const salin = DriveApp.getFileById(prop_('SPREADSHEET_ID')).makeCopy(nama, f);
  const simpan = Math.max(2, num_(setting_('BACKUP_SIMPAN', '8'), 8)), files = [], it = f.getFiles();
  while (it.hasNext()) { const x = it.next(); if (x.getName().indexOf('Backup ' + APP_NAME) === 0) files.push(x); }
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  files.slice(simpan).forEach(function (x) { x.setTrashed(true); });
  setProp_('BACKUP_TERAKHIR', nowIso_());
  return { nama: nama, url: salin.getUrl(), disimpan: Math.min(simpan, files.length) };
}
function apiSysBackup_(ctx) { const r = backupMingguan(); const res = ok_(r, 'Backup dibuat: ' + r.nama); res.auditEntitas = 'Backup'; res.auditDetail = r.nama; return res; }

function pengingatMingguan() {
  const A = aggSetoran_(), I = idx_(), hari = today_(), P = presensiBulan_(hari.substring(0, 7)), guru = [], wali = [];
  Object.keys(I.halaqah).forEach(function (h) {
    const hq = I.halaqah[h]; if (hq.Status === 'Nonaktif') return;
    const sn = DB.all('Santri').filter(function (s) { return s.ID_Halaqah === h && s.Status === 'Aktif'; });
    const per = hitungPerhatian_(sn, A, P, hari); if (!per.length) return;
    const g = I.staf[hq.ID_Muhaffidz];
    if (g) guru.push({ penerima: { nama: g.Nama, hp: g.No_WA, email: g.Email_Google }, refId: h,
      vars: { halaqah: hq.Nama_Halaqah, jumlah: per.length, daftar: per.slice(0, 15).map(function (x) { return '• ' + x.nama + ' — ' + x.alasan.join('; '); }).join('\n') } });
    per.filter(function (x) { return x.pct !== null && x.alasan.join(' ').indexOf('Target') > -1; }).forEach(function (x) {
      (I.waliBySantri[x.id] || []).forEach(function (w) { wali.push({ penerima: { nama: w.Nama, hp: w.No_WA, email: w.Email }, idWali: w.ID_Wali, refId: x.id, vars: { nama_santri: x.nama, capaian: Math.round(x.pct * 100) + '%', halaqah: hq.Nama_Halaqah } }); });
    });
  });
  withLock_(function () { kirimNotifBatch_('PENGINGAT_GURU', guru); kirimNotifBatch_('TARGET_PENGINGAT', wali); });
  return { guru: guru.length, wali: wali.length };
}

/* ================================================================
 *  PENGATURAN, LOG, STATUS SISTEM
 * ================================================================ */
function apiPengaturanGet_(ctx) {
  const s = settings_(), ket = {};
  SETTING_DEFAULT.forEach(function (r) { ket[r[0]] = r[2]; });
  const list = SETTING_DEFAULT.filter(function (r) { return r[0].indexOf('NOTIF_') !== 0 && r[0].indexOf('WA_') !== 0; }).map(function (r) { return { k: r[0], v: s[r[0]], ket: r[2] }; });
  return ok_({ list: list, rahasia: { GOOGLE_CLIENT_ID: prop_('GOOGLE_CLIENT_ID'), FONNTE_TOKEN: { ada: !!prop_('FONNTE_TOKEN'), samar: samarkan_(prop_('FONNTE_TOKEN')) },
    darurat: { ada: !!prop_('EMERGENCY_PASS_HASH'), user: prop_('EMERGENCY_USER') } },
    trigger: statusTrigger_(), owner: prop_('OWNER_EMAIL'), versi: APP_VERSION, skema: prop_('SCHEMA_VERSION') || '-' });
}
function statusTrigger_() {
  const ada = {}; ScriptApp.getProjectTriggers().forEach(function (t) { ada[t.getHandlerFunction()] = (ada[t.getHandlerFunction()] || 0) + 1; });
  return TRIGGER_DEF.map(function (d) { return { fn: d.fn, ket: d.ket, aktif: !!ada[d.fn] }; }).concat([{ fn: 'keepWarm', ket: 'Pemanasan cache otomatis', aktif: prop_('KEEP_WARM') !== 'off' }]);
}
function apiPengaturanSave_(ctx, d) {
  const v = d.values || {}, boleh = {}, simpan = {};
  SETTING_DEFAULT.forEach(function (r) { if (r[0] !== 'NOTIF_MATRIKS') boleh[r[0]] = 1; });
  Object.keys(v).forEach(function (k) {
    if (!boleh[k]) return;
    let x = str_(v[k], 2000);
    if (/^(SEMESTER_MULAI|SEMESTER_SELESAI)$/.test(k) && !tglValid_(x)) throw err_(k + ' harus berformat yyyy-MM-dd.');
    if (/^(MUTQIN_MIN|EDIT_JAM|MIN_HARI_TANPA_SETORAN|IDLE_MENIT|SESI_JAM|CRM_SYNC_MENIT|BACKUP_SIMPAN)$/.test(k) && !(Number(x) >= 0)) throw err_(k + ' harus berupa angka.');
    if (k === 'SKALA_NILAI') { try { const j = JSON.parse(x); if (!Array.isArray(j) || !j.every(function (o) { return typeof o.min === 'number' && o.label; })) throw 0; } catch (e) { throw err_('SKALA_NILAI harus JSON seperti [{"min":90,"label":"Mumtaz"}].'); } }
    if (k === 'JAM_SENYAP' && x && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(x)) throw err_('JAM_SENYAP berformat 21:00-05:00 atau kosong.');
    if (/_AKTIF$|^TAMPILKAN_|^REKAP_OTOMATIS$|^WA_DETEKSI/.test(k)) x = x === 'YA' ? 'YA' : 'TIDAK';
    simpan[k] = x;
  });
  const mutqinBerubah = simpan.MUTQIN_MIN !== undefined && simpan.MUTQIN_MIN !== setting_('MUTQIN_MIN');
  simpanSetting_(simpan);
  if (mutqinBerubah) bumpAgg_();
  const res = ok_({ setting: settingsPublik_() }, 'Pengaturan tersimpan.');
  res.auditEntitas = 'Pengaturan'; res.auditDetail = Object.keys(simpan).join(',');
  return res;
}
function apiLogList_(ctx, d) {
  const q = String(d.q || '').toLowerCase(), per = Math.min(200, Math.max(10, num_(d.per, 50))), page = Math.max(0, num_(d.page, 0));
  let rows = DB.tail('LogAktivitas', 3000).reverse();
  if (d.aksi) rows = rows.filter(function (r) { return String(r.Aksi).indexOf(d.aksi) > -1; });
  if (q) rows = rows.filter(function (r) { return (r.Pengguna + ' ' + r.Aksi + ' ' + r.Entitas + ' ' + r.Detail).toLowerCase().indexOf(q) > -1; });
  return ok_({ total: rows.length, page: page, per: per, rows: rows.slice(page * per, page * per + per).map(function (r) { const o = Object.assign({}, r); delete o._row; return o; }) });
}
function apiSysStatus_(ctx) {
  const c = cache_(), ss = DB.ss(), sheets = {};
  ss.getSheets().forEach(function (s) { sheets[s.getName()] = Math.max(0, s.getLastRow() - 1); });
  let sel = 0; ss.getSheets().forEach(function (s) { sel += s.getMaxRows() * s.getMaxColumns(); });
  const props = PROPS.getProperties(); let ukuran = 0; Object.keys(props).forEach(function (k) { ukuran += k.length + String(props[k]).length; });
  const A = CacheX.get('agg_' + ver1_('agg'));
  let kuota = null; try { kuota = MailApp.getRemainingDailyQuota(); } catch (e) { }
  return ok_({ versi: APP_VERSION, sheets: sheets, sel: sel, batasSel: 10000000, agg: A ? { baris: A.rows - 1, santri: Object.keys(A.s).length, at: A.at } : null,
    warm: cacheGet_('warm_last'), antrean: prop_('ANTRIAN_ADA') === '1', trigger: statusTrigger_(), props: { jumlah: Object.keys(props).length, byte: ukuran },
    backup: prop_('BACKUP_TERAKHIR'), kuotaEmail: kuota, job: prop_('JOB_REKAP') ? JSON.parse(prop_('JOB_REKAP')) : null, spreadsheetUrl: ss.getUrl() });
}
function apiSysSegarkan_(ctx) {
  ['master', 'agg', 'schema', 'pm_' + bulanIni_(), 'pm_' + bulanGeser_(bulanIni_(), -1)].concat(Object.keys(SCHEMA).map(function (k) { return 't_' + k; })).forEach(bump_);
  DB._memo = {}; DB._h = {}; _AGG = null; _SET = null; resetIdx_();
  return ok_(null, 'Cache dikosongkan. Data dibaca ulang dari Google Sheets.');
}
function apiSysTrigger_(ctx, d) {
  if (d.aksi === 'pasang') pasangTrigger();
  else if (d.aksi === 'keepWarmOff') setProp_('KEEP_WARM', 'off');
  else if (d.aksi === 'keepWarmOn') delProp_('KEEP_WARM');
  else return fail_('Aksi tidak dikenal.');
  return ok_({ trigger: statusTrigger_() }, 'Trigger diperbarui.');
}

/* ================================================================
 *  ARSIP TAHUNAN — pindahkan log lama ke spreadsheet arsip
 *  Cakupan hafalan dari setoran yang diarsipkan dilebur ke HafalanAwal
 *  sehingga peta hafalan & total tetap utuh.
 * ================================================================ */
const ARSIP_SHEET = ['Setoran', 'Presensi', 'LogNotif', 'LogAktivitas'];
const ARSIP_KOLOM_TGL = { Setoran: 'Tanggal', Presensi: 'Tanggal', LogNotif: 'Waktu', LogAktivitas: 'Waktu' };
function apiArsipScan_(ctx, d) {
  const sebelum = str_(d.sebelum, 10); if (!tglValid_(sebelum)) return fail_('Tanggal batas (yyyy-MM-dd) wajib diisi.');
  const out = {};
  ARSIP_SHEET.forEach(function (n) { out[n] = DB.col(n, ARSIP_KOLOM_TGL[n]).filter(function (t) { return t && String(t).substring(0, 10) < sebelum; }).length; });
  return ok_({ sebelum: sebelum, jumlah: out });
}
function apiArsipRun_(ctx, d) {
  const sebelum = str_(d.sebelum, 10); if (!tglValid_(sebelum)) return fail_('Tanggal batas tidak valid.');
  if (sebelum > tambahHari_(today_(), -90)) return fail_('Demi keamanan, hanya data yang lebih tua dari 90 hari yang boleh diarsipkan.');
  const t0 = Date.now(), mq = num_(setting_('MUTQIN_MIN', '85'), 85);
  const arsip = SpreadsheetApp.create('Arsip ' + APP_NAME + ' sebelum ' + sebelum);
  DriveApp.getFileById(arsip.getId()).moveTo(DriveApp.getFolderById(prop_('FOLDER_BACKUP')));
  const hasil = {};
  ARSIP_SHEET.forEach(function (n) {
    const sh = DB.sh(n), last = sh.getLastRow(), H = DB.h(n); if (last < 2) { hasil[n] = 0; return; }
    const vals = sh.getRange(2, 1, last - 1, H.length).getValues(), ci = H.indexOf(ARSIP_KOLOM_TGL[n]);
    const lama = [], tetap = [];
    vals.forEach(function (r) { (tglSel_(r[ci]) < sebelum && tglSel_(r[ci]) ? lama : tetap).push(r); });
    hasil[n] = lama.length; if (!lama.length) return;
    if (n === 'Setoran') leburKeHafalanAwal_(lama, H, mq);
    const target = arsip.insertSheet(n); target.getRange(1, 1, 1, H.length).setValues([H]);
    target.getRange(2, 1, lama.length, H.length).setNumberFormat('@').setValues(lama);
    sh.getRange(2, 1, last - 1, H.length).clearContent();
    if (tetap.length) sh.getRange(2, 1, tetap.length, H.length).setValues(tetap);
    DB.touch(n);
  });
  try { const s1 = arsip.getSheetByName('Sheet1'); if (s1 && arsip.getSheets().length > 1) arsip.deleteSheet(s1); } catch (e) { }
  bumpAgg_(); ['pm_' + bulanIni_()].forEach(bump_);
  const res = ok_({ hasil: hasil, url: arsip.getUrl(), detik: Math.round((Date.now() - t0) / 1000) }, 'Arsip selesai. Data lama dipindah ke spreadsheet arsip di folder Backup.');
  res.auditEntitas = 'Arsip'; res.auditDetail = JSON.stringify(hasil);
  return res;
}
function leburKeHafalanAwal_(rows, H, mq) {
  const ix = {}; H.forEach(function (k, i) { ix[k] = i; });
  const tmp = { s: {}, g: {} };
  rows.forEach(function (r, i) { aggTambah_(tmp, r, ix, i + 2, mq); });
  const ada = DB.all('HafalanAwal', true), byId = {}; ada.forEach(function (h) { byId[h.ID_Santri] = h; });
  const baru = [], ubah = [], now = nowIso_();
  Object.keys(tmp.s).forEach(function (id) {
    const t = tmp.s[id], h = byId[id];
    const z = gabungInterval_((h ? teksKeInterval_(h.Ziyadah) : []).concat(t.z)), m = gabungInterval_((h ? teksKeInterval_(h.Mutqin) : []).concat(t.m));
    const o = h || { ID_Santri: id, Total_Setoran: 0, Catatan: '' };
    o.Ziyadah = intervalKeTeks_(z); o.Mutqin = intervalKeTeks_(irisanInterval_(m, z)); o.Ringkasan = ringkasInterval_(z);
    o.Total_Setoran = num_(o.Total_Setoran) + t.n; o.Sumber = h && /manual/i.test(h.Sumber) ? 'Arsip + Manual' : 'Arsip'; o.Diubah_Pada = now;
    (h ? ubah : baru).push(o);
  });
  if (ubah.length) DB.write('HafalanAwal', ubah);
  if (baru.length) DB.append('HafalanAwal', baru);
}

/* ===== Notifikasi.gs ===== */
/**
 * ================================================================
 *  MutqinSpace — Notifikasi.gs
 *  Modul notifikasi WhatsApp (Fonnte) + Email + CRM Kontak
 *  • Antrean di sheet LogNotif (aksi admin tetap instan)
 *  • Saklar utama per kanal + matriks per event + jam senyap (FR-26)
 *  • Prosesor antrean (trigger 1 menit + drain dari browser) (FR-24, FR-25)
 *  • Blast WA per batch 10/20/50 dengan jeda acak (anti-banned)
 *  • Deteksi nomor terdaftar WhatsApp
 *  • CRM Kontak: Wali Santri & Muhaffidz (Nama · Email · WhatsApp)
 *  Token Fonnte HANYA di Script Properties (FONNTE_TOKEN), tidak pernah ke browser.
 * ================================================================
 */
const FONNTE_API = 'https://api.fonnte.com';

const NOTIF_EVENTS = {
  SETORAN_BARU: { label: 'Setoran hafalan tersimpan → wali', wa: true, email: true, senyap: true,
    vars: 'nama, nama_santri, jenis, surah, ayat, juz, tajwid, kelancaran, catatan, muhaffidz, tanggal',
    subjek: 'Laporan Setoran {jenis} — {nama_santri}',
    pesan: 'Assalamu\'alaikum {nama},\n\nAlhamdulillah, ananda *{nama_santri}* telah menyetorkan *{jenis}* pada {tanggal}:\n📖 {surah} ayat {ayat} (Juz {juz})\n⭐ Tajwid: {tajwid}\n🎯 Kelancaran: {kelancaran}\n📝 Catatan: {catatan}\n\nPantau perkembangan ananda: {link}\n— {muhaffidz}, {institusi}' },
  PENGINGAT_WALI: { label: 'Tombol "Kirim Pengingat Wali" di dashboard', wa: true, email: true, senyap: false,
    vars: 'nama, nama_santri, halaqah, terakhir, capaian',
    subjek: 'Pengingat Hafalan {nama_santri}',
    pesan: 'Assalamu\'alaikum {nama},\n\nKami ingin berbagi perkembangan hafalan ananda *{nama_santri}* ({halaqah}).\nSetoran terakhir: {terakhir}\nCapaian target: {capaian}\n\nMohon dukungan murojaah di rumah. Jazakumullahu khairan.\n— {institusi}' },
  PRESENSI_ALPA: { label: 'Santri alpa di halaqah → wali', wa: false, email: false, senyap: true, vars: 'nama, nama_santri, halaqah, tanggal',
    subjek: 'Ketidakhadiran {nama_santri}',
    pesan: 'Assalamu\'alaikum {nama},\nAnanda *{nama_santri}* tercatat *alpa* di halaqah {halaqah} pada {tanggal}. Mohon konfirmasinya kepada muhaffidz.\n— {institusi}' },
  TARGET_PENGINGAT: { label: 'Pengingat mingguan target tertinggal → wali', wa: false, email: false, senyap: true, vars: 'nama, nama_santri, halaqah, capaian',
    subjek: 'Perkembangan Target Hafalan {nama_santri}',
    pesan: 'Assalamu\'alaikum {nama},\nCapaian target hafalan ananda *{nama_santri}* ({halaqah}) saat ini {capaian}. Mohon dukungan murojaah di rumah.\nDetail: {link}\n— {institusi}' },
  PENGINGAT_GURU: { label: 'Ringkasan mingguan santri perlu perhatian → muhaffidz', wa: false, email: true, senyap: true, vars: 'nama, halaqah, jumlah, daftar',
    subjek: 'Ringkasan Mingguan Halaqah {halaqah}',
    pesan: 'Assalamu\'alaikum {nama},\n\nBerikut {jumlah} santri halaqah *{halaqah}* yang perlu perhatian pekan ini:\n{daftar}\n\nBuka dashboard: {link}\n— {institusi}' },
  REKAP_BULANAN: { label: 'Rekap PDF bulanan tersedia → wali', wa: false, email: true, senyap: true, vars: 'nama, nama_santri, bulan',
    subjek: 'Rekap Mutaba\'ah {bulan} — {nama_santri}',
    pesan: 'Assalamu\'alaikum {nama},\nRekap mutaba\'ah ananda *{nama_santri}* bulan {bulan} sudah tersedia dan dapat diunduh di Portal Wali: {link}\n— {institusi}' },
  PIN_WALI: { label: 'PIN Portal Wali dibuat / direset', wa: true, email: true, senyap: false, rahasia: true, vars: 'nama, nama_santri, nis, pin',
    subjek: 'Akses Portal Wali — {nama_santri}',
    pesan: 'Assalamu\'alaikum {nama},\nBerikut akses Portal Wali untuk ananda *{nama_santri}*:\nNIS: *{nis}*\nPIN: *{pin}*\nBuka: {link}\nMohon jaga kerahasiaan PIN ini.\n— {institusi}' }
};

/* ---------------- konfigurasi & matriks ---------------- */
function waAktif_() { return setting_('NOTIF_WA_AKTIF', 'TIDAK') === 'YA' && !!prop_('FONNTE_TOKEN'); }
function emailAktif_() { return setting_('NOTIF_EMAIL_AKTIF', 'TIDAK') === 'YA'; }
function matriksNotif_() {
  let simpan = {};
  try { simpan = JSON.parse(setting_('NOTIF_MATRIKS', '') || '{}') || {}; } catch (e) { }
  const out = {};
  Object.keys(NOTIF_EVENTS).forEach(function (k) {
    const d = NOTIF_EVENTS[k], s = simpan[k] || {};
    out[k] = { kode: k, label: d.label, vars: d.vars, senyap: d.senyap,
      wa: s.wa !== undefined ? !!s.wa : d.wa, email: s.email !== undefined ? !!s.email : d.email,
      subjek: s.subjek || d.subjek, pesan: s.pesan || d.pesan, subjekDefault: d.subjek, pesanDefault: d.pesan };
  });
  return out;
}
function isiTemplate_(tpl, v) { return String(tpl || '').replace(/\{(\w+)\}/g, function (m, k) { return v[k] == null ? '' : String(v[k]); }); }
function dalamJamSenyap_() {
  const r = String(setting_('JAM_SENYAP', '') || '').match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (!r) return false;
  const now = fmt_(new Date(), 'HH:mm');
  return r[1] <= r[2] ? (now >= r[1] && now < r[2]) : (now >= r[1] || now < r[2]);
}

function apiNotifConfig_() {
  let kuota = null; try { kuota = MailApp.getRemainingDailyQuota(); } catch (e) { }
  return ok_({
    waAktif: setting_('NOTIF_WA_AKTIF') === 'YA', emailAktif: setting_('NOTIF_EMAIL_AKTIF') === 'YA',
    tokenAda: !!prop_('FONNTE_TOKEN'), token: samarkan_(prop_('FONNTE_TOKEN')),
    batchDefault: num_(setting_('WA_BATCH_DEFAULT', '20'), 20), jeda: setting_('WA_JEDA_DETIK', '5'), deteksiOtomatis: setting_('WA_DETEKSI_OTOMATIS') === 'YA',
    namaPengirim: setting_('EMAIL_NAMA_PENGIRIM'), appUrl: setting_('APP_URL'), jamSenyap: setting_('JAM_SENYAP'),
    kuotaEmail: kuota, trigger: statusTrigger_().filter(function (t) { return t.fn === 'tickMenit'; })[0],
    matriks: Object.keys(matriksNotif_()).map(function (k) { return matriksNotif_()[k]; })
  });
}
function apiNotifConfigSave_(ctx, d) {
  if (d.token !== undefined && d.token !== '') {
    if (d.token === '__HAPUS__') delProp_('FONNTE_TOKEN'); else setProp_('FONNTE_TOKEN', String(d.token).trim().substring(0, 200));
  }
  const s = {};
  if (d.waAktif !== undefined) {
    if (d.waAktif && !prop_('FONNTE_TOKEN')) return fail_('Isi token Fonnte terlebih dahulu sebelum mengaktifkan WhatsApp.');
    s.NOTIF_WA_AKTIF = d.waAktif ? 'YA' : 'TIDAK';
  }
  if (d.emailAktif !== undefined) s.NOTIF_EMAIL_AKTIF = d.emailAktif ? 'YA' : 'TIDAK';
  if (d.batchDefault !== undefined) { if ([10, 20, 50].indexOf(Number(d.batchDefault)) === -1) return fail_('Ukuran batch harus 10, 20, atau 50.'); s.WA_BATCH_DEFAULT = String(d.batchDefault); }
  if (d.jeda !== undefined) { if (!/^\d{1,3}(-\d{1,3})?$/.test(String(d.jeda))) return fail_('Jeda berformat angka (5) atau rentang (3-8).'); s.WA_JEDA_DETIK = String(d.jeda); }
  if (d.deteksiOtomatis !== undefined) s.WA_DETEKSI_OTOMATIS = d.deteksiOtomatis ? 'YA' : 'TIDAK';
  if (d.namaPengirim !== undefined) s.EMAIL_NAMA_PENGIRIM = str_(d.namaPengirim, 80);
  if (d.appUrl !== undefined) { if (d.appUrl && !/^https:\/\//.test(d.appUrl)) return fail_('URL aplikasi harus diawali https://'); s.APP_URL = str_(d.appUrl, 300); }
  if (d.jamSenyap !== undefined) { if (d.jamSenyap && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(d.jamSenyap)) return fail_('Jam senyap berformat 21:00-05:00 atau kosong.'); s.JAM_SENYAP = String(d.jamSenyap || ''); }
  if (d.matriks) {
    const simpan = {};
    [].concat(d.matriks).forEach(function (m) {
      const def = NOTIF_EVENTS[m.kode]; if (!def) return;
      const o = {};
      if (!!m.wa !== def.wa) o.wa = !!m.wa;
      if (!!m.email !== def.email) o.email = !!m.email;
      if (m.subjek && m.subjek !== def.subjek) o.subjek = str_(m.subjek, 200);
      if (m.pesan && m.pesan !== def.pesan) o.pesan = str_(m.pesan, 2000);
      if (Object.keys(o).length) simpan[m.kode] = o;
    });
    s.NOTIF_MATRIKS = JSON.stringify(simpan);
  }
  simpanSetting_(s);
  pasangTrigger();
  const res = apiNotifConfig_(); res.message = 'Konfigurasi notifikasi tersimpan.';
  res.auditEntitas = 'Notifikasi'; res.auditDetail = Object.keys(s).join(',') + (d.token ? ',FONNTE_TOKEN(diubah)' : '');
  return res;
}

/* ---------------- antrean: satu-satunya pintu kirim otomatis ---------------- */
function kirimNotif_(event, penerima, vars, refId, idWali) { return kirimNotifBatch_(event, [{ penerima: penerima, vars: vars, refId: refId, idWali: idWali }]); }

/** daftar: [{penerima:{nama,hp,email}, vars, refId, idWali}] → baris antrean (1× tulis). Tidak pernah melempar galat. */
function kirimNotifBatch_(event, daftar, opsi) {
  opsi = opsi || {};
  try {
    if (!daftar || !daftar.length) return 0;
    const waOn = waAktif_(), emOn = emailAktif_();
    if (!waOn && !emOn) return 0;
    const m = matriksNotif_()[event]; if (!m) return 0;
    const kWA = waOn && (m.wa || opsi.paksa), kEm = emOn && (m.email || opsi.paksa);
    if (!kWA && !kEm) return 0;
    const dasar = { institusi: setting_('NAMA_LEMBAGA', ''), link: setting_('APP_URL', '') }, rows = [], now = nowIso_(), sudah = {};
    daftar.forEach(function (d) {
      const p = d.penerima || {}, v = Object.assign({}, dasar, { nama: p.nama || 'Bapak/Ibu' }, d.vars || {});
      if (kWA && hpValid_(p.hp)) {
        const k = 'W' + hp62_(p.hp) + '|' + d.refId;
        if (!sudah[k]) { sudah[k] = 1; rows.push(barisAntrian_('WA', hp62_(p.hp), p.nama, '', isiTemplate_(m.pesan, v), event, d.refId, '', d.idWali, now)); }
      }
      if (kEm && emailValid_(p.email)) {
        const k = 'E' + String(p.email).toLowerCase() + '|' + d.refId;
        if (!sudah[k]) { sudah[k] = 1; rows.push(barisAntrian_('EMAIL', String(p.email).trim(), p.nama, isiTemplate_(m.subjek, v), isiTemplate_(m.pesan, v), event, d.refId, '', d.idWali, now)); }
      }
    });
    if (!rows.length) return 0;
    withLock_(function () {
      const ids = reserveIds_('LogNotif', rows.length);
      rows.forEach(function (r, i) { r.ID_Log = ids[i]; });
      DB.append('LogNotif', rows);
      if (prop_('ANTRIAN_ADA') !== '1') setProp_('ANTRIAN_ADA', '1');
    });
    return rows.length;
  } catch (e) { console.error('kirimNotifBatch_ (tidak fatal): ' + e.message); return 0; }
}
function barisAntrian_(kanal, tujuan, nama, subjek, pesan, event, refId, blastId, idWali, now) {
  return { ID_Log: '', Waktu: now || nowIso_(), Kanal: kanal, Tujuan: tujuan, Nama_Penerima: nama || '', Subjek: subjek || '', Pesan: pesan, Event: event || '',
    ID_Wali: idWali || '', ID_Setoran: refId || '', ID_Blast: blastId || '', Status: 'Antre', Percobaan: 0, Pesan_Error: '', Dikirim_Pada: '' };
}

/* ---------------- prosesor antrean (trigger tiap menit & drain) ---------------- */
function prosesAntrianNotif(opsi) {
  opsi = opsi || {};
  if (!prop_('SPREADSHEET_ID')) return { info: 'belum setup' };
  if (!opsi.paksa && prop_('ANTRIAN_ADA') !== '1') { try { tugasLatar_(); } catch (e) { } return { info: 'kosong' }; }
  const c = cache_();
  if (c.get('antrean_busy')) return { info: 'prosesor sedang berjalan' };
  c.put('antrean_busy', '1', 120);
  try { return prosesAntrianInti_(opsi); } finally { c.remove('antrean_busy'); }
}

function prosesAntrianInti_(opsi) {
  const sh = DB.sh('LogNotif'), last = sh.getLastRow();
  if (last < 2) { setProp_('ANTRIAN_ADA', '0'); return { terkirim: 0, sisa: 0 }; }
  const H = DB.h('LogNotif'), mulai = Math.max(2, Math.min(last, num_(prop_('ANTRIAN_MULAI'), 2)));
  const rows = DB.objs('LogNotif', sh.getRange(mulai, 1, last - mulai + 1, H.length).getValues(), mulai);
  const senyap = dalamJamSenyap_(), matriks = matriksNotif_();
  const waOn = waAktif_(), emOn = emailAktif_();
  let kuotaEmail = 40; try { kuotaEmail = Math.min(40, MailApp.getRemainingDailyQuota()); } catch (e) { }
  const maks = opsi.maks || 30;
  const blasts = {}; DB.all('BlastWA').forEach(function (b) { if (b.Status === 'Berjalan') blasts[b.ID_Blast] = b; });
  const pilihWA = [], pilihEm = [], perBlast = {}, batal = [];
  rows.forEach(function (r) {
    if (r.Status !== 'Antre') return;
    if (r.ID_Blast) {
      if (opsi.blastId && r.ID_Blast !== opsi.blastId) return;
      const b = blasts[r.ID_Blast]; if (!b || senyap) return;
      const arr = perBlast[r.ID_Blast] || (perBlast[r.ID_Blast] = []);
      if (arr.length < (num_(b.Ukuran_Batch, 20) || 20)) arr.push(r);
      return;
    }
    if (opsi.hanyaBlast) return;
    if (r.Kanal === 'WA' && !waOn) { batal.push(r); return; }
    if (r.Kanal === 'EMAIL' && !emOn) { batal.push(r); return; }
    const ev = matriks[r.Event]; if (senyap && ev && ev.senyap) return;
    if (r.Kanal === 'WA' && pilihWA.length < maks) pilihWA.push(r);
    if (r.Kanal === 'EMAIL' && pilihEm.length < Math.min(maks, kuotaEmail)) pilihEm.push(r);
  });
  const hasil = {}, now = nowIso_();
  batal.forEach(function (r) { hasil[r.ID_Log] = { batal: true, respon: 'Kanal ' + r.Kanal + ' dinonaktifkan sebelum terkirim' }; });
  // WA event
  if (pilihWA.length) fonnteKirimBanyak_(pilihWA.map(function (r) { return { target: r.Tujuan, message: r.Pesan }; }), '2')
    .forEach(function (h, i) { hasil[pilihWA[i].ID_Log] = h; });
  // WA blast per batch (1 batch per putaran per blast)
  Object.keys(perBlast).forEach(function (id) {
    const arr = perBlast[id];
    if (!waOn) return;   // blast dijeda sampai WhatsApp aktif kembali
    fonnteKirimBanyak_(arr.map(function (r) { return { target: r.Tujuan, message: r.Pesan }; }), blasts[id].Jeda_Detik || setting_('WA_JEDA_DETIK', '5'))
      .forEach(function (h, i) { hasil[arr[i].ID_Log] = h; });
  });
  // Email
  const nama = setting_('EMAIL_NAMA_PENGIRIM', APP_NAME);
  pilihEm.forEach(function (r) {
    try { MailApp.sendEmail({ to: r.Tujuan, subject: r.Subjek || APP_NAME, body: r.Pesan.replace(/\*/g, ''), htmlBody: htmlEmail_(r.Subjek, r.Pesan), name: nama }); hasil[r.ID_Log] = { ok: true, respon: 'OK' }; }
    catch (e) { hasil[r.ID_Log] = { ok: false, respon: String(e.message).substring(0, 150) }; }
  });
  // Tulis hasil (di bawah kunci, hanya baris yang masih Antre)
  let terkirim = 0, gagal = 0;
  const kontakKirim = [];
  withLock_(function () {
    const ids = Object.keys(hasil); if (!ids.length) return;
    const byRow = {}; rows.forEach(function (r) { if (hasil[r.ID_Log]) byRow[r._row] = r; });
    const segar = DB.rowsAt('LogNotif', Object.keys(byRow).map(Number), 30), tulis = [], statBlast = {};
    segar.forEach(function (r) {
      const h = hasil[r.ID_Log]; if (!h || r.Status !== 'Antre') return;
      if (h.batal) { r.Status = 'Batal'; r.Pesan_Error = h.respon; if (NOTIF_EVENTS[r.Event] && NOTIF_EVENTS[r.Event].rahasia) r.Pesan = '[isi disamarkan]'; }
      else if (h.ok) { r.Status = 'Terkirim'; r.Dikirim_Pada = now; r.Pesan_Error = ''; terkirim++; kontakKirim.push(r.Tujuan);
        if (NOTIF_EVENTS[r.Event] && NOTIF_EVENTS[r.Event].rahasia) r.Pesan = '[isi disamarkan setelah terkirim]'; }
      else { r.Percobaan = num_(r.Percobaan) + 1; r.Pesan_Error = h.respon; if (r.Percobaan >= 3) { r.Status = 'Gagal'; gagal++; if (NOTIF_EVENTS[r.Event] && NOTIF_EVENTS[r.Event].rahasia) r.Pesan = '[isi disamarkan]'; } }
      if (r.ID_Blast) { const s = statBlast[r.ID_Blast] || (statBlast[r.ID_Blast] = { t: 0, g: 0 }); if (r.Status === 'Terkirim') s.t++; if (r.Status === 'Gagal') s.g++; }
      tulis.push(r);
    });
    if (tulis.length) DB.write('LogNotif', tulis);
    perbaruiBlast_(statBlast, rows, hasil);
    if (kontakKirim.length) crmCatatKirim_(kontakKirim);
  });
  // Majukan penunjuk antrean
  let pertama = 0, sisa = 0;
  rows.forEach(function (r) {
    const h = hasil[r.ID_Log], masihAntre = r.Status === 'Antre' && (!h || (!h.ok && !h.batal && num_(r.Percobaan) + 1 < 3));
    if (masihAntre) { sisa++; if (!pertama) pertama = r._row; }
  });
  setProps_({ ANTRIAN_MULAI: String(pertama || last + 1), ANTRIAN_ADA: sisa ? '1' : '0' });
  return { terkirim: terkirim, gagal: gagal, sisa: sisa, senyap: senyap };
}

function perbaruiBlast_(stat, rows, hasil) {
  const ids = Object.keys(stat); if (!ids.length) return;
  const all = DB.all('BlastWA', true), ubah = [];
  all.forEach(function (b) {
    if (!stat[b.ID_Blast]) return;
    b.Terkirim = num_(b.Terkirim) + stat[b.ID_Blast].t; b.Gagal = num_(b.Gagal) + stat[b.ID_Blast].g;
    const sisa = rows.filter(function (r) { const h = hasil[r.ID_Log]; return r.ID_Blast === b.ID_Blast && r.Status === 'Antre' && !(h && (h.ok || h.batal || num_(r.Percobaan) + 1 >= 3)); }).length;
    if (!sisa && b.Terkirim + b.Gagal >= b.Total) { b.Status = 'Selesai'; b.Selesai_Pada = nowIso_(); }
    ubah.push(b);
  });
  if (ubah.length) DB.write('BlastWA', ubah);
}

function htmlEmail_(subjek, pesan) {
  const isi = esc_(pesan).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#262626">$1</a>').replace(/\n/g, '<br>');
  return '<div style="font-family:Arial,sans-serif;background:#EEF2FB;padding:20px"><div style="max-width:560px;margin:auto;background:#fff;border-radius:18px;overflow:hidden">' +
    '<div style="background:#262626;color:#D8F43C;padding:16px 22px;font-weight:bold">' + esc_(setting_('NAMA_LEMBAGA')) + '</div>' +
    '<div style="padding:22px;color:#161616;font-size:14px;line-height:1.6"><div style="font-size:16px;font-weight:bold;margin-bottom:10px">' + esc_(subjek || '') + '</div>' + isi + '</div>' +
    '<div style="padding:12px 22px;background:#F6F7FB;color:#6B7280;font-size:11px">Pesan otomatis dari ' + APP_NAME + '.</div></div></div>';
}

/** Tugas latar ringan saat antrean kosong: deteksi WA otomatis & sinkron CRM terjadwal. */
function tugasLatar_() {
  const now = Date.now();
  if (setting_('WA_DETEKSI_OTOMATIS') === 'YA' && waAktif_() && now - num_(prop_('DETEKSI_WA_TERAKHIR'), 0) > 10 * 60000) {
    setProp_('DETEKSI_WA_TERAKHIR', String(now));
    const belum = DB.all('CRM_Kontak').filter(function (k) { return k.No_WA && !k.StatusWA && k.Opt_Out !== 'YA'; }).slice(0, 50).map(function (k) { return k.No_WA; });
    if (belum.length) validasiNomor_(belum);
  }
  const menit = Math.max(5, num_(setting_('CRM_SYNC_MENIT', '30'), 30));
  if (now - num_(prop_('CRM_SYNC_TERAKHIR'), 0) > menit * 60000) withLock_(function () { crmSync_(); });
}

/* ---------------- Fonnte ---------------- */
function fonnte_(path, payload) {
  const token = prop_('FONNTE_TOKEN');
  if (!token) return { status: false, reason: 'Token Fonnte belum diisi.' };
  try {
    const r = UrlFetchApp.fetch(FONNTE_API + path, { method: 'post', headers: { Authorization: token }, payload: payload || {}, muteHttpExceptions: true });
    try { return JSON.parse(r.getContentText()); } catch (e) { return { status: false, reason: String(r.getContentText()).substring(0, 120) }; }
  } catch (e) { return { status: false, reason: 'Koneksi Fonnte gagal: ' + e.message }; }
}
/** 1 permintaan per batch (parameter data); fallback 1 permintaan/pesan paralel. */
function fonnteKirimBanyak_(pesan, jeda) {
  if (!pesan.length) return [];
  const data = pesan.map(function (m) { return { target: m.target, message: m.message, delay: String(jeda || '2'), countryCode: '62' }; });
  const res = fonnte_('/send', { data: JSON.stringify(data) });
  if (res && res.status) return pesan.map(function (m, i) { return { ok: true, respon: 'OK ' + ([].concat(res.id || [])[i] || '') }; });
  const token = prop_('FONNTE_TOKEN');
  if (!token) return pesan.map(function () { return { ok: false, respon: 'Token Fonnte belum diisi' }; });
  const resps = UrlFetchApp.fetchAll(pesan.map(function (m) {
    return { url: FONNTE_API + '/send', method: 'post', headers: { Authorization: token }, payload: { target: m.target, message: m.message, countryCode: '62' }, muteHttpExceptions: true };
  }));
  return resps.map(function (r) {
    try { const j = JSON.parse(r.getContentText()); return { ok: !!j.status, respon: j.status ? 'OK' : (j.reason || 'Ditolak') }; }
    catch (e) { return { ok: false, respon: 'HTTP ' + r.getResponseCode() }; }
  });
}

function apiWaDevice_() {
  const r = fonnte_('/device', {});
  if (!r || r.status === false && !r.device) return fail_('Gagal cek perangkat: ' + (r && r.reason || 'tidak ada respons'));
  return ok_({ device: r.device, status: r.device_status, paket: r.package, kuota: r.quota, kedaluwarsa: r.expired });
}
function apiWaTest_(ctx, d) {
  if (!hpValid_(d.nomor)) return fail_('Nomor tidak valid.');
  const r = fonnte_('/send', { target: hp62_(d.nomor), message: 'Tes WhatsApp dari ' + setting_('NAMA_LEMBAGA') + ' (' + APP_NAME + ') ✅', countryCode: '62' });
  return r && r.status ? ok_(null, 'Pesan tes terkirim ke ' + hp08_(d.nomor) + '.') : fail_('Gagal: ' + (r && r.reason || 'tidak ada respons'));
}
function apiEmailTest_(ctx, d) {
  if (!emailValid_(d.email)) return fail_('Email tidak valid.');
  MailApp.sendEmail({ to: d.email, subject: 'Tes Email ' + APP_NAME, htmlBody: htmlEmail_('Tes Email', 'Assalamu\'alaikum,\nIni pesan tes dari *' + APP_NAME + '*. Notifikasi email berfungsi ✅'), name: setting_('EMAIL_NAMA_PENGIRIM', APP_NAME) });
  return ok_(null, 'Email tes terkirim ke ' + d.email + '.');
}

/* ---------------- deteksi nomor WhatsApp ---------------- */
function validasiNomor_(nomor) {
  const unik = []; const seen = {};
  nomor.forEach(function (n) { const x = hp08_(n); if (hpValid_(x) && !seen[x]) { seen[x] = 1; unik.push(x); } });
  if (!unik.length) return { peta: {}, cek: 0 };
  const r = fonnte_('/validate', { target: unik.slice(0, 50).map(hp62_).join(','), countryCode: '62' });
  if (!r || !r.status) throw err_('Cek nomor gagal: ' + (r && r.reason || 'paket Fonnte mungkin belum mendukung fitur validate.'));
  const peta = {};
  [].concat(r.registered || []).forEach(function (n) { peta[hp08_(n)] = 'Terdaftar'; });
  [].concat(r.not_registered || []).forEach(function (n) { peta[hp08_(n)] = 'Tidak Terdaftar'; });
  withLock_(function () {
    const now = nowIso_();
    [['Wali', 'No_WA'], ['Muhaffidz', 'No_WA'], ['CRM_Kontak', 'No_WA']].forEach(function (x) {
      const ubah = DB.all(x[0], true).filter(function (row) { return peta[row[x[1]]] && row.StatusWA !== peta[row[x[1]]]; });
      ubah.forEach(function (row) { row.StatusWA = peta[row[x[1]]]; row.CekWAAt = now; });
      if (ubah.length) DB.write(x[0], ubah);
    });
  });
  return { peta: peta, cek: unik.slice(0, 50).length };
}
function apiWaValidate_(ctx, d) {
  const r = validasiNomor_([].concat(d.nomor || []));
  const ya = Object.keys(r.peta).filter(function (k) { return r.peta[k] === 'Terdaftar'; }).length;
  return ok_(r, r.cek + ' nomor dicek: ' + ya + ' terdaftar WhatsApp.');
}

/* ---------------- blast per batch ---------------- */
function apiWaAudience_(ctx, d) {
  const sumber = d.sumber || 'crm', rows = [];
  if (sumber === 'manual') {
    String(d.teks || '').split(/\n/).forEach(function (b) {
      const p = b.split('|'), hp = hp08_(p[0]); if (!p[0] || !p[0].trim()) return;
      rows.push({ id: '', nama: str_(p[1] || '', 80) || 'Bapak/Ibu', hp: hp, statusWA: '', optOut: false, vars: {} });
    });
  } else {
    const I = idx_();
    DB.all('CRM_Kontak').forEach(function (k) {
      if (/^merged/.test(k.Tag)) return;
      if (d.segmen && k.Segmen !== d.segmen) return;
      if (d.tag && String(k.Tag).split(',').map(function (t) { return t.trim(); }).indexOf(d.tag) === -1) return;
      if (d.statusWA && (k.StatusWA || 'Belum dicek') !== d.statusWA) return;
      let info = {}; try { info = JSON.parse(k.Info || '{}'); } catch (e) { }
      if (d.halaqah && String(info.Halaqah || '').split(',').indexOf(d.halaqah) === -1) return;
      if (d.ids && d.ids.length && d.ids.indexOf(k.ID_Kontak) === -1) return;
      rows.push({ id: k.ID_Kontak, nama: k.Nama, hp: k.No_WA, statusWA: k.StatusWA, optOut: k.Opt_Out === 'YA',
        vars: { anak: info.Anak || '', halaqah: (String(info.Halaqah || '').split(',').map(function (h) { return (I.halaqah[h] || {}).Nama_Halaqah || ''; }).filter(String).join(', ')) } });
    });
  }
  const seen = {}, ringkas = { total: rows.length, valid: 0, tidakValid: 0, ganda: 0, terdaftarWA: 0, tidakTerdaftarWA: 0, optOut: 0 };
  rows.forEach(function (r) {
    r.valid = hpValid_(r.hp); r.ganda = !!(r.valid && seen[r.hp]); if (r.valid) seen[r.hp] = 1;
    if (!r.valid) ringkas.tidakValid++; else if (r.ganda) ringkas.ganda++; else ringkas.valid++;
    if (r.statusWA === 'Terdaftar') ringkas.terdaftarWA++; if (r.statusWA === 'Tidak Terdaftar') ringkas.tidakTerdaftarWA++;
    if (r.optOut) ringkas.optOut++;
  });
  return ok_({ rows: rows.slice(0, 5000), ringkas: ringkas });
}
function apiWaBlastCreate_(ctx, d) {
  const pesan = str_(d.pesan, 3000), judul = str_(d.judul, 120) || 'Blast ' + today_();
  const ukuran = Number(d.ukuranBatch), jeda = String(d.jeda || setting_('WA_JEDA_DETIK', '5'));
  if (!pesan) return fail_('Isi pesan wajib diisi.');
  if ([10, 20, 50].indexOf(ukuran) === -1) return fail_('Ukuran batch harus 10, 20, atau 50.');
  if (!/^\d{1,3}(-\d{1,3})?$/.test(jeda)) return fail_('Jeda berformat 5 atau 3-8.');
  if (!waAktif_()) return fail_('WhatsApp belum aktif. Isi token Fonnte & nyalakan saklar di Konfigurasi.');
  const opt = {}; DB.all('CRM_Kontak').forEach(function (k) { if (k.Opt_Out === 'YA') opt[k.No_WA] = 1; });
  const seen = {}, dasar = { institusi: setting_('NAMA_LEMBAGA'), link: setting_('APP_URL') }, now = nowIso_(), rows = [];
  let dibuang = 0;
  [].concat(d.penerima || []).slice(0, 5000).forEach(function (p) {
    const hp = hp08_(p.hp);
    if (!hpValid_(hp) || seen[hp] || opt[hp]) { dibuang++; return; }
    seen[hp] = 1;
    rows.push(barisAntrian_('WA', hp62_(hp), p.nama, '', isiTemplate_(pesan, Object.assign({}, dasar, p.vars || {}, { nama: p.nama || 'Bapak/Ibu' })), 'BLAST', p.id || '', '', '', now));
  });
  if (!rows.length) return fail_('Tidak ada penerima valid.');
  const idB = reserveIds_('BlastWA', 1)[0];
  rows.forEach(function (r) { r.ID_Blast = idB; });
  const ids = reserveIds_('LogNotif', rows.length); rows.forEach(function (r, i) { r.ID_Log = ids[i]; });
  DB.append('LogNotif', rows);
  DB.append('BlastWA', [{ ID_Blast: idB, Judul: judul, Pesan: pesan, Sasaran: str_(d.sasaran, 200), Total: rows.length, Terkirim: 0, Gagal: 0, Ukuran_Batch: ukuran,
    Jeda_Detik: jeda, Status: 'Berjalan', Dibuat_Oleh: ctx.session.nama || ctx.session.email, Tanggal: now, Selesai_Pada: '' }]);
  setProp_('ANTRIAN_ADA', '1');
  const res = ok_({ blastId: idB, total: rows.length, dibuang: dibuang, batch: Math.ceil(rows.length / ukuran) }, 'Blast dibuat: ' + rows.length + ' penerima dalam ' + Math.ceil(rows.length / ukuran) + ' batch.');
  res.auditEntitas = 'Blast:' + idB; res.auditDetail = judul + ' • ' + rows.length + ' penerima';
  return res;
}
function apiWaBlastProcess_(ctx, d) {
  const r = prosesAntrianNotif({ paksa: true, blastId: str_(d.blastId, 20), hanyaBlast: true });
  return ok_({ hasil: r, blast: daftarBlast_().filter(function (b) { return b.ID_Blast === d.blastId; })[0] || null });
}
function apiWaBlastStop_(ctx, d) {
  const id = str_(d.blastId, 20), m = {}; m[id] = 1;
  const rows = DB.byNilai('LogNotif', 'ID_Blast', m).filter(function (r) { return r.Status === 'Antre'; });
  rows.forEach(function (r) { r.Status = 'Batal'; });
  if (rows.length) DB.write('LogNotif', rows);
  const b = DB.all('BlastWA', true).filter(function (x) { return x.ID_Blast === id; })[0];
  if (b) { b.Status = 'Dihentikan'; b.Selesai_Pada = nowIso_(); DB.write('BlastWA', [b]); }
  const res = ok_({ dibatalkan: rows.length }, 'Blast dihentikan, ' + rows.length + ' pesan dibatalkan.');
  res.auditEntitas = 'Blast:' + id; res.auditDetail = 'stop';
  return res;
}
function daftarBlast_() {
  return DB.all('BlastWA').slice(-100).reverse().map(function (b) {
    const o = Object.assign({}, b); delete o._row;
    o.persen = b.Total ? Math.round((num_(b.Terkirim) + num_(b.Gagal)) / b.Total * 100) : 0; o.sisa = Math.max(0, b.Total - num_(b.Terkirim) - num_(b.Gagal));
    return o;
  });
}
function apiWaBlastList_() { return ok_(daftarBlast_()); }

/* ---------------- pemantauan antrean ---------------- */
function apiNotifQueue_(ctx, d) {
  const all = DB.tail('LogNotif', 3000).reverse();
  const ringkas = { Antre: 0, Terkirim: 0, Gagal: 0, Batal: 0 };
  all.forEach(function (r) { ringkas[r.Status] = (ringkas[r.Status] || 0) + 1; });
  const rows = all.filter(function (r) { return (!d.status || r.Status === d.status) && (!d.kanal || r.Kanal === d.kanal) && (!d.blastId || r.ID_Blast === d.blastId); })
    .slice(0, 300).map(function (r) {
      return { id: r.ID_Log, waktu: r.Waktu, kanal: r.Kanal, tujuan: r.Kanal === 'WA' ? hp08_(r.Tujuan) : r.Tujuan, nama: r.Nama_Penerima, event: r.Event,
        pesan: String(r.Pesan).substring(0, 160), status: r.Status, percobaan: r.Percobaan, error: r.Pesan_Error, dikirim: r.Dikirim_Pada, blast: r.ID_Blast };
    });
  return ok_({ ringkas: ringkas, rows: rows, senyap: dalamJamSenyap_(), antrean: prop_('ANTRIAN_ADA') === '1' });
}
function apiNotifRetry_(ctx, d) {
  const all = DB.tail('LogNotif', 5000).filter(function (r) { return r.Status === 'Gagal' && (!d.ids || d.ids.indexOf(r.ID_Log) > -1); });
  all.forEach(function (r) { r.Status = 'Antre'; r.Percobaan = 0; r.Pesan_Error = ''; });
  if (all.length) { DB.write('LogNotif', all); setProps_({ ANTRIAN_ADA: '1', ANTRIAN_MULAI: String(Math.min.apply(null, all.map(function (r) { return r._row; }).concat([num_(prop_('ANTRIAN_MULAI'), 2)]))) }); }
  const res = ok_({ diulang: all.length }, all.length + ' pesan gagal dimasukkan ulang ke antrean.');
  res.auditEntitas = 'Antrean'; res.auditDetail = 'retry ' + all.length;
  return res;
}
function apiNotifProcessNow_() { const r = prosesAntrianNotif({ paksa: true }); return ok_(r, r.info || ('Terkirim ' + (r.terkirim || 0) + ', sisa ' + (r.sisa || 0) + (r.senyap ? ' (jam senyap: pesan otomatis ditahan)' : '') + '.')); }

/* ================================================================
 *  CRM KONTAK — Nama · Email · WhatsApp
 * ================================================================ */
const SUMBER_KONTAK = {
  wali: { tabel: 'Wali', id: 'ID_Wali', nama: 'Nama', email: 'Email', hp: 'No_WA', segmen: 'Wali Santri', grupHp: true },
  muhaffidz: { tabel: 'Muhaffidz', id: 'ID_Muhaffidz', nama: 'Nama', email: 'Email_Google', hp: 'No_WA', segmen: 'Muhaffidz', status: 'Status', info: ['Peran'] }
};

/** Sinkron sumber → CRM_Kontak. Idempoten; Tag/Opt_Out/Catatan milik CRM tidak ditimpa. */
function crmSync_() {
  const lama = DB.all('CRM_Kontak', true), idx = {}, I = idx_();
  lama.forEach(function (k, i) { idx[k.Sumber + ':' + k.Ref_ID] = i; });
  const baru = [], ubah = [], now = nowIso_();
  Object.keys(SUMBER_KONTAK).forEach(function (kode) {
    const s = SUMBER_KONTAK[kode], kandidat = {};
    DB.all(s.tabel).forEach(function (r) {
      const hp = hp08_(r[s.hp]), email = s.email ? String(r[s.email] || '').trim().toLowerCase() : '';
      if (!r[s.nama] && !hp && !email) return;
      const ref = s.grupHp && hp ? hp : r[s.id];
      const k = kandidat[ref] || (kandidat[ref] = { Nama: r[s.nama], Email: email, No_WA: hp, info: {}, anak: [], hq: [], status: r.StatusWA || '', cek: r.CekWAAt || '' });
      if (!k.Email && email) k.Email = email;
      if (s.grupHp) {
        const sn = I.santri[r.ID_Santri];
        if (sn && sn.Status !== 'Nonaktif') { k.anak.push(sn.Nama); if (sn.ID_Halaqah && k.hq.indexOf(sn.ID_Halaqah) === -1) k.hq.push(sn.ID_Halaqah); }
        k.info.Hubungan = r.Hubungan;
      }
      (s.info || []).forEach(function (f) { k.info[f] = r[f]; });
      if (s.status) k.info.Status = r[s.status];
    });
    Object.keys(kandidat).forEach(function (ref) {
      const c = kandidat[ref];
      if (s.grupHp) { c.info.Anak = c.anak.join(', '); c.info.Halaqah = c.hq.join(','); }
      const data = { Nama: c.Nama, Email: c.Email, No_WA: c.No_WA, Segmen: s.segmen, Sumber: kode, Ref_ID: ref,
        Email_Valid: c.Email ? (emailValid_(c.Email) ? 'YA' : 'TIDAK') : '', Info: JSON.stringify(c.info), Diubah_Pada: now };
      const key = kode + ':' + ref;
      if (idx[key] === undefined) {
        baru.push(Object.assign({ ID_Kontak: '', Tag: '', StatusWA: c.status, CekWAAt: c.cek, Opt_Out: 'TIDAK', Catatan: '', Jumlah_Pesan: 0, Terakhir_Dihubungi: '', Dibuat_Pada: now }, data));
      } else {
        const L = lama[idx[key]];
        const berubah = ['Nama', 'Email', 'No_WA', 'Info'].some(function (f) { return String(L[f]) !== String(data[f]); }) || (!L.StatusWA && c.status);
        if (berubah) { Object.assign(L, data); if (!L.StatusWA && c.status) { L.StatusWA = c.status; L.CekWAAt = c.cek; } ubah.push(L); }
      }
    });
  });
  if (baru.length) { const ids = reserveIds_('CRM_Kontak', baru.length); baru.forEach(function (b, i) { b.ID_Kontak = ids[i]; }); DB.append('CRM_Kontak', baru); }
  if (ubah.length) DB.write('CRM_Kontak', ubah);
  setProp_('CRM_SYNC_TERAKHIR', String(Date.now()));
  return { ditambah: baru.length, diperbarui: ubah.length, total: lama.length + baru.length };
}
function apiCrmSync_(ctx) {
  const r = crmSync_();
  const res = ok_(r, 'Sinkron CRM: +' + r.ditambah + ' baru, ' + r.diperbarui + ' diperbarui.');
  res.auditEntitas = 'CRM'; res.auditDetail = JSON.stringify(r);
  return res;
}
function crmCatatKirim_(tujuan) {
  const hit = {}; tujuan.forEach(function (t) { const k = /@/.test(t) ? String(t).toLowerCase() : hp08_(t); hit[k] = (hit[k] || 0) + 1; });
  const now = nowIso_(), ubah = [];
  DB.all('CRM_Kontak', true).forEach(function (k) {
    const n = (hit[k.No_WA] || 0) + (k.Email ? hit[String(k.Email).toLowerCase()] || 0 : 0);
    if (n) { k.Jumlah_Pesan = num_(k.Jumlah_Pesan) + n; k.Terakhir_Dihubungi = now; ubah.push(k); }
  });
  if (ubah.length) DB.write('CRM_Kontak', ubah);
}

function kontakTampil_(k, dupe) {
  let info = {}; try { info = JSON.parse(k.Info || '{}'); } catch (e) { }
  return { id: k.ID_Kontak, nama: k.Nama, email: k.Email, wa: k.No_WA, segmen: k.Segmen, sumber: k.Sumber, ref: k.Ref_ID, tag: k.Tag, statusWA: k.StatusWA || '',
    emailValid: k.Email_Valid, optOut: k.Opt_Out === 'YA', catatan: k.Catatan, jumlahPesan: num_(k.Jumlah_Pesan), terakhir: k.Terakhir_Dihubungi, info: info,
    duplikat: !!dupe, masalah: !hpValid_(k.No_WA) && k.Email_Valid !== 'YA' };
}
function petaDuplikat_(rows) {
  const n = {}, e = {}, out = {};
  rows.forEach(function (k) { if (k.No_WA) (n[k.No_WA] = n[k.No_WA] || []).push(k.ID_Kontak); if (k.Email) (e[k.Email] = e[k.Email] || []).push(k.ID_Kontak); });
  [n, e].forEach(function (m) { Object.keys(m).forEach(function (x) { if (m[x].length > 1) m[x].forEach(function (id) { out[id] = 1; }); }); });
  return out;
}
function apiCrmList_(ctx, d) {
  let rows = DB.all('CRM_Kontak').filter(function (k) { return !/^merged/.test(k.Tag); });
  const dup = petaDuplikat_(rows), q = String(d.cari || '').toLowerCase().trim(), facet = { segmen: {}, statusWA: {} };
  rows.forEach(function (k) { facet.segmen[k.Segmen] = (facet.segmen[k.Segmen] || 0) + 1; const s = k.StatusWA || 'Belum dicek'; facet.statusWA[s] = (facet.statusWA[s] || 0) + 1; });
  rows = rows.filter(function (k) {
    if (d.segmen && k.Segmen !== d.segmen) return false;
    if (d.tag && String(k.Tag).split(',').map(function (t) { return t.trim(); }).indexOf(d.tag) === -1) return false;
    if (d.statusWA && (k.StatusWA || 'Belum dicek') !== d.statusWA) return false;
    if (d.emailValid && k.Email_Valid !== d.emailValid) return false;
    if (d.optOut && (k.Opt_Out === 'YA') !== (d.optOut === 'YA')) return false;
    if (d.duplikat && !dup[k.ID_Kontak]) return false;
    if (q && (k.Nama + ' ' + k.Email + ' ' + k.No_WA + ' ' + k.Info).toLowerCase().indexOf(q) === -1) return false;
    return true;
  }).sort(function (a, b) { return String(a.Nama).localeCompare(String(b.Nama)); });
  const per = Math.min(200, Math.max(10, num_(d.per, 50))), page = Math.max(0, num_(d.halaman, 0));
  return ok_({ rows: rows.slice(page * per, page * per + per).map(function (k) { return kontakTampil_(k, dup[k.ID_Kontak]); }), total: rows.length, halaman: page, per: per,
    facet: facet, syncTerakhir: num_(prop_('CRM_SYNC_TERAKHIR'), 0) });
}
function apiCrmStats_() {
  const rows = DB.all('CRM_Kontak').filter(function (k) { return !/^merged/.test(k.Tag); }), dup = petaDuplikat_(rows), batas7 = tambahHari_(today_(), -7), batas30 = tambahHari_(today_(), -30);
  const s = { total: rows.length, waValid: 0, terdaftarWA: 0, emailValid: 0, belumCek: 0, optOut: 0, duplikat: Object.keys(dup).length, tidakBisa: 0, baru7: 0, dihubungi30: 0, segmen: {} };
  rows.forEach(function (k) {
    if (hpValid_(k.No_WA)) s.waValid++; if (k.StatusWA === 'Terdaftar') s.terdaftarWA++; if (k.Email_Valid === 'YA') s.emailValid++;
    if (hpValid_(k.No_WA) && !k.StatusWA) s.belumCek++; if (k.Opt_Out === 'YA') s.optOut++;
    if (!hpValid_(k.No_WA) && k.Email_Valid !== 'YA') s.tidakBisa++;
    if (String(k.Dibuat_Pada).substring(0, 10) >= batas7) s.baru7++;
    if (String(k.Terakhir_Dihubungi).substring(0, 10) >= batas30) s.dihubungi30++;
    s.segmen[k.Segmen] = (s.segmen[k.Segmen] || 0) + 1;
  });
  return ok_(s);
}
function apiCrmDetail_(ctx, d) {
  const k = DB.all('CRM_Kontak').filter(function (x) { return x.ID_Kontak === d.kontakId; })[0];
  if (!k) return fail_('Kontak tidak ditemukan.');
  const m = {}; m[d.kontakId] = 1;
  const inter = DB.byNilai('CRM_Interaksi', 'ID_Kontak', m, 50).map(function (r) { return { waktu: r.Tanggal, kanal: r.Kanal, arah: r.Arah, ringkasan: r.Ringkasan, oleh: r.Oleh }; });
  const tuj = {}; if (k.No_WA) tuj[hp62_(k.No_WA)] = 1; if (k.Email) tuj[k.Email] = 1;
  const pesan = DB.tail('LogNotif', 3000).filter(function (r) { return tuj[r.Tujuan]; }).slice(-50).reverse()
    .map(function (r) { return { waktu: r.Waktu, kanal: r.Kanal, arah: 'Keluar', ringkasan: (r.Event || '') + ': ' + String(r.Pesan).substring(0, 120), status: r.Status, oleh: 'Sistem' }; });
  const timeline = inter.concat(pesan).sort(function (a, b) { return String(b.waktu).localeCompare(String(a.waktu)); }).slice(0, 80);
  return ok_({ kontak: kontakTampil_(k, false), timeline: timeline });
}
function apiCrmSave_(ctx, d) {
  const v = d.kontak || {}, rows = DB.all('CRM_Kontak', true), k = rows.filter(function (x) { return x.ID_Kontak === v.id; })[0];
  if (!k) return fail_('Kontak tidak ditemukan.');
  if (v.tag !== undefined) k.Tag = str_(v.tag, 200);
  if (v.catatan !== undefined) k.Catatan = str_(v.catatan, 1000);
  if (v.optOut !== undefined) k.Opt_Out = v.optOut ? 'YA' : 'TIDAK';
  if (k.Sumber === 'manual') {
    if (v.nama !== undefined) k.Nama = str_(v.nama, 120);
    if (v.email !== undefined) { k.Email = str_(v.email, 120).toLowerCase(); k.Email_Valid = k.Email ? (emailValid_(k.Email) ? 'YA' : 'TIDAK') : ''; }
    if (v.wa !== undefined) { const hp = hp08_(v.wa); if (hp && !hpValid_(hp)) return fail_('Nomor WA tidak valid.'); if (hp !== k.No_WA) { k.StatusWA = ''; k.CekWAAt = ''; } k.No_WA = hp; }
  }
  k.Diubah_Pada = nowIso_();
  DB.write('CRM_Kontak', [k]);
  const res = ok_(kontakTampil_(k, false), 'Kontak tersimpan.' + (k.Sumber !== 'manual' && (v.nama !== undefined || v.wa !== undefined) ? ' (Nama/WA kontak dari data wali/muhaffidz diubah lewat menu Halaqah & Santri.)' : ''));
  res.auditEntitas = 'CRM:' + k.ID_Kontak; res.auditDetail = 'ubah';
  return res;
}
function apiCrmBulk_(ctx, d) {
  const ids = [].concat(d.ids || []), aksi = d.aksi, nilai = str_(d.nilai, 60);
  const rows = DB.all('CRM_Kontak', true).filter(function (k) { return ids.indexOf(k.ID_Kontak) > -1; });
  if (!rows.length) return fail_('Pilih kontak terlebih dahulu.');
  if (aksi === 'deteksiWA') { const r = validasiNomor_(rows.map(function (k) { return k.No_WA; })); return ok_(r, r.cek + ' nomor dicek.'); }
  if (aksi === 'hapusManual') {
    const hapus = rows.filter(function (k) { return k.Sumber === 'manual'; });
    if (hapus.length) DB.hapus('CRM_Kontak', hapus.map(function (k) { return k._row; }));
    return ok_({ n: hapus.length }, hapus.length + ' kontak manual dihapus.');
  }
  rows.forEach(function (k) {
    const tags = String(k.Tag || '').split(',').map(function (t) { return t.trim(); }).filter(String);
    if (aksi === 'tag' && nilai && tags.indexOf(nilai) === -1) tags.push(nilai);
    if (aksi === 'untag') { const i = tags.indexOf(nilai); if (i > -1) tags.splice(i, 1); }
    k.Tag = tags.join(', ');
    if (aksi === 'optout') k.Opt_Out = 'YA';
    if (aksi === 'optin') k.Opt_Out = 'TIDAK';
    k.Diubah_Pada = nowIso_();
  });
  DB.write('CRM_Kontak', rows);
  const res = ok_({ n: rows.length }, rows.length + ' kontak diperbarui.');
  res.auditEntitas = 'CRM'; res.auditDetail = aksi + ' ' + nilai + ' • ' + rows.length;
  return res;
}
function apiCrmInteraksi_(ctx, d) {
  const kanal = ['Telepon', 'WA Manual', 'Kunjungan', 'Catatan'].indexOf(d.kanal) > -1 ? d.kanal : 'Catatan';
  if (!str_(d.ringkasan)) return fail_('Ringkasan interaksi wajib diisi.');
  const id = reserveIds_('CRM_Interaksi', 1)[0];
  DB.append('CRM_Interaksi', [{ ID_Interaksi: id, ID_Kontak: str_(d.kontakId, 20), Kanal: kanal, Arah: d.arah === 'Masuk' ? 'Masuk' : 'Keluar', Ringkasan: str_(d.ringkasan, 1000), Ref_ID: '', Oleh: ctx.session.nama || ctx.session.email, Tanggal: nowIso_() }]);
  return ok_({ id: id }, 'Interaksi dicatat.');
}
function apiCrmImport_(ctx, d) {
  const rows = (d.rows || []).slice(0, 3000), ada = {}, now = nowIso_(), baru = [];
  DB.all('CRM_Kontak', true).forEach(function (k) { if (k.Sumber === 'manual') ada[k.Ref_ID] = 1; });
  let lewat = 0;
  rows.forEach(function (r) {
    const hp = hp08_(r.wa || r.no_wa), email = str_(r.email, 120).toLowerCase(), nama = str_(r.nama, 120);
    if (!nama || (!hpValid_(hp) && !emailValid_(email))) { lewat++; return; }
    const ref = hp || email; if (ada[ref]) { lewat++; return; } ada[ref] = 1;
    baru.push({ ID_Kontak: '', Nama: nama, Email: email, No_WA: hpValid_(hp) ? hp : '', Segmen: str_(r.segmen, 60) || 'Kontak Luar', Sumber: 'manual', Ref_ID: ref, Tag: str_(r.tag, 120),
      StatusWA: '', CekWAAt: '', Email_Valid: email ? (emailValid_(email) ? 'YA' : 'TIDAK') : '', Opt_Out: 'TIDAK', Catatan: '', Jumlah_Pesan: 0, Terakhir_Dihubungi: '', Info: '{}', Dibuat_Pada: now, Diubah_Pada: now });
  });
  if (baru.length) { const ids = reserveIds_('CRM_Kontak', baru.length); baru.forEach(function (b, i) { b.ID_Kontak = ids[i]; }); DB.append('CRM_Kontak', baru); }
  const res = ok_({ ditambah: baru.length, dilewati: lewat }, baru.length + ' kontak diimpor, ' + lewat + ' dilewati (tidak valid/ganda).');
  res.auditEntitas = 'CRM'; res.auditDetail = 'impor ' + baru.length;
  return res;
}
function apiCrmMerge_(ctx, d) {
  const rows = DB.all('CRM_Kontak', true), utama = rows.filter(function (k) { return k.ID_Kontak === d.utama; })[0];
  const gabung = rows.filter(function (k) { return [].concat(d.gabung || []).indexOf(k.ID_Kontak) > -1 && k.ID_Kontak !== d.utama; });
  if (!utama || !gabung.length) return fail_('Pilih kontak utama dan kontak yang digabung.');
  const tags = String(utama.Tag || '').split(',').map(function (t) { return t.trim(); }).filter(String);
  gabung.forEach(function (k) {
    String(k.Tag || '').split(',').map(function (t) { return t.trim(); }).filter(String).forEach(function (t) { if (tags.indexOf(t) === -1 && !/^merged/.test(t)) tags.push(t); });
    utama.Jumlah_Pesan = num_(utama.Jumlah_Pesan) + num_(k.Jumlah_Pesan);
    if (k.Catatan) utama.Catatan = (utama.Catatan ? utama.Catatan + '\n' : '') + k.Catatan;
    if (!utama.Email && k.Email) { utama.Email = k.Email; utama.Email_Valid = k.Email_Valid; }
    if (k.Opt_Out === 'YA') utama.Opt_Out = 'YA';
    k.Tag = 'merged→' + utama.ID_Kontak; k.Diubah_Pada = nowIso_();
  });
  utama.Tag = tags.join(', '); utama.Diubah_Pada = nowIso_();
  DB.write('CRM_Kontak', [utama].concat(gabung));
  const res = ok_(null, gabung.length + ' kontak digabung ke ' + utama.Nama + '.');
  res.auditEntitas = 'CRM:' + utama.ID_Kontak; res.auditDetail = 'merge ' + gabung.map(function (k) { return k.ID_Kontak; }).join(',');
  return res;
}
function apiCrmExport_(ctx, d) {
  let rows = DB.all('CRM_Kontak').filter(function (k) { return !/^merged/.test(k.Tag); });
  if (d.segmen) rows = rows.filter(function (k) { return k.Segmen === d.segmen; });
  const out = rows.map(function (k) { let info = {}; try { info = JSON.parse(k.Info || '{}'); } catch (e) { } return { Nama: k.Nama, Email: k.Email, WhatsApp: k.No_WA, Segmen: k.Segmen, Tag: k.Tag, StatusWA: k.StatusWA, OptOut: k.Opt_Out, Anak: info.Anak || '', JumlahPesan: k.Jumlah_Pesan, TerakhirDihubungi: k.Terakhir_Dihubungi }; });
  const res = ok_({ rows: out, total: out.length });
  res.auditEntitas = 'CRM'; res.auditDetail = 'ekspor ' + out.length + ' kontak';
  return res;
}

/* ===== Migrasi.gs ===== */
/**
 * ================================================================
 *  MutqinSpace — Migrasi.gs
 *  1) Migrasi SKEMA aditif (aman diulang): buat sheet/kolom yang belum ada,
 *     tidak pernah menghapus/menggeser data. Dipanggil setup & menu Pengaturan.
 *  2) IMPOR dari spreadsheet LAMA (mutaba'ah manual / versi lama MutqinSpace):
 *     baca berdasarkan NAMA header (+ alias), upsert kunci alami, dry-run,
 *     delta sync, sumber hanya DIBACA.
 *  3) Data contoh untuk pelatihan (isiDataContoh / hapusDataContoh).
 * ================================================================
 */

/* ================================================================
 *  1) MIGRASI SKEMA
 * ================================================================ */
function migrasiSkema() { const r = migrasiSkema_(false); Logger.log(JSON.stringify(r, null, 1)); }

function migrasiSkema_(dry) {
  const ss = DB.ss(), lap = { sheetBaru: [], kolomBaru: {}, settingBaru: 0, mudirAwal: '', ringkas: {} };
  Object.keys(SCHEMA).forEach(function (name) {
    const sc = SCHEMA[name];
    let sh = ss.getSheetByName(name);
    if (!sh) {
      lap.sheetBaru.push(name);
      if (dry) return;
      sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, sc.cols.length).setValues([sc.cols]);
      formatSheet_(sh, sc);
      return;
    }
    const lc = Math.max(1, sh.getLastColumn()), h = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (x) { return String(x).trim(); });
    const kosong = !h.some(String);
    const kurang = sc.cols.filter(function (c) { return h.indexOf(c) === -1; });
    if (kurang.length) {
      lap.kolomBaru[name] = kurang;
      if (!dry) { sh.getRange(1, kosong ? 1 : lc + 1, 1, kurang.length).setValues([kurang]); formatSheet_(sh, sc); }
    }
  });
  if (!dry) {
    const s1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('Lembar1');
    if (s1 && ss.getSheets().length > 1 && s1.getLastRow() === 0) ss.deleteSheet(s1);
    bump_('schema'); DB._h = {}; DB._sh = {};
    // seed pengaturan (hanya kunci yang belum ada)
    const ada = {}; DB.all('Pengaturan', true).forEach(function (r) { ada[r.Kunci] = 1; });
    const baru = SETTING_DEFAULT.filter(function (r) { return !ada[r[0]]; }).map(function (r) { return { Kunci: r[0], Nilai: r[1], Keterangan: r[2] }; });
    if (baru.length) { DB.append('Pengaturan', baru); lap.settingBaru = baru.length; }
    // Mudir awal = pemilik skrip (bila sheet Muhaffidz masih kosong)
    const owner = prop_('OWNER_EMAIL');
    if (owner && !DB.all('Muhaffidz', true).length) {
      const id = reserveIds_('Muhaffidz', 1)[0];
      DB.append('Muhaffidz', [{ ID_Muhaffidz: id, Nama: 'Mudir', Email_Google: owner.toLowerCase(), No_WA: '', Peran: 'Mudir', Status: 'Aktif', Foto_URL: '', Dibuat_Pada: nowIso_(), Diubah_Pada: nowIso_() }]);
      lap.mudirAwal = owner;
    }
    setProp_('SCHEMA_VERSION', String(SCHEMA_VERSION));
  }
  lap.ringkas = { sheetBaru: lap.sheetBaru.length, kolomBaru: Object.keys(lap.kolomBaru).reduce(function (t, k) { return t + lap.kolomBaru[k].length; }, 0) };
  return lap;
}

function formatSheet_(sh, sc) {
  const lc = sh.getLastColumn(), h = sh.getRange(1, 1, 1, lc).getValues()[0].map(String), num = {};
  (sc.angka || []).forEach(function (k) { num[k] = 1; });
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, lc).setFontWeight('bold').setBackground('#262626').setFontColor('#D8F43C');
  const n = Math.max(1, sh.getMaxRows() - 1);
  h.forEach(function (k, i) { if (k && !num[k]) sh.getRange(2, i + 1, n, 1).setNumberFormat('@'); });
}

function apiMigrasiSkema_(ctx, d) {
  const lap = migrasiSkema_(!!d.dryRun);
  if (!d.dryRun) { cerminAppConfig_(); apiSysSegarkan_(ctx); }
  const res = ok_(lap, d.dryRun ? 'Pemeriksaan skema selesai (tidak ada yang diubah).' : 'Skema diperbarui: ' + lap.ringkas.sheetBaru + ' sheet & ' + lap.ringkas.kolomBaru + ' kolom baru.');
  res.auditEntitas = 'Skema'; res.auditDetail = JSON.stringify(lap.ringkas);
  return res;
}

/* ================================================================
 *  2) IMPOR DARI SPREADSHEET LAMA
 *  Urutan wajib: master dulu (Muhaffidz → Halaqah → Santri → Wali → Target),
 *  baru transaksi (Setoran → Presensi → HafalanAwal).
 * ================================================================ */
const ALIAS_IMPOR = {
  Muhaffidz: { ID_Muhaffidz: ['ID_Muhaffidz', 'ID Guru', 'ID'], Nama: ['Nama', 'Nama Guru', 'Nama Muhaffidz', 'Nama Ustadz'], Email_Google: ['Email_Google', 'Email', 'Email Google'],
    No_WA: ['No_WA', 'No WA', 'WA', 'HP', 'No HP'], Peran: ['Peran', 'Role', 'Jabatan'], Status: ['Status'], Foto_URL: ['Foto_URL', 'Foto'] },
  Halaqah: { ID_Halaqah: ['ID_Halaqah', 'ID'], Nama_Halaqah: ['Nama_Halaqah', 'Nama Halaqah', 'Halaqah', 'Kelompok'], ID_Muhaffidz: ['ID_Muhaffidz', 'Guru', 'Muhaffidz'],
    Email_Muhaffidz: ['Email_Muhaffidz', 'Email Guru'], Jadwal: ['Jadwal'], Tingkat: ['Tingkat', 'Level'], Status: ['Status'] },
  Santri: { ID_Santri: ['ID_Santri', 'ID'], NIS: ['NIS', 'No Induk', 'Nomor Induk'], Nama: ['Nama', 'Nama Santri', 'Nama Lengkap'], Jenis_Kelamin: ['Jenis_Kelamin', 'JK', 'L/P', 'Jenis Kelamin'],
    Tanggal_Masuk: ['Tanggal_Masuk', 'Tanggal Masuk', 'Tgl Masuk'], ID_Halaqah: ['ID_Halaqah', 'Halaqah', 'Nama Halaqah'], Status: ['Status'], Foto_URL: ['Foto_URL', 'Foto'], PIN_Hash: ['PIN_Hash'] },
  Wali: { Nama: ['Nama', 'Nama Wali', 'Nama Orang Tua'], No_WA: ['No_WA', 'No WA', 'WA', 'HP', 'No HP Wali', 'WA Wali'], Email: ['Email', 'Email Wali'],
    ID_Santri: ['ID_Santri'], NIS: ['NIS', 'NIS Santri'], Hubungan: ['Hubungan'] },
  Target: { Level_atau_ID_Santri: ['Level_atau_ID_Santri', 'Sasaran', 'Level'], Periode: ['Periode'], Target_Juz_atau_Surah: ['Target_Juz_atau_Surah', 'Target'],
    Target_Murojaah: ['Target_Murojaah', 'Target Murojaah'], Keterangan: ['Keterangan'] },
  Setoran: { ID_Setoran: ['ID_Setoran', 'ID'], Tanggal: ['Tanggal', 'Tgl'], ID_Santri: ['ID_Santri'], NIS: ['NIS'], Jenis: ['Jenis', 'Jenis Setoran'], Surah: ['Surah', 'Nama Surah', 'No Surah'],
    Ayat_Dari: ['Ayat_Dari', 'Ayat Dari', 'Dari Ayat', 'Ayat Awal'], Ayat_Sampai: ['Ayat_Sampai', 'Ayat Sampai', 'Sampai Ayat', 'Ayat Akhir'],
    Jumlah_Baris_Halaman: ['Jumlah_Baris_Halaman', 'Halaman', 'Jumlah Halaman'], Nilai_Tajwid: ['Nilai_Tajwid', 'Tajwid', 'Nilai Tajwid'],
    Nilai_Kelancaran: ['Nilai_Kelancaran', 'Kelancaran', 'Nilai Kelancaran'], Catatan: ['Catatan', 'Keterangan'], ID_Muhaffidz: ['ID_Muhaffidz', 'Guru'] },
  Presensi: { Tanggal: ['Tanggal'], ID_Santri: ['ID_Santri'], NIS: ['NIS'], ID_Halaqah: ['ID_Halaqah', 'Halaqah'], Status: ['Status', 'Kehadiran'], Keterangan: ['Keterangan'] },
  HafalanAwal: { ID_Santri: ['ID_Santri'], NIS: ['NIS'], Ziyadah: ['Ziyadah'], Mutqin: ['Mutqin'], Total_Setoran: ['Total_Setoran'], Catatan: ['Catatan'] }
};
const URUTAN_IMPOR = ['Muhaffidz', 'Halaqah', 'Santri', 'Wali', 'Target', 'Setoran', 'Presensi', 'HafalanAwal'];

function bukaSumber_(idOrUrl) {
  const m = String(idOrUrl || '').match(/\/d\/([A-Za-z0-9_-]{20,})/);
  const id = m ? m[1] : String(idOrUrl || '').trim();
  if (!id) throw err_('Tempel URL atau ID spreadsheet lama.');
  if (id === prop_('SPREADSHEET_ID')) throw err_('Itu spreadsheet database aplikasi ini. Tempel spreadsheet LAMA.');
  try { return SpreadsheetApp.openById(id); }
  catch (e) { throw err_('Spreadsheet tidak bisa dibuka. Pastikan ID benar dan dapat diakses akun pemilik skrip.'); }
}
function bacaSumber_(ss, name) {
  const sh = ss.getSheetByName(name); if (!sh) return null;
  const v = sh.getDataRange().getValues(); if (v.length <= 1) return [];
  const h = v[0].map(function (x) { return String(x).trim(); }), alias = ALIAS_IMPOR[name] || {}, peta = {};
  Object.keys(alias).forEach(function (kol) { for (let i = 0; i < alias[kol].length; i++) { const j = h.indexOf(alias[kol][i]); if (j > -1) { peta[kol] = j; break; } } });
  return v.slice(1).filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    const o = {}; Object.keys(peta).forEach(function (k) { o[k] = normCell_(r[peta[k]], false, k); }); return o;
  });
}
function surahDariTeks_(v) {
  const n = Number(v); if (n >= 1 && n <= 114) return n;
  const t = String(v || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!t) return 0;
  for (let i = 0; i < DATA_SURAH.length; i++) { if (DATA_SURAH[i][0].toLowerCase().replace(/[^a-z]/g, '') === t) return i + 1; }
  for (let i = 0; i < DATA_SURAH.length; i++) { const x = DATA_SURAH[i][0].toLowerCase().replace(/[^a-z]/g, '').replace(/^(al|an|ar|as|at|az|ad|asy)/, ''); if (x && t.replace(/^(al|an|ar|as|at|az|ad|asy)/, '') === x) return i + 1; }
  return 0;
}
function nilaiDariTeks_(v) {
  if (v === '' || v === null) return '';
  const n = Number(v); if (!isNaN(n)) return n <= 10 ? n * 10 : n;
  const sk = skalaNilai_(), t = String(v).toLowerCase();
  for (let i = 0; i < sk.length; i++) if (String(sk[i].label).toLowerCase() === t) return Math.min(100, sk[i].min + 5);
  return '';
}

/** Rencana impor per sheet → {rows baru, ubah, lewat, peringatan}. Tidak menulis. */
function rencanaImpor_(ss, sheets, timpa) {
  const plan = {}, warn = [], petaId = { muhaffidz: {}, halaqah: {}, santri: {} };
  const tMhf = DB.all('Muhaffidz', true), tHq = DB.all('Halaqah', true), tSn = DB.all('Santri', true);
  const mhfByEmail = {}; tMhf.forEach(function (r) { mhfByEmail[String(r.Email_Google).toLowerCase()] = r; });
  const hqByNama = {}; tHq.forEach(function (r) { hqByNama[String(r.Nama_Halaqah).toLowerCase()] = r; });
  const snByNis = {}; tSn.forEach(function (r) { snByNis[String(r.NIS)] = r; });
  // peta ID lama → baru berdasar kunci alami (juga untuk sheet yang tidak dipilih)
  const srcMhf = bacaSumber_(ss, 'Muhaffidz') || [], srcHq = bacaSumber_(ss, 'Halaqah') || [], srcSn = bacaSumber_(ss, 'Santri') || [];
  srcMhf.forEach(function (r) { const t = mhfByEmail[String(r.Email_Google).toLowerCase()]; if (t && r.ID_Muhaffidz) petaId.muhaffidz[r.ID_Muhaffidz] = t.ID_Muhaffidz; });
  srcHq.forEach(function (r) { const t = hqByNama[String(r.Nama_Halaqah).toLowerCase()]; if (t && r.ID_Halaqah) petaId.halaqah[r.ID_Halaqah] = t.ID_Halaqah; });
  const nisLama = {}; srcSn.forEach(function (r) { if (r.ID_Santri) nisLama[r.ID_Santri] = String(r.NIS); const t = snByNis[String(r.NIS)]; if (t && r.ID_Santri) petaId.santri[r.ID_Santri] = t.ID_Santri; });
  // Penanda sementara untuk baris yang baru dibuat di impor yang sama: #NIS, @nama halaqah, !email muhaffidz
  const namaHqLama = {}; srcHq.forEach(function (r) { if (r.ID_Halaqah) namaHqLama[r.ID_Halaqah] = String(r.Nama_Halaqah || '').toLowerCase(); });
  const emailMhfLama = {}; srcMhf.forEach(function (r) { if (r.ID_Muhaffidz) emailMhfLama[r.ID_Muhaffidz] = String(r.Email_Google || '').toLowerCase(); });
  const resolveSantri = function (r) {
    const nis = r.NIS ? String(r.NIS) : nisLama[r.ID_Santri]; const t = nis && snByNis[nis];
    return t ? (t.ID_Santri || '#' + nis) : (petaId.santri[r.ID_Santri] || '');
  };
  const resolveHq = function (v) {
    if (!v) return ''; if (petaId.halaqah[v]) return petaId.halaqah[v];
    const nama = namaHqLama[v] || String(v).toLowerCase(), t = hqByNama[nama];
    return t ? (t.ID_Halaqah || '@' + nama) : '';
  };
  const resolveMhf = function (v) {
    if (!v) return ''; if (petaId.muhaffidz[v]) return petaId.muhaffidz[v];
    const email = emailMhfLama[v] || String(v).toLowerCase(), t = mhfByEmail[email];
    if (t) return t.ID_Muhaffidz || '!' + email;
    const g = tMhf.filter(function (x) { return String(x.Nama).toLowerCase() === String(v).toLowerCase(); })[0];
    return g ? g.ID_Muhaffidz : '';
  };
  URUTAN_IMPOR.filter(function (n) { return sheets.indexOf(n) > -1; }).forEach(function (name) {
    const src = bacaSumber_(ss, name);
    const p = plan[name] = { sumber: src ? src.length : 0, baru: [], ubah: [], lewat: 0, ada: !!src };
    if (!src) return;
    const now = nowIso_();
    if (name === 'Muhaffidz') {
      src.forEach(function (r) {
        const email = String(r.Email_Google || '').toLowerCase().trim();
        if (!emailValid_(email)) { p.lewat++; return; }
        const t = mhfByEmail[email];
        if (t) { if (timpa && (t.Nama !== r.Nama || (r.No_WA && t.No_WA !== hp08_(r.No_WA)))) { t.Nama = r.Nama || t.Nama; if (r.No_WA) t.No_WA = hp08_(r.No_WA); t.Diubah_Pada = now; p.ubah.push(t); } else p.lewat++; }
        else { const o = { Nama: r.Nama || email, Email_Google: email, No_WA: hp08_(r.No_WA), Peran: /mudir|kepala|admin/i.test(r.Peran) ? 'Mudir' : 'Muhaffidz', Status: r.Status === 'Nonaktif' ? 'Nonaktif' : 'Aktif', Foto_URL: r.Foto_URL || '', Dibuat_Pada: now, Diubah_Pada: now, _lama: r.ID_Muhaffidz };
          p.baru.push(o); mhfByEmail[email] = o; }
      });
    } else if (name === 'Halaqah') {
      src.forEach(function (r) {
        const nama = String(r.Nama_Halaqah || '').trim(); if (!nama) { p.lewat++; return; }
        const mhf = resolveMhf(r.ID_Muhaffidz) || resolveMhf(r.Email_Muhaffidz);
        const t = hqByNama[nama.toLowerCase()];
        if (t) { if (timpa && ((r.Jadwal && t.Jadwal !== r.Jadwal) || (r.Tingkat && t.Tingkat !== r.Tingkat))) { if (r.Jadwal) t.Jadwal = r.Jadwal; if (r.Tingkat) t.Tingkat = r.Tingkat; t.Diubah_Pada = now; p.ubah.push(t); } else p.lewat++; }
        else { if (!mhf) warn.push('Halaqah "' + nama + '": muhaffidz tidak ditemukan — isi manual setelah impor.');
          const o = { Nama_Halaqah: nama, ID_Muhaffidz: mhf, Jadwal: r.Jadwal || '', Tingkat: r.Tingkat || '', Status: r.Status === 'Nonaktif' ? 'Nonaktif' : 'Aktif', Dibuat_Pada: now, Diubah_Pada: now, _lama: r.ID_Halaqah };
          p.baru.push(o); hqByNama[nama.toLowerCase()] = o; }
      });
    } else if (name === 'Santri') {
      const seen = {};
      src.forEach(function (r) {
        const nis = String(r.NIS || '').trim(); if (!nis || !r.Nama) { p.lewat++; return; }
        if (seen[nis]) { warn.push('NIS ganda di sumber: ' + nis + ' (baris berikutnya dilewati)'); p.lewat++; return; } seen[nis] = 1;
        const hq = resolveHq(r.ID_Halaqah);
        const t = snByNis[nis];
        if (t) { if (timpa && (t.Nama !== r.Nama || (hq && t.ID_Halaqah !== hq))) { t.Nama = r.Nama; if (hq) t.ID_Halaqah = hq; t.Diubah_Pada = now; p.ubah.push(t); } else p.lewat++; }
        else { const o = { NIS: nis, Nama: r.Nama, Jenis_Kelamin: /^p/i.test(r.Jenis_Kelamin) ? 'P' : 'L', Tanggal_Masuk: r.Tanggal_Masuk || '', ID_Halaqah: hq, PIN_Hash: r.PIN_Hash || '',
          Foto_URL: fotoUrl_(r.Foto_URL), Status: STATUS_SANTRI.indexOf(r.Status) > -1 ? r.Status : 'Aktif', Catatan: 'Impor', Dibuat_Pada: now, Diubah_Pada: now, _lama: r.ID_Santri };
          p.baru.push(o); snByNis[nis] = o; }
      });
      if (src.some(function (r) { return r.PIN_Hash; })) warn.push('PIN_Hash dari sumber hanya berlaku bila pepper PIN sama. Bila wali gagal login, reset PIN dari menu Santri.');
    } else if (name === 'Wali') {
      const ada = {}; DB.all('Wali', true).forEach(function (w) { ada[w.ID_Santri + '|' + w.No_WA] = w; });
      src.forEach(function (r) {
        const sid = resolveSantri(r), hp = hp08_(r.No_WA);
        if (!sid && !r.NIS && !r.ID_Santri) { p.lewat++; return; }
        if (!hpValid_(hp) || !r.Nama) { p.lewat++; return; }
        const k = (sid || '?' + (r.NIS || r.ID_Santri)) + '|' + hp;
        if (ada[k]) { p.lewat++; return; }
        ada[k] = 1;
        p.baru.push({ Nama: r.Nama, No_WA: hp, Email: String(r.Email || '').toLowerCase(), ID_Santri: sid, _nis: r.NIS || nisLama[r.ID_Santri] || '', Hubungan: ['Ayah', 'Ibu', 'Wali'].indexOf(r.Hubungan) > -1 ? r.Hubungan : 'Wali', StatusWA: '', CekWAAt: '', Dibuat_Pada: now, Diubah_Pada: now });
      });
    } else if (name === 'Target') {
      const ada = {}; DB.all('Target', true).forEach(function (t) { ada[[t.Level_atau_ID_Santri, t.Periode, t.Target_Juz_atau_Surah].join('|').toLowerCase()] = 1; });
      src.forEach(function (r) {
        const k = [r.Level_atau_ID_Santri, r.Periode, r.Target_Juz_atau_Surah].join('|').toLowerCase();
        if (ada[k] || !parseTarget_(r.Target_Juz_atau_Surah) || !periodeRentang_(r.Periode)) { p.lewat++; return; }
        ada[k] = 1; p.baru.push({ Level_atau_ID_Santri: petaId.santri[r.Level_atau_ID_Santri] || r.Level_atau_ID_Santri, Periode: r.Periode, Target_Juz_atau_Surah: r.Target_Juz_atau_Surah, Target_Murojaah: r.Target_Murojaah || '', Keterangan: r.Keterangan || '', Dibuat_Pada: now, Diubah_Pada: now });
      });
    } else if (name === 'Setoran') {
      const ada = {};
      if (DB.lastRow('Setoran') >= 2) {
        const sh = DB.sh('Setoran'), H = DB.h('Setoran'), v = sh.getRange(2, 1, sh.getLastRow() - 1, H.length).getValues(), ix = {};
        H.forEach(function (k, i) { ix[k] = i; });
        v.forEach(function (r) { ada[[r[ix.ID_Santri], tglSel_(r[ix.Tanggal]), r[ix.Jenis], Number(r[ix.Surah]), Number(r[ix.Ayat_Dari]), Number(r[ix.Ayat_Sampai])].join('|')] = 1; });
      }
      let yatim = 0;
      src.forEach(function (r) {
        const sid = resolveSantri(r), s = surahDariTeks_(r.Surah), a1 = Number(r.Ayat_Dari), a2 = Number(r.Ayat_Sampai) || a1, tgl = String(r.Tanggal).substring(0, 10);
        if (!sid) { yatim++; p.lewat++; return; }
        if (!tglValid_(tgl) || cekAyat_(s, a1, a2)) { p.lewat++; return; }
        const jenis = /^m/i.test(r.Jenis) ? 'Murojaah' : 'Ziyadah', k = [sid, tgl, jenis, s, a1, a2].join('|');
        if (ada[k]) { p.lewat++; return; } ada[k] = 1;
        const sn = snByNis[nisLama[r.ID_Santri] || r.NIS] || tSn.filter(function (x) { return x.ID_Santri === sid; })[0] || {};
        p.baru.push({ Tanggal: tgl, ID_Santri: sid, ID_Halaqah: sn.ID_Halaqah || '', Jenis: jenis, Juz: juzOf_(s, a1), Surah: s, Nama_Surah: namaSurah_(s), Ayat_Dari: a1, Ayat_Sampai: a2,
          Jumlah_Baris_Halaman: Number(r.Jumlah_Baris_Halaman) || halaman_(s, a1, a2), Nilai_Tajwid: nilaiDariTeks_(r.Nilai_Tajwid), Nilai_Kelancaran: nilaiDariTeks_(r.Nilai_Kelancaran),
          Catatan: r.Catatan || '', ID_Muhaffidz: resolveMhf(r.ID_Muhaffidz), Dibuat_Pada: now, Diubah_Pada: now, Client_ID: 'impor' });
      });
      if (yatim) warn.push(yatim + ' setoran dilewati karena santrinya tidak ditemukan (impor sheet Santri lebih dulu).');
      p.baru.sort(function (a, b) { return a.Tanggal < b.Tanggal ? -1 : a.Tanggal > b.Tanggal ? 1 : 0; });
    } else if (name === 'Presensi') {
      const ada = {};
      if (DB.lastRow('Presensi') >= 2) DB.tail('Presensi', 200000).forEach(function (r) { ada[[r.ID_Santri, String(r.Tanggal).substring(0, 10)].join('|')] = 1; });
      src.forEach(function (r) {
        const sid = resolveSantri(r), tgl = String(r.Tanggal).substring(0, 10), st = { h: 'Hadir', i: 'Izin', s: 'Sakit', a: 'Alpa' }[String(r.Status || '').charAt(0).toLowerCase()];
        if (!sid || !tglValid_(tgl) || !st) { p.lewat++; return; }
        const k = sid + '|' + tgl; if (ada[k]) { p.lewat++; return; } ada[k] = 1;
        const sn = tSn.filter(function (x) { return x.ID_Santri === sid; })[0] || snByNis[nisLama[r.ID_Santri] || r.NIS] || {};
        p.baru.push({ Tanggal: tgl, ID_Santri: sid, ID_Halaqah: resolveHq(r.ID_Halaqah) || sn.ID_Halaqah || '', Status: st, Keterangan: r.Keterangan || '', ID_Muhaffidz: 'impor', Diubah_Pada: now });
      });
    } else if (name === 'HafalanAwal') {
      const ada = {}; DB.all('HafalanAwal', true).forEach(function (h) { ada[h.ID_Santri] = h; });
      src.forEach(function (r) {
        const sid = resolveSantri(r); if (!sid || ada[sid]) { p.lewat++; return; }
        const z = teksKeInterval_(r.Ziyadah); ada[sid] = 1;
        p.baru.push({ ID_Santri: sid, Ziyadah: intervalKeTeks_(z), Mutqin: intervalKeTeks_(irisanInterval_(teksKeInterval_(r.Mutqin), z)), Ringkasan: ringkasInterval_(z), Total_Setoran: num_(r.Total_Setoran), Sumber: 'Impor', Catatan: r.Catatan || '', Diubah_Pada: now });
      });
    }
  });
  return { plan: plan, warn: warn };
}

function laporanRencana_(r) {
  const out = {};
  Object.keys(r.plan).forEach(function (k) { const p = r.plan[k]; out[k] = { ada: p.ada, sumber: p.sumber, ditambah: p.baru.length, diperbarui: p.ubah.length, dilewati: p.lewat }; });
  return out;
}

function apiMigrasiScan_(ctx, d) {
  const ss = bukaSumber_(d.sumber), sheets = [].concat(d.sheets || URUTAN_IMPOR);
  const r = rencanaImpor_(ss, sheets, !!d.timpa);
  return ok_({ sumber: { nama: ss.getName(), id: ss.getId() }, dryRun: true, laporan: laporanRencana_(r), peringatan: r.warn });
}

function apiMigrasiRun_(ctx, d) {
  const ss = bukaSumber_(d.sumber), sheets = [].concat(d.sheets || URUTAN_IMPOR);
  const r = rencanaImpor_(ss, sheets, !!d.timpa), peta = { '#': {}, '@': {}, '!': {} };
  const urai = function (v) { v = String(v || ''); const k = v.charAt(0); return peta[k] ? (peta[k][v.substring(1)] || '') : v; };
  URUTAN_IMPOR.filter(function (n) { return r.plan[n]; }).forEach(function (name) {
    const p = r.plan[name], key = SCHEMA[name].key;
    p.baru.forEach(function (o) {
      ['ID_Santri', 'ID_Halaqah', 'ID_Muhaffidz', 'Level_atau_ID_Santri'].forEach(function (f) { if (o[f] !== undefined && /^[#@!]/.test(String(o[f]))) o[f] = urai(o[f]); });
      if (name === 'Wali' && !o.ID_Santri && o._nis) o.ID_Santri = peta['#'][o._nis] || '';
    });
    p.ubah.forEach(function (o) { ['ID_Halaqah', 'ID_Muhaffidz'].forEach(function (f) { if (/^[#@!]/.test(String(o[f] || ''))) o[f] = urai(o[f]); }); });
    if (['Wali', 'Setoran', 'Presensi', 'HafalanAwal'].indexOf(name) > -1) {
      const n0 = p.baru.length; p.baru = p.baru.filter(function (o) { return o.ID_Santri; });
      if (n0 > p.baru.length) r.warn.push(name + ': ' + (n0 - p.baru.length) + ' baris dilewati karena santri tidak ditemukan.');
    }
    if (p.baru.length && SCHEMA[name].prefix) {
      const ids = reserveIds_(name, p.baru.length);
      p.baru.forEach(function (o, i) {
        o[key] = ids[i];
        if (name === 'Muhaffidz') peta['!'][o.Email_Google] = o[key];
        if (name === 'Halaqah') peta['@'][String(o.Nama_Halaqah).toLowerCase()] = o[key];
        if (name === 'Santri') peta['#'][o.NIS] = o[key];
      });
    }
    if (p.ubah.length) DB.write(name, p.ubah);
    if (p.baru.length) DB.append(name, p.baru.map(function (o) { const x = Object.assign({}, o); delete x._lama; delete x._nis; return x; }));
  });
  apiSysSegarkan_(ctx);
  const res = ok_({ sumber: { nama: ss.getName(), id: ss.getId() }, dryRun: false, laporan: laporanRencana_(r), peringatan: r.warn }, 'Impor selesai. Jalankan lagi tepat sebelum pindah (delta sync) — data yang sudah ada tidak akan dobel.');
  res.auditEntitas = 'Migrasi'; res.auditDetail = JSON.stringify(laporanRencana_(r)).substring(0, 380);
  return res;
}

/* ================================================================
 *  3) DATA CONTOH (pelatihan / uji coba) — jalankan dari editor
 * ================================================================ */
function isiDataContoh() {
  withLock_(function () {
    if (DB.all('Santri', true).some(function (s) { return /DATA CONTOH/.test(s.Catatan); })) { Logger.log('Data contoh sudah ada.'); return; }
    const now = nowIso_(), hari = today_();
    const guru = [['Ust. Salman Al-Farisi', 'salman@contoh.mutqin', '081200000001'], ['Ust. Fauzi Rahman', 'fauzi@contoh.mutqin', '081200000002'], ['Ust. Zaky Mubarak', 'zaky@contoh.mutqin', '081200000003']];
    const gid = reserveIds_('Muhaffidz', guru.length);
    DB.append('Muhaffidz', guru.map(function (g, i) { return { ID_Muhaffidz: gid[i], Nama: g[0], Email_Google: g[1], No_WA: g[2], Peran: 'Muhaffidz', Status: 'Aktif', Foto_URL: '', Dibuat_Pada: now, Diubah_Pada: now }; }));
    const hq = [['Ali bin Abi Thalib', 0, 'Senin–Kamis, Ba\'da Subuh', 'Menengah'], ['Utsman bin Affan', 1, 'Senin–Kamis, Ba\'da Ashar', 'Pemula'], ['Umar bin Khattab', 2, 'Ahad–Rabu, Ba\'da Maghrib', 'Mutqin']];
    const hid = reserveIds_('Halaqah', hq.length);
    DB.append('Halaqah', hq.map(function (h, i) { return { ID_Halaqah: hid[i], Nama_Halaqah: h[0], ID_Muhaffidz: gid[h[1]], Jadwal: h[2], Tingkat: h[3], Status: 'Aktif', Dibuat_Pada: now, Diubah_Pada: now }; }));
    const nama = ['Ahmad Farhan', 'Zaidan Al-Fatih', 'M. Rayyan Hakim', 'Umar Farisi', 'Hamzah Al-Baqir', 'Fathan Mubina', 'Hafidz Ramadhan', 'Yusuf Habibi', 'Ilham Nur', 'Rafa Athallah', 'Salman Hadi', 'Azzam Zuhdi',
      'Aisyah Putri', 'Khadijah Nur', 'Fatimah Azzahra', 'Maryam Salsabila', 'Hafshah Aulia', 'Zainab Qonita'];
    const sid = reserveIds_('Santri', nama.length), santri = [], wali = [];
    nama.forEach(function (n, i) {
      santri.push({ ID_Santri: sid[i], NIS: String(2024090 + i), Nama: n, Jenis_Kelamin: i >= 12 ? 'P' : 'L', Tanggal_Masuk: '2025-07-14', ID_Halaqah: hid[i % 3], PIN_Hash: hashPin_('123456', sid[i]),
        Foto_URL: '', Status: 'Aktif', Catatan: 'DATA CONTOH', Dibuat_Pada: now, Diubah_Pada: now });
      wali.push({ Nama: 'Bapak ' + n.split(' ').slice(-1)[0], No_WA: '0813000000' + ('0' + (i < 12 ? i : i - 12 + 2)).slice(-2), Email: '', ID_Santri: sid[i], Hubungan: 'Ayah', StatusWA: '', CekWAAt: '', Dibuat_Pada: now, Diubah_Pada: now });
    });
    DB.append('Santri', santri);
    const wid = reserveIds_('Wali', wali.length); wali.forEach(function (w, i) { w.ID_Wali = wid[i]; }); DB.append('Wali', wali);
    const tid = reserveIds_('Target', 3);
    DB.append('Target', [['Pemula', 'Juz 30', '10 Halaman'], ['Menengah', 'Juz 28-30', '20 Halaman'], ['Mutqin', 'Juz 26-30', '40 Halaman']].map(function (t, i) {
      return { ID_Target: tid[i], Level_atau_ID_Santri: t[0], Periode: 'SEMESTER', Target_Juz_atau_Surah: t[1], Target_Murojaah: t[2], Keterangan: 'DATA CONTOH', Dibuat_Pada: now, Diubah_Pada: now };
    }));
    // Hafalan awal (riwayat kartu fisik) per halaqah: Menengah → Juz 30 mutqin; Mutqin → Juz 28–30 mutqin + Juz 27 hafal
    const awal = [];
    santri.forEach(function (s, i) {
      const k = i % 3; let z = [], m = [];
      if (k === 0) { z = [rentangJuz_(30)]; m = [rentangJuz_(30)]; }
      if (k === 2) { z = [[rentangJuz_(27)[0], rentangJuz_(30)[1]]]; m = [[rentangJuz_(28)[0], rentangJuz_(30)[1]]]; }
      if (z.length) awal.push({ ID_Santri: s.ID_Santri, Ziyadah: intervalKeTeks_(z), Mutqin: intervalKeTeks_(m), Ringkasan: ringkasInterval_(z), Total_Setoran: 0, Sumber: 'Manual', Catatan: 'DATA CONTOH — kartu fisik', Diubah_Pada: now });
    });
    DB.append('HafalanAwal', awal);
    // Setoran & presensi 75 hari terakhir (termasuk hari ini). Pola: Pemula mundur dari An-Nas,
    // Menengah maju dari Al-Mulk (Juz 29), Mutqin maju dari Az-Zariyat (Juz 27).
    const set = [], pres = [], mulai = [[67, 1, 1], [114, 1, -1], [51, 1, 1]];
    santri.forEach(function (s, i) {
      const k = i % 3, g = gid[k], h = hid[k];
      let surah = mulai[k][0] + (k === 1 ? -(i % 4) : (i % 4)), ayat = 1, arah = mulai[k][2];
      for (let d = 75; d >= 0; d--) {
        const tgl = tambahHari_(hari, -d), dow = parseTgl_(tgl).getDay();
        if (dow === 5) continue;
        if (d === 0 && i % 3 === 2) continue;           // sebagian belum setor hari ini
        const st = (i * 7 + d) % 23 === 0 ? 'Alpa' : (i + d) % 17 === 0 ? 'Izin' : (i + d) % 19 === 0 ? 'Sakit' : 'Hadir';
        if (d > 0) pres.push({ Tanggal: tgl, ID_Santri: s.ID_Santri, ID_Halaqah: h, Status: st, Keterangan: st === 'Izin' ? 'Acara keluarga' : st === 'Sakit' ? 'Demam' : '', ID_Muhaffidz: g, Diubah_Pada: now });
        if (st !== 'Hadir' || surah < 1 || surah > 114) continue;
        const n = jumlahAyat_(surah), a2 = Math.min(n, ayat + 2 + (i % 4) + (k === 2 ? 3 : 0));
        const T = 72 + ((i * 13 + d * 7) % 28), K = 70 + ((i * 11 + d * 5) % 30);
        const jam = String(7 + (i % 3)).padStart(2, '0') + ':' + String(10 + (i * 7) % 45).padStart(2, '0') + ':00';
        set.push({ Tanggal: tgl, ID_Santri: s.ID_Santri, ID_Halaqah: h, Jenis: 'Ziyadah', Juz: juzOf_(surah, ayat), Surah: surah, Nama_Surah: namaSurah_(surah), Ayat_Dari: ayat, Ayat_Sampai: a2,
          Jumlah_Baris_Halaman: halaman_(surah, ayat, a2), Nilai_Tajwid: T, Nilai_Kelancaran: K, Catatan: K < 76 ? 'Tawaqquf beberapa kali, perkuat murojaah ba\'da Maghrib' : (K > 95 ? 'Alhamdulillah lancar, makhraj tepat' : ''),
          ID_Muhaffidz: g, Dibuat_Pada: tgl + 'T' + jam, Diubah_Pada: tgl + 'T' + jam, Client_ID: '' });
        if (d % 3 === 0) {
          const ms = k === 1 ? Math.min(114, surah + 1) : (k === 0 ? 78 + (d % 37) : 67 + (d % 11)), mn = jumlahAyat_(ms);
          set.push({ Tanggal: tgl, ID_Santri: s.ID_Santri, ID_Halaqah: h, Jenis: 'Murojaah', Juz: juzOf_(ms, 1), Surah: ms, Nama_Surah: namaSurah_(ms), Ayat_Dari: 1, Ayat_Sampai: mn,
            Jumlah_Baris_Halaman: halaman_(ms, 1, mn), Nilai_Tajwid: Math.min(100, T + 6), Nilai_Kelancaran: Math.min(100, K + 12), Catatan: '', ID_Muhaffidz: g,
            Dibuat_Pada: tgl + 'T' + jam.replace(/:(\d\d):/, function (x, mm) { return ':' + String(Math.min(59, Number(mm) + 12)).padStart(2, '0') + ':'; }), Diubah_Pada: tgl + 'T' + jam, Client_ID: '' });
        }
        ayat = a2 + 1; if (ayat > n) { surah += arah; ayat = 1; }
      }
    });
    set.sort(function (a, b) { return a.Dibuat_Pada < b.Dibuat_Pada ? -1 : 1; });
    pres.sort(function (a, b) { return a.Tanggal < b.Tanggal ? -1 : 1; });
    const s1 = reserveIds_('Setoran', set.length); set.forEach(function (x, i) { x.ID_Setoran = s1[i]; }); DB.append('Setoran', set);
    const p1 = reserveIds_('Presensi', pres.length); pres.forEach(function (x, i) { x.ID_Presensi = p1[i]; }); DB.append('Presensi', pres);
    bumpAgg_(); bump_('pm_' + bulanIni_()); bump_('pm_' + bulanGeser_(bulanIni_(), -1));
    Logger.log('✅ Data contoh: ' + santri.length + ' santri, ' + set.length + ' setoran, ' + pres.length + ' presensi, ' + awal.length + ' hafalan awal.');
    Logger.log('   Login wali contoh → NIS 2024090 … 2024107, PIN 123456');
  });
}

/** Hapus semua baris bertanda DATA CONTOH beserta setoran/presensi/wali santri contoh. */
function hapusDataContoh() {
  withLock_(function () {
    const sn = DB.all('Santri', true).filter(function (s) { return /DATA CONTOH/.test(s.Catatan); }), ids = {};
    sn.forEach(function (s) { ids[s.ID_Santri] = 1; });
    const saring = function (name, buang) {
      const sh = DB.sh(name), last = sh.getLastRow(), H = DB.h(name); if (last < 2) return 0;
      const v = sh.getRange(2, 1, last - 1, H.length).getValues(), ix = {}; H.forEach(function (k, i) { ix[k] = i; });
      const tetap = v.filter(function (r) { return !buang(r, ix); });
      const n = v.length - tetap.length; if (!n) return 0;
      sh.getRange(2, 1, last - 1, H.length).clearContent();
      if (tetap.length) sh.getRange(2, 1, tetap.length, H.length).setValues(tetap);
      DB.touch(name); return n;
    };
    const lap = {
      Setoran: saring('Setoran', function (r, ix) { return ids[r[ix.ID_Santri]]; }),
      Presensi: saring('Presensi', function (r, ix) { return ids[r[ix.ID_Santri]]; }),
      HafalanAwal: saring('HafalanAwal', function (r, ix) { return ids[r[ix.ID_Santri]]; }),
      Wali: saring('Wali', function (r, ix) { return ids[r[ix.ID_Santri]]; }),
      Santri: saring('Santri', function (r, ix) { return ids[r[ix.ID_Santri]]; }),
      Target: saring('Target', function (r, ix) { return /DATA CONTOH/.test(r[ix.Keterangan]); }),
      Halaqah: saring('Halaqah', function (r, ix) { return /contoh\.mutqin/.test(String((idx_().staf[r[ix.ID_Muhaffidz]] || {}).Email_Google)); }),
      Muhaffidz: saring('Muhaffidz', function (r, ix) { return /@contoh\.mutqin$/.test(String(r[ix.Email_Google])); })
    };
    bumpAgg_(); bump_('pm_' + bulanIni_()); bump_('pm_' + bulanGeser_(bulanIni_(), -1));
    Logger.log('🧹 Data contoh dihapus: ' + JSON.stringify(lap));
  });
}

return { doPost, doGet, setupAppEnvironment, isiDataContoh, tickMenit, setProps_, hashPass_, simpanSetting_, withLock_, buatSesi_, stafByEmail_, idx_ };
};
