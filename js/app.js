/* =================================================================
   MutqinSpace — app.js : kerangka SPA, login, boot, navigasi per peran, PWA.
   ================================================================= */
(function (g) {
  'use strict';
  const { CFG, Sesi, api, apiData, swr, Router, Outbox, warmUp, Aktivitas, configSiap } = g.Core;
  const { icon, LOGO, esc, $, $$, h, avatar, toast, modal } = g.UI;
  const Pages = g.Pages = g.Pages || {};

  const NAV = {
    mudir: [['dashboard', 'Dashboard', 'grid'], ['setoran', 'Setoran', 'book'], ['presensi', 'Presensi', 'checkc'], ['halaqah', 'Halaqah', 'users'], ['laporan', 'Laporan', 'chart']],
    muhaffidz: [['dashboard', 'Dashboard', 'grid'], ['setoran', 'Setoran', 'book'], ['presensi', 'Presensi', 'checkc'], ['halaqah', 'Halaqah', 'users'], ['laporan', 'Laporan', 'chart']],
    wali: [['portal', 'Ringkasan', 'home'], ['peta', 'Peta Hafalan', 'layers'], ['riwayat', 'Riwayat', 'list']],
    santri: [['portal', 'Ringkasan', 'home'], ['peta', 'Peta Hafalan', 'layers'], ['riwayat', 'Riwayat', 'list']]
  };
  const BERANDA = { mudir: 'dashboard', muhaffidz: 'dashboard', wali: 'portal', santri: 'portal' };

  const App = g.App = {
    boot: null, anakAktif: null, installPrompt: null, halaman: null,
    role() { return Sesi.me ? Sesi.me.role : ''; },
    staf() { return ['mudir', 'muhaffidz'].indexOf(App.role()) > -1; },
    mudir() { return App.role() === 'mudir'; },
    santri(id) { return (App.boot && App.boot.santri || []).find(s => s.id === id) || null; },
    halaqah(id) { return (App.boot && App.boot.halaqah || []).find(x => x.id === id) || null; },
    staf_(id) { return (App.boot && App.boot.staf || []).find(x => x.id === id) || null; },
    setting(k) { return App.boot && App.boot.setting ? App.boot.setting[k] : ''; },

    async start() {
      g.Core.Net.render();
      Aktivitas.init();
      g.addEventListener('hashchange', App.route);
      if (!configSiap() && CFG.GAS_URL !== 'DEMO') return App.layarKonfigurasi();
      if (!Sesi.token) { warmUp('pub'); return App.route(); }
      await App.muatBoot(true);
      App.route();
      Outbox.flush();
    },

    async muatBoot(pertama) {
      const render = (d) => { App.boot = d; if (d && d.me) { Sesi.me = Object.assign({}, Sesi.me, d.me); } if (App.shellAda()) App.renderShell(); };
      const d = await swr('boot', 'boot', { appUrl: location.origin + location.pathname }, { maxAge: pertama ? 60000 : 0, force: !pertama, render,
        onError: (e, adaCache) => { if (!adaCache) toast(e.message, 'err', 6000); } });
      if (d) render(d);
      return d;
    },
    async segarkanBoot() { await App.muatBoot(false); },

    shellAda() { return !!$('#shell-page'); },
    renderShell() {
      const role = App.role(), me = Sesi.me || {}, cur = Router.parse().name;
      const nav = NAV[role] || [];
      let root = $('#app');
      const navHtml = nav.map(n => '<a href="#/' + n[0] + '" data-nav="' + n[0] + '" class="' + (cur === n[0] ? 'on' : '') + '">' + esc(n[1]) + '</a>').join('');
      const periode = App.setting('LABEL_PERIODE') || '';
      const util = '<span id="outbox-badge" class="badge b-warn" hidden></span>' +
        (periode ? '<span class="chip-periode"><span class="dot pulse"></span>' + esc(periode) + '</span>' : '') +
        (App.mudir() ? '<a class="ibtn hide-m" href="#/notifikasi" title="Notifikasi & CRM" aria-label="Notifikasi & CRM">' + icon('bell') + '<span class="badge-dot" id="notif-dot" hidden></span></a>' +
          '<a class="ibtn hide-m" href="#/pengaturan" title="Pengaturan sistem" aria-label="Pengaturan">' + icon('gear') + '</a>' : '') +
        '<button class="avatar-me" id="btn-me" aria-label="Menu akun">' + avatar(me.nama, me.foto, '') + '</button>';
      if (!App.shellAda()) {
        root.innerHTML = '<div class="shell"><header class="topbar"><a class="logo" href="#/' + (BERANDA[role] || '') + '"><span class="logo-mark">' + LOGO + '</span><span>mutqin<span class="b">space</span></span></a>' +
          '<nav class="pillnav" aria-label="Navigasi utama"><button class="grid-btn" id="btn-menu" aria-label="Semua menu">' + icon('grid', 'sm') + '</button><span id="nav-links" style="display:contents"></span></nav>' +
          '<div class="util" id="util"></div></header><main id="shell-page"></main></div><nav class="dock" id="dock" aria-label="Navigasi bawah"></nav>';
        $('#btn-menu').onclick = App.menuSemua;
      }
      $('#nav-links').innerHTML = navHtml;
      $('#util').innerHTML = util;
      $('#btn-me').onclick = App.menuAkun;
      const dock = $('#dock');
      const dk = App.staf()
        ? [nav[0], nav[1], ['setoran/input', 'Input', 'plus', 1], nav[2], ['__menu', 'Menu', 'more']]
        : nav.concat([['__menu', 'Akun', 'user']]);
      dock.innerHTML = dk.map(n => n[0] === '__menu'
        ? '<a href="javascript:void 0" data-menu>' + icon(n[2]) + '<span>' + n[1] + '</span></a>'
        : '<a href="#/' + n[0] + '" data-nav="' + n[0] + '" class="' + (n[3] ? 'fab-in' : '') + (cur === n[0] ? ' on' : '') + '" aria-label="' + esc(n[1]) + '">' + icon(n[2]) + (n[3] ? '' : '<span>' + esc(n[1]) + '</span>') + '</a>').join('');
      const m = $('[data-menu]', dock); if (m) m.onclick = App.staf() ? App.menuSemua : App.menuAkun;
      Outbox.render();
    },
    tandaiNav(name) { $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === name)); },

    menuSemua() {
      const role = App.role(), item = (NAV[role] || []).slice();
      if (App.staf()) item.splice(2, 0, ['setoran/input', 'Input Setoran', 'plus']);
      if (App.mudir()) item.push(['notifikasi', 'Notifikasi WA & CRM', 'bell'], ['pengaturan', 'Pengaturan Sistem', 'gear']);
      const m = modal({ title: 'Menu', body: '<div class="card-list">' + item.map(n => '<a class="ocard" href="#/' + n[0] + '" style="flex-direction:row;align-items:center"><span class="ibtn">' + icon(n[2]) + '</span><span class="t">' + esc(n[1]) + '</span></a>').join('') + '</div>' });
      $$('a', m.body).forEach(a => a.addEventListener('click', () => m.tutup()));
    },
    menuAkun() {
      const me = Sesi.me || {}, labelPeran = { mudir: 'Mudir / Kepala Tahfidz', muhaffidz: 'Muhaffidz', wali: 'Wali Santri', santri: 'Santri' }[me.role];
      const body = h('<div><div class="row-flex" style="gap:14px">' + avatar(me.nama, me.foto, 'lg') + '<div><div style="font-weight:800;font-size:17px">' + esc(me.nama) + '</div><div class="muted">' + esc(labelPeran) + (me.darurat ? ' • akses darurat' : '') + '</div><div class="muted" style="font-size:12px">' + esc(me.email && me.email.indexOf('nis:') !== 0 ? me.email : '') + '</div></div></div>' +
        '<div class="card-list mt20" style="grid-template-columns:1fr">' +
        (App.installPrompt ? '<button class="btn btn-lime" data-a="install">' + icon('install') + 'Pasang aplikasi di perangkat ini</button>' : '') +
        (/iphone|ipad/i.test(navigator.userAgent) && !navigator.standalone ? '<div class="hint">Pasang di iPhone/iPad: ketuk tombol <b>Bagikan</b> di Safari → <b>Tambah ke Layar Utama</b>.</div>' : '') +
        (me.role === 'wali' || me.role === 'santri' ? '<button class="btn btn-white" data-a="pin">' + icon('key') + 'Ganti PIN</button>' : '') +
        (App.mudir() ? '<a class="btn btn-white" href="#/pengaturan" data-a="x">' + icon('gear') + 'Pengaturan sistem</a>' : '') +
        '<button class="btn btn-white" data-a="segar">' + icon('refresh') + 'Muat ulang data</button>' +
        '<button class="btn btn-dark" data-a="out">' + icon('logout') + 'Keluar</button></div></div>');
      const m = modal({ title: 'Akun', body });
      body.addEventListener('click', async (e) => {
        const a = e.target.closest('[data-a]'); if (!a) return;
        const k = a.dataset.a;
        if (k === 'out') { m.tutup(); App.logout(); }
        if (k === 'x') m.tutup();
        if (k === 'segar') { m.tutup(); g.Core.swrHapus(); await App.segarkanBoot(); App.route(); toast('Data dimuat ulang.'); }
        if (k === 'install') { m.tutup(); App.installPrompt.prompt(); App.installPrompt = null; }
        if (k === 'pin') { m.tutup(); App.gantiPin(); }
      });
    },
    gantiPin() {
      modal({ title: 'Ganti PIN', body: '<div class="form-grid"><label class="field full"><span>PIN lama</span><input class="inp pin-in" name="lama" inputmode="numeric" maxlength="6" type="password" autocomplete="current-password"></label><label class="field full"><span>PIN baru (6 angka)</span><input class="inp pin-in" name="baru" inputmode="numeric" maxlength="6" type="password" autocomplete="new-password"></label></div>',
        actions: [{ label: 'Batal' }, { label: 'Simpan PIN', cls: 'btn-lime', fn: async (b) => { const f = g.UI.formData(b); await apiData('auth.gantiPin', { pinLama: f.lama, pinBaru: f.baru }); toast('PIN berhasil diganti.'); } }] });
    },

    async logout(pesan) {
      try { if (Sesi.token) await api('auth.logout', {}, { silent: true, noAuth: true }); } catch (e) { }
      Sesi.clear(); App.boot = null; App.anakAktif = null;
      App.keLogin(pesan);
    },
    keLogin(pesan) { App._pesanLogin = pesan || ''; $('#app').innerHTML = ''; location.hash = '#/login'; App.route(); },
    segarkanHalaman() { if (App.halaman && App.halaman.segarkan) App.halaman.segarkan(); },

    /* ---------------- Routing ---------------- */
    route() {
      const r = Router.parse();
      if (!Sesi.token) {
        if (r.name === 'darurat') return App.layarLogin('darurat');
        return App.layarLogin();
      }
      if (!App.boot) { $('#app').innerHTML = '<div class="shell">' + g.UI.sk(48) + g.UI.sk(220) + '</div>'; App.muatBoot(true).then(() => App.boot && App.route()); return; }
      const role = App.role();
      let name = r.name;
      if (!name || name === 'login' || name === 'darurat') { location.replace('#/' + BERANDA[role]); return; }
      if (name === 'setoran' && r.params[0] === 'input') name = 'input';
      const page = Pages[name];
      if (!page || (page.peran && page.peran.indexOf(role) === -1)) { location.replace('#/' + BERANDA[role]); return; }
      if (!App.shellAda()) App.renderShell();
      App.tandaiNav(name === 'input' ? 'setoran/input' : r.name);
      const host = $('#shell-page');
      if (App.halaman && App.halaman.tutup) try { App.halaman.tutup(); } catch (e) { }
      // wadah baru per render: callback async dari halaman lama menulis ke elemen yang sudah terlepas (aman)
      host.innerHTML = '';
      const el = document.createElement('div'); el.className = 'page'; host.appendChild(el);
      App.halaman = { segarkan: null };
      try { page.render(el, { params: r.params, q: r.q, halaman: App.halaman }); }
      catch (e) { console.error(e); el.innerHTML = g.UI.empty('Halaman gagal ditampilkan: ' + e.message, 'alert', true); }
      window.scrollTo({ top: 0 });
      if (App.staf()) { warmUp(App.mudir() ? 'admin' : 'staf'); }
    },

    /** Kepala halaman ala referensi: tombol kembali bulat + judul besar + aksi kanan. */
    kepala(judul, opsi) {
      opsi = opsi || {};
      return '<div class="pagehead"><div class="ttl">' + (opsi.kembali !== false ? '<button class="ibtn" onclick="history.length>1?history.back():location.hash=\'#/\'" aria-label="Kembali" style="width:44px;height:44px">' + icon('back') + '</button>' : '') +
        '<div style="min-width:0"><h1>' + esc(judul) + '</h1>' + (opsi.sub ? '<div class="sub">' + opsi.sub + '</div>' : '') + '</div></div><div class="act">' + (opsi.aksi || '') + '</div></div>';
    },

    /* ---------------- Layar konfigurasi & login ---------------- */
    layarKonfigurasi() {
      $('#app').innerHTML = '<div class="login-form" style="min-height:100vh"><div class="glass" style="max-width:620px"><div class="logo"><span class="logo-mark">' + LOGO + '</span><span>mutqin<span class="b">space</span></span></div>' +
        '<h2 style="font-size:26px;margin:20px 0 8px">Konfigurasi belum lengkap</h2><p class="muted">Isi alamat Web App Google Apps Script (berakhiran <span class="kbd">/exec</span>) di berkas <span class="kbd">js/config.js</span>, lalu unggah ulang ke GitHub Pages.</p>' +
        '<pre class="hint mono" style="white-space:pre-wrap">window.APP_CONFIG = {\n  GAS_URL: \'https://script.google.com/macros/s/AKfy..../exec\'\n};</pre><p class="muted" style="font-size:13px">Panduan lengkap ada di PANDUAN-INSTALASI.md.</p></div></div>';
    },
    async layarLogin(mode) {
      const app = $('#app');
      let cfg = { namaLembaga: '', googleClientId: '', portalSantri: false };
      app.innerHTML = '<div class="login-wrap"><section class="login-art"><div class="logo" style="color:#fff"><span class="logo-mark" style="background:#D8F43C;color:#111">' + LOGO + '</span><span>mutqin<span class="b" style="color:#9CA3AF">space</span></span></div>' +
        '<div style="position:relative;z-index:1"><h1>Mutaba\'ah hafalan,<br><em>tanpa buku hilang.</em></h1><p>Setoran ziyadah & murojaah tercatat dari HP saat halaqah, wali memantau real-time, Mudir mendapat dashboard dan rekap otomatis.</p><p id="nm-lembaga" style="color:#D8F43C;font-weight:700"></p></div>' +
        '<span class="deco"></span><span class="deco2"></span></section><section class="login-form"><div class="login-card" id="login-card">' + g.UI.sk(300) + '</div></section></div>';
      try { const r = await api('auth.config', {}, { noAuth: true }); if (r.success) cfg = r.data; } catch (e) { toast(e.message, 'err', 6000); }
      $('#nm-lembaga').textContent = cfg.namaLembaga || '';
      const card = $('#login-card');
      if (mode === 'darurat') {
        card.innerHTML = '<span class="badge b-warn">' + icon('shield', 'sm') + ' Akses darurat Mudir</span><h2>Masuk darurat</h2><p class="muted">Dipakai untuk login pertama (sebelum Client ID Google diisi) atau saat login Google bermasalah.</p>' +
          '<form id="f-dar" class="form-grid mt16" autocomplete="off"><label class="field full"><span>Nama pengguna</span><input class="inp" name="username" value="darurat" autocomplete="username"></label><label class="field full"><span>Kata sandi</span><input class="inp" name="password" type="password" autocomplete="current-password" required></label>' +
          '<button class="btn btn-lime btn-block full" type="submit">' + icon('lock') + 'Masuk</button></form><p class="mt16"><a href="#/login" class="muted">← Kembali ke login biasa</a></p>';
        $('#f-dar').onsubmit = async (e) => { e.preventDefault(); await App.prosesLogin('auth.darurat', g.UI.formData(e.target), e.submitter); };
        return;
      }
      const tabs = [['staf', 'Mudir / Muhaffidz'], ['wali', 'Wali Santri']].concat(cfg.portalSantri ? [['santri', 'Santri']] : []);
      const demo = CFG.GAS_URL === 'DEMO';
      card.innerHTML = (demo ? '<div class="glass" style="padding:18px;margin-bottom:18px"><span class="badge b-lime">MODE DEMO</span><p style="margin:10px 0 12px;font-size:13.5px">Data contoh berjalan di browser ini saja (tanpa server). Pilih peran untuk mencoba:</p>' +
          '<div class="row-flex"><button class="btn btn-lime btn-sm" data-demo="mudir">Mudir</button><button class="btn btn-dark btn-sm" data-demo="muhaffidz">Muhaffidz</button><button class="btn btn-white btn-sm" data-demo="wali">Wali Santri</button><button class="btn btn-ghost btn-sm" data-demo="reset">Reset data</button></div>' +
          '<p class="muted" style="font-size:12px;margin:10px 0 0">Wali: NIS 2024091 • PIN 123456. Darurat: #/darurat • darurat / demo12345678</p></div>' : '') +
        (App._pesanLogin ? '<div class="hint mb12">' + esc(App._pesanLogin) + '</div>' : '') +
        '<div class="tabs light" id="lt">' + tabs.map((t, i) => '<button data-t="' + t[0] + '" class="' + (i === 0 ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div><div id="lbody" class="mt20"></div>' +
        '<div class="mt20" id="inst-wrap"></div>';
      App._pesanLogin = '';
      const tampil = (t) => {
        $$('#lt button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
        const b = $('#lbody');
        if (t === 'staf') {
          b.innerHTML = '<h2>Assalamu\'alaikum 👋</h2><p class="muted">Masuk dengan akun Google yang terdaftar oleh Mudir.</p><div class="gbtn-host mt20" id="gbtn">' + (cfg.googleClientId ? g.UI.sk(44, '260px') : '') + '</div>' +
            (cfg.googleClientId ? '' : '<div class="hint mt12">Login Google belum dikonfigurasi. Mudir: buka alamat aplikasi ini dengan akhiran <span class="kbd">#/darurat</span> untuk login pertama, lalu isi Client ID di Pengaturan → Keamanan.</div>');
          if (cfg.googleClientId) App.pasangGoogle(cfg.googleClientId);
        } else {
          b.innerHTML = '<h2>' + (t === 'wali' ? 'Portal Wali Santri' : 'Portal Santri') + '</h2><p class="muted">Masuk dengan NIS ' + (t === 'wali' ? 'ananda ' : '') + 'dan PIN 6 angka dari lembaga.</p>' +
            '<form id="f-pin" class="form-grid mt16"><label class="field full"><span>NIS santri</span><input class="inp" name="nis" inputmode="numeric" autocomplete="username" required></label><label class="field full"><span>PIN</span><input class="inp pin-in" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password" required></label>' +
            '<button class="btn btn-lime btn-block full" type="submit">' + icon('arrow') + 'Masuk</button></form>';
          $('#f-pin').onsubmit = async (e) => { e.preventDefault(); const f = g.UI.formData(e.target); f.mode = t; await App.prosesLogin('auth.pin', f, e.submitter); };
        }
      };
      $('#lt').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) tampil(b.dataset.t); };
      $$('[data-demo]', card).forEach(b => b.onclick = async () => {
        if (b.dataset.demo === 'reset') { g.DemoBackend.reset(); toast('Data demo direset.'); return App.layarLogin(); }
        b.disabled = true; const d = await g.DemoBackend.masukSebagai(b.dataset.demo);
        Sesi.set(d.token, d.me); App.boot = null; $('#app').innerHTML = ''; await App.muatBoot(true); location.hash = '#/' + BERANDA[d.me.role]; App.route();
      });
      tampil('staf');
      App.renderInstall();
    },
    pasangGoogle(clientId) {
      const init = () => {
        try {
          g.google.accounts.id.initialize({ client_id: clientId, callback: (resp) => App.prosesLogin('auth.google', { credential: resp.credential, appUrl: location.origin + location.pathname }), ux_mode: 'popup', auto_select: false });
          const host = $('#gbtn'); if (!host) return; host.innerHTML = '';
          g.google.accounts.id.renderButton(host, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', locale: 'id', width: 300 });
        } catch (e) { $('#gbtn').innerHTML = '<div class="hint">Gagal memuat tombol Google: ' + esc(e.message) + '</div>'; }
      };
      if (g.google && g.google.accounts) return init();
      const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = init;
      s.onerror = () => { const host = $('#gbtn'); if (host) host.innerHTML = '<div class="hint">Tombol Google tidak dapat dimuat (cek koneksi internet).</div>'; };
      document.head.appendChild(s);
    },
    async prosesLogin(aksi, data, btn) {
      if (btn) btn.disabled = true;
      try {
        const r = await api(aksi, data, { noAuth: true });
        if (!r.success) { toast(r.message, 'err', 5000); return; }
        Sesi.set(r.data.token, r.data.me);
        App.boot = null;
        $('#app').innerHTML = '';
        await App.muatBoot(true);
        location.hash = '#/' + BERANDA[r.data.me.role];
        App.route();
        toast('Selamat datang, ' + r.data.me.nama + '.');
      } catch (e) { toast(e.message, 'err', 5000); }
      finally { if (btn) btn.disabled = false; }
    },
    renderInstall() {
      const w = $('#inst-wrap'); if (!w) return;
      w.innerHTML = App.installPrompt ? '<button class="btn btn-white btn-block" id="btn-inst">' + icon('install') + 'Pasang MutqinSpace di perangkat ini</button>' : '';
      const b = $('#btn-inst'); if (b) b.onclick = () => { App.installPrompt.prompt(); App.installPrompt = null; App.renderInstall(); };
    }
  };

  /* ---------------- PWA ---------------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    g.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing; if (!nw) return;
          nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Versi baru tersedia — muat ulang halaman untuk memperbarui.', 'ok', 8000); });
        });
      }).catch(() => { });
    });
  }
  g.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); App.installPrompt = e; App.renderInstall(); });

  document.addEventListener('DOMContentLoaded', () => App.start());
})(window);
