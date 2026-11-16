/* MutqinSpace — Daftar Setoran & Input Setoran cepat (FR-11..FR-16) */
(function (g) {
  'use strict';
  const { icon, esc, avatar, fmt, $, $$, toast, modal } = g.UI;
  const { swr, apiData, LS, Outbox, swrHapus } = g.Core;
  const K = g.Komp;

  /* ================= Daftar setoran ================= */
  g.Pages.setoran = {
    peran: ['mudir', 'muhaffidz'],
    render(root, ctx) {
      const App = g.App, hari = fmt.today();
      const st = { dari: fmt.addDays(hari, -6), sampai: hari, halaqah: '', santri: '', jenis: '', predikat: '', q: '', page: 0, rows: [], total: 0, hitung: null, sel: null };
      const hq = (App.boot.halaqah || []).filter(x => x.status !== 'Nonaktif');
      root.innerHTML = App.kepala('Setoran & Mutaba\'ah', { sub: 'Riwayat setoran ziyadah dan murojaah seluruh santri binaan.', aksi: '<a class="btn btn-lime" href="#/setoran/input"><span class="plus">+</span>Input Setoran</a>' }) +
        '<div class="filters"><span class="lbl">Filter Aktif <span class="count-dot" id="s-nf">1</span></span>' +
        (hq.length > 1 ? '<select class="pill-in" id="s-hq"><option value="">Semua Halaqah</option>' + hq.map(x => '<option value="' + esc(x.id) + '">' + esc(x.nama) + '</option>').join('') + '</select>' : '') +
        '<select class="pill-in" id="s-pred"><option value="">Semua Status</option>' + ['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Maqbul', 'Rasib'].map(p => '<option>' + p + '</option>').join('') + '</select>' +
        '<input class="pill-in" type="date" id="s-dari" max="' + hari + '"><input class="pill-in" type="date" id="s-sampai" max="' + hari + '">' +
        '<label class="search"><input class="pill-in" id="s-q" placeholder="Cari santri, NIS, surah, ID...">' + icon('search') + '</label></div>' +
        '<section class="dark-panel"><div class="dp-top"><div class="tabs" id="s-tabs"></div><div class="row-flex"><button class="ibtn dark" id="s-xls" title="Unduh Excel">' + icon('download') + '</button><button class="ibtn dark" id="s-ref" title="Segarkan">' + icon('refresh') + '</button></div></div>' +
        '<div class="split"><div><div class="list-head"><h3>Riwayat Setoran</h3><span id="s-ls"></span></div><div id="s-rows">' + g.UI.skRows(6) + '</div></div><div id="s-det"></div></div></section>';
      $('#s-dari', root).value = st.dari; $('#s-sampai', root).value = st.sampai;
      const paramServer = () => ({ dari: st.dari, sampai: st.sampai, halaqah: st.halaqah, jenis: st.jenis, predikat: st.predikat, q: st.q, per: 100, page: st.page });
      function render() {
        const h = st.hitung || { semua: 0, ziyadah: 0, murojaah: 0 };
        $('#s-tabs', root).innerHTML = [['', 'Semua Setoran', h.semua], ['Ziyadah', 'Ziyadah', h.ziyadah], ['Murojaah', 'Murojaah', h.murojaah]].map(t => '<button data-j="' + t[0] + '" class="' + (st.jenis === t[0] ? 'on' : '') + '">' + t[1] + ' <span class="n">' + t[2] + '</span></button>').join('');
        $('#s-ls', root).textContent = st.rows.length + ' dari ' + st.total;
        $('#s-nf', root).textContent = [st.halaqah, st.predikat, st.q, 1].filter(Boolean).length;
        if (!st.rows.length) { $('#s-rows', root).innerHTML = g.UI.empty('Tidak ada setoran pada filter ini.', 'book'); K.detailSetoran($('#s-det', root), null); return; }
        if (!st.rows.some(r => r.id === st.sel)) st.sel = st.rows[0].id;
        $('#s-rows', root).innerHTML = '<div class="rows">' + st.rows.map(s => K.barisSetoran(s, s.id === st.sel)).join('') + '</div>' +
          (st.rows.length < st.total ? '<button class="btn btn-dark btn-block mt12" id="s-more">Muat lebih banyak</button>' : '');
        K.detailSetoran($('#s-det', root), st.rows.find(r => r.id === st.sel), { onUbah: () => muat(true) });
        const mb = $('#s-more', root); if (mb) mb.onclick = () => { st.page++; muat(false, true); };
      }
      function muat(paksa, tambah) {
        if (!tambah) st.page = 0;
        const key = 'setoranL:' + JSON.stringify(paramServer());
        swr(key, 'setoran.list', paramServer(), { maxAge: 20000, force: !!paksa, render: (d) => {
          if (!d) return;
          st.total = d.total; st.hitung = d.hitung;
          st.rows = tambah ? st.rows.concat(d.rows.filter(r => !st.rows.some(x => x.id === r.id))) : d.rows;
          render();
        } });
      }
      const on = (id, ev, fn) => { const el = $(id, root); if (el) el[ev] = fn; };
      on('#s-hq', 'onchange', (e) => { st.halaqah = e.target.value; muat(); });
      on('#s-pred', 'onchange', (e) => { st.predikat = e.target.value; muat(); });
      on('#s-dari', 'onchange', (e) => { st.dari = e.target.value || hari; muat(); });
      on('#s-sampai', 'onchange', (e) => { st.sampai = e.target.value || hari; muat(); });
      let tq; on('#s-q', 'oninput', (e) => { clearTimeout(tq); tq = setTimeout(() => { st.q = e.target.value.trim(); muat(); }, 400); });
      $('#s-tabs', root).onclick = (e) => { const b = e.target.closest('[data-j]'); if (!b) return; st.jenis = b.dataset.j; muat(); };
      $('#s-rows', root).onclick = (e) => { const b = e.target.closest('.row'); if (!b) return; st.sel = b.dataset.id; render(); if (innerWidth < 1024) $('#s-det', root).scrollIntoView({ behavior: 'smooth' }); };
      $('#s-ref', root).onclick = () => muat(true);
      $('#s-xls', root).onclick = async () => {
        try {
          const d = await apiData('laporan.tabel', { jenis: 'setoran', dari: st.dari, sampai: st.sampai, halaqah: st.halaqah, jenisSetoran: st.jenis, predikat: st.predikat, q: st.q, semua: true });
          g.UI.eksporExcel('Setoran_' + st.dari + '_' + st.sampai, d.kolom, d.rows, 'Setoran');
        } catch (er) { toast(er.message, 'err'); }
      };
      ctx.halaman.segarkan = () => muat(true);
      muat();
    }
  };

  /* ================= Input setoran (mobile-first, mode batch) ================= */
  const NILAI = [100, 95, 90, 85, 80, 75, 70, 65, 60, 50];
  const CATATAN_CEPAT = ['Lancar, makhraj tepat', 'Tawaqquf beberapa kali', 'Perlu murojaah mandiri', 'Perhatikan mad & ghunnah', 'Waqaf/ibtida\' kurang tepat'];
  g.Pages.input = {
    peran: ['mudir', 'muhaffidz'],
    render(root, ctx) {
      const App = g.App, hari = fmt.today(), Q = g.QURAN;
      const hqList = (App.boot.halaqah || []).filter(x => x.status !== 'Nonaktif' && (App.mudir() || x.muhaffidz === App.boot.me.id));
      const draft = LS.get('draft:input:' + g.Core.Sesi.uid(), null);
      const st = Object.assign({ tanggal: hari, halaqah: (hqList[0] || {}).id || '', jenis: 'Ziyadah', sel: ctx.q.santri || '', batch: [], q: '' }, draft || {});
      if (ctx.q.santri) { const sn = App.santri(ctx.q.santri); if (sn) st.halaqah = sn.halaqah; st.sel = ctx.q.santri; }
      let saran = {}, form = { surah: '', a1: '', a2: '', tajwid: '', kelancaran: '', catatan: '' };
      const simpanDraft = () => LS.set('draft:input:' + g.Core.Sesi.uid(), { tanggal: st.tanggal, halaqah: st.halaqah, jenis: st.jenis, batch: st.batch });

      root.innerHTML = App.kepala('Input Setoran', { sub: 'Catat setoran langsung saat halaqah — mode batch: isi beberapa santri lalu simpan sekaligus.' }) +
        '<div class="glass" style="padding:18px 20px"><div class="row-flex" style="gap:12px">' +
        '<label class="field" style="min-width:150px"><span>Tanggal</span><input class="inp" type="date" id="i-tgl" max="' + hari + '"></label>' +
        '<label class="field" style="min-width:200px;flex:1"><span>Halaqah</span><select class="inp" id="i-hq">' + hqList.map(x => '<option value="' + esc(x.id) + '">' + esc(x.nama) + '</option>').join('') + '</select></label>' +
        '<div class="field"><span>Jenis setoran</span><div class="seg lime" id="i-jenis"><button data-j="Ziyadah">' + icon('book', 'sm') + ' Ziyadah</button><button data-j="Murojaah">' + icon('repeat', 'sm') + ' Murojaah</button></div></div></div></div>' +
        (hqList.length ? '' : '<div class="hint">Anda belum memegang halaqah aktif. Minta Mudir menugaskan halaqah di menu Halaqah.</div>') +
        '<div class="flow"><div class="glass" style="padding:18px"><div class="row-flex mb12"><b style="font-size:16px">1. Pilih santri</b><span class="spacer"></span><span class="muted" id="i-progres"></span></div>' +
        '<label class="search" style="margin:0 0 12px;min-width:0"><input class="pill-in" id="i-cari" placeholder="Cari nama / NIS" style="width:100%;height:44px">' + icon('search') + '</label><div class="pick-list" id="i-santri"></div></div>' +
        '<div class="glass" id="i-form" style="padding:20px"></div></div>' +
        '<div class="batch-bar" id="i-bar" hidden><div><div class="n" id="i-bn"></div><div class="s">Disimpan dalam 1 permintaan • tetap aman bila sinyal lemah</div></div><div class="row-flex"><button class="btn btn-sm btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.25)" id="i-lihat">Lihat</button><button class="btn btn-lime" id="i-simpan">' + icon('check') + 'Simpan semua</button></div></div>';
      $('#i-tgl', root).value = st.tanggal;
      if ($('#i-hq', root)) $('#i-hq', root).value = st.halaqah;

      const santriHq = () => (App.boot.santri || []).filter(s => s.halaqah === st.halaqah && (s.status === 'Aktif' || s.status === 'Cuti')).sort((a, b) => a.nama.localeCompare(b.nama));
      function renderJenis() { $$('#i-jenis button', root).forEach(b => b.classList.toggle('on', b.dataset.j === st.jenis)); }
      function renderSantri() {
        const q = st.q.toLowerCase(), list = santriHq().filter(s => !q || (s.nama + ' ' + s.nis).toLowerCase().indexOf(q) > -1);
        const sudah = new Set(st.batch.map(b => b.santriId + '|' + b.jenis));
        $('#i-progres', root).textContent = st.batch.length + ' di batch • ' + santriHq().length + ' santri';
        $('#i-santri', root).innerHTML = list.length ? list.map(s => {
          const sr = saran[s.id], z = sr && sr.z, m = sr && sr.m;
          const info = st.jenis === 'Ziyadah' ? (z ? 'Terakhir: ' + Q.nama(z.surah) + ' ' + z.dari + '–' + z.sampai + ' • ' + fmt.rel(z.tgl) : 'Belum ada ziyadah') : (m ? 'Murojaah: ' + Q.nama(m.surah) + ' ' + m.dari + '–' + m.sampai + ' • ' + fmt.rel(m.tgl) : 'Belum ada murojaah');
          const done = sudah.has(s.id + '|' + st.jenis) || (sr && sr.last === st.tanggal);
          return '<button class="pick ' + (s.id === st.sel ? 'on ' : '') + (done ? 'done' : '') + '" data-id="' + esc(s.id) + '">' + avatar(s.nama, s.foto, 'sm') + '<div class="mid"><div class="t1">' + esc(s.nama) + '</div><div class="t2">' + esc(info) + '</div></div>' + (done ? icon('checkc') : '') + '</button>';
        }).join('') : g.UI.empty('Tidak ada santri aktif di halaqah ini.', 'users', true);
      }
      function terapkanSaran() {
        const sr = saran[st.sel];
        form = { surah: '', a1: '', a2: '', tajwid: '', kelancaran: '', catatan: '' };
        if (st.jenis === 'Ziyadah' && sr && sr.lanjut) { form.surah = sr.lanjut.surah; form.a1 = sr.lanjut.ayatDari; form.a2 = Math.min(Q.ayat(form.surah), sr.lanjut.ayatDari + Math.max(0, (sr.z ? sr.z.sampai - sr.z.dari : 4))); }
        if (st.jenis === 'Murojaah' && sr && sr.z) { form.surah = sr.z.surah; form.a1 = 1; form.a2 = sr.z.sampai; }
      }
      function info() {
        const e = form.surah ? Q.cekAyat(form.surah, form.a1, form.a2) : 'Pilih surah.';
        if (e) return '<span style="color:#B91C1C">' + esc(e) + '</span>';
        return 'Juz ' + Q.juzOf(form.surah, form.a1) + ' • ' + (form.a2 - form.a1 + 1) + ' ayat • ±' + fmt.n(Q.halaman(form.surah, form.a1, form.a2), 2) + ' halaman';
      }
      function renderForm() {
        const s = App.santri(st.sel), el = $('#i-form', root);
        if (!s) { el.innerHTML = '<b style="font-size:16px">2. Isi setoran</b>' + g.UI.empty('Pilih santri di sebelah kiri untuk mulai mencatat.', 'user', true); return; }
        const sr = saran[s.id] || {};
        const nb = (k) => '<div class="score-btns" data-k="' + k + '">' + NILAI.map(n => '<button type="button" data-n="' + n + '" class="' + (Number(form[k]) === n ? 'on' : '') + '">' + n + '</button>').join('') + '</div>';
        el.innerHTML = '<div class="row-flex" style="gap:12px">' + avatar(s.nama, s.foto) + '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:17px">' + esc(s.nama) + '</div><div class="muted" style="font-size:12.5px">NIS ' + esc(s.nis) + ' • ' + esc(st.jenis) + ' • ' + fmt.tgl(st.tanggal) + '</div></div><a class="ibtn" href="#/santri/' + esc(s.id) + '" title="Profil">' + icon('ext', 'sm') + '</a></div>' +
          (st.jenis === 'Ziyadah' && sr.lanjut ? '<div class="hint mt12">' + icon('star', 'sm') + ' Saran lanjut: <b>' + esc(Q.nama(sr.lanjut.surah)) + ' ayat ' + sr.lanjut.ayatDari + '</b> (dari ziyadah terakhir)</div>' : '') +
          '<div class="form-grid mt16"><label class="field full"><span>Surah</span><select class="inp" id="f-surah"><option value="">— pilih surah —</option>' + Q.surah.map((x, i) => '<option value="' + (i + 1) + '"' + (Number(form.surah) === i + 1 ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(x[0]) + ' (' + x[1] + ' ayat)</option>').join('') + '</select></label>' +
          '<label class="field"><span>Ayat dari</span><input class="inp" type="number" inputmode="numeric" min="1" id="f-a1" value="' + esc(form.a1) + '"></label><label class="field"><span>Ayat sampai</span><input class="inp" type="number" inputmode="numeric" min="1" id="f-a2" value="' + esc(form.a2) + '"></label>' +
          '<div class="full muted" id="f-info" style="font-size:12.5px">' + info() + '</div>' +
          '<div class="field full"><span>Nilai tajwid <b id="p-tajwid" style="color:#7A8F00">' + esc(g.App.boot ? predikatLokal(form.tajwid) : '') + '</b></span>' + nb('tajwid') + '</div>' +
          '<div class="field full"><span>Nilai kelancaran <b id="p-kelancaran" style="color:#7A8F00">' + esc(predikatLokal(form.kelancaran)) + '</b></span>' + nb('kelancaran') + '</div>' +
          '<label class="field full"><span>Catatan (opsional)</span><textarea class="inp" id="f-cat" maxlength="1000" placeholder="Mis. tawaqquf di ayat 9">' + esc(form.catatan) + '</textarea></label>' +
          '<div class="full row-flex" style="gap:6px">' + CATATAN_CEPAT.map(c => '<button type="button" class="chip" data-c="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div></div>' +
          '<div class="row-flex mt20"><button class="btn btn-white" id="f-langsung">' + icon('send') + 'Simpan langsung</button><span class="spacer"></span><button class="btn btn-lime" id="f-batch"><span class="plus">+</span>Tambah ke batch & lanjut</button></div>';
        const upd = () => { $('#f-info', el).innerHTML = info(); };
        $('#f-surah', el).onchange = (e) => { form.surah = Number(e.target.value) || ''; form.a1 = 1; form.a2 = form.surah ? Math.min(Q.ayat(form.surah), 5) : ''; $('#f-a1', el).value = form.a1; $('#f-a2', el).value = form.a2; upd(); };
        $('#f-a1', el).oninput = (e) => { form.a1 = Number(e.target.value) || ''; upd(); };
        $('#f-a2', el).oninput = (e) => { form.a2 = Number(e.target.value) || ''; upd(); };
        $('#f-cat', el).oninput = (e) => { form.catatan = e.target.value; };
        el.querySelectorAll('.score-btns').forEach(box => box.onclick = (e) => { const b = e.target.closest('[data-n]'); if (!b) return; form[box.dataset.k] = Number(b.dataset.n); $$('button', box).forEach(x => x.classList.toggle('on', x === b)); $('#p-' + box.dataset.k, el).textContent = predikatLokal(form[box.dataset.k]); });
        el.querySelectorAll('[data-c]').forEach(c => c.onclick = () => { form.catatan = (form.catatan ? form.catatan + '; ' : '') + c.dataset.c; $('#f-cat', el).value = form.catatan; });
        $('#f-batch', el).onclick = () => { const it = item(); if (!it) return; st.batch.push(it); simpanDraft(); lanjut(); toast(s.nama + ' masuk batch.'); };
        $('#f-langsung', el).onclick = async (e) => { const it = item(); if (!it) return; e.target.disabled = true; await kirim([it]); e.target.disabled = false; };
      }
      function predikatLokal(n) {
        if (n === '' || n === null || n === undefined) return '';
        let sk = []; try { sk = JSON.parse(App.setting('SKALA_NILAI') || '[]'); } catch (e) { }
        sk.sort((a, b) => b.min - a.min); const x = sk.find(k => Number(n) >= k.min); return x ? '— ' + x.label : '';
      }
      function item() {
        const e = Q.cekAyat(form.surah, form.a1, form.a2);
        if (e) { toast(e, 'err'); return null; }
        if (form.tajwid === '' || form.kelancaran === '') { toast('Pilih nilai tajwid dan kelancaran.', 'err'); return null; }
        if (st.batch.some(b => b.santriId === st.sel && b.jenis === st.jenis && b.surah === form.surah && b.ayatDari === form.a1 && b.ayatSampai === form.a2)) { toast('Setoran yang sama sudah ada di batch.', 'warn'); return null; }
        return { clientId: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), santriId: st.sel, tanggal: st.tanggal, jenis: st.jenis, surah: Number(form.surah), ayatDari: Number(form.a1), ayatSampai: Number(form.a2), tajwid: form.tajwid, kelancaran: form.kelancaran, catatan: form.catatan };
      }
      function lanjut() {
        const list = santriHq(), sudah = new Set(st.batch.map(b => b.santriId + '|' + b.jenis));
        const idx = list.findIndex(s => s.id === st.sel);
        const urut = list.slice(idx + 1).concat(list.slice(0, idx));
        const next = urut.find(s => !sudah.has(s.id + '|' + st.jenis) && !(saran[s.id] && saran[s.id].last === st.tanggal)) || urut.find(s => !sudah.has(s.id + '|' + st.jenis));
        st.sel = next ? next.id : ''; terapkanSaran(); renderSantri(); renderForm(); renderBar();
        if (innerWidth < 1024 && next) $('#i-form', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      function renderBar() {
        const bar = $('#i-bar', root); bar.hidden = !st.batch.length;
        $('#i-bn', root).textContent = st.batch.length + ' setoran siap disimpan';
      }
      async function kirim(items) {
        try {
          const r = await Outbox.kirim('setoran.save', { items: items, kirimWali: true }, items.length + ' setoran ' + fmt.tgl(st.tanggal));
          if (r.queued) { toast(r.message, 'warn', 6000); }
          else if (!r.success) { toast(r.message, 'err', 6000); return false; }
          else {
            const d = r.data || {};
            toast(r.message || 'Tersimpan.', d.galat && d.galat.length ? 'warn' : 'ok', 5000);
            if (d.galat && d.galat.length) modal({ title: 'Sebagian setoran ditolak', body: '<ul>' + d.galat.map(x => '<li>' + esc(x.pesan) + '</li>').join('') + '</ul>' });
          }
          const ids = new Set(items.map(i => i.clientId));
          st.batch = st.batch.filter(b => !ids.has(b.clientId)); simpanDraft();
          items.forEach(i => { saran[i.santriId] = Object.assign({}, saran[i.santriId], { last: i.tanggal }); if (i.jenis === 'Ziyadah') { saran[i.santriId].z = { surah: i.surah, dari: i.ayatDari, sampai: i.ayatSampai, tgl: i.tanggal }; const n = Q.ayat(i.surah); saran[i.santriId].lanjut = i.ayatSampai < n ? { surah: i.surah, ayatDari: i.ayatSampai + 1 } : null; } });
          swrHapus('setoran'); swrHapus('dash'); items.forEach(i => swrHapus('profil:' + i.santriId));
          if (items.length === 1 && st.sel === items[0].santriId) lanjut(); else { renderSantri(); renderBar(); }
          return true;
        } catch (e) { toast(e.message, 'err', 6000); return false; }
      }
      function muatSaran() {
        const ids = santriHq().map(s => s.id); if (!ids.length) { renderSantri(); renderForm(); return; }
        swr('saran:' + st.halaqah, 'setoran.saran', { santriIds: ids }, { maxAge: 60000, render: (d) => { saran = d || {}; renderSantri(); if (st.sel && !form.surah) { terapkanSaran(); renderForm(); } } });
      }
      $('#i-tgl', root).onchange = (e) => { st.tanggal = e.target.value || hari; st.batch.forEach(b => b.tanggal = st.tanggal); simpanDraft(); renderSantri(); renderForm(); };
      if ($('#i-hq', root)) $('#i-hq', root).onchange = (e) => { st.halaqah = e.target.value; st.sel = ''; simpanDraft(); renderSantri(); renderForm(); muatSaran(); };
      $('#i-jenis', root).onclick = (e) => { const b = e.target.closest('[data-j]'); if (!b) return; st.jenis = b.dataset.j; simpanDraft(); renderJenis(); terapkanSaran(); renderSantri(); renderForm(); };
      let tq; $('#i-cari', root).oninput = (e) => { clearTimeout(tq); tq = setTimeout(() => { st.q = e.target.value.trim(); renderSantri(); }, 150); };
      $('#i-santri', root).onclick = (e) => { const b = e.target.closest('.pick'); if (!b) return; st.sel = b.dataset.id; terapkanSaran(); renderSantri(); renderForm(); if (innerWidth < 1024) $('#i-form', root).scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      $('#i-simpan', root).onclick = async (e) => { if (!st.batch.length) return; e.target.disabled = true; await kirim(st.batch.slice()); e.target.disabled = false; };
      $('#i-lihat', root).onclick = () => {
        const m = modal({ title: 'Batch setoran (' + st.batch.length + ')', body: '<div>' + st.batch.map((b, i) => { const s = App.santri(b.santriId) || {}; return '<div class="queue-item">' + avatar(s.nama, s.foto, 'sm') + '<div class="mid"><b>' + esc(s.nama) + '</b><div class="muted">' + esc(b.jenis + ' • ' + Q.nama(b.surah) + ' ' + b.ayatDari + '–' + b.ayatSampai + ' • T' + b.tajwid + ' K' + b.kelancaran) + '</div></div><button class="ibtn" data-del="' + i + '" aria-label="Hapus">' + icon('trash', 'sm') + '</button></div>'; }).join('') + '</div>',
          actions: [{ label: 'Tutup' }] });
        m.body.onclick = (e) => { const d = e.target.closest('[data-del]'); if (!d) return; st.batch.splice(Number(d.dataset.del), 1); simpanDraft(); m.tutup(); renderBar(); renderSantri(); };
      };
      renderJenis(); renderSantri(); renderForm(); renderBar();
      if (st.sel) terapkanSaran();
      muatSaran();
    }
  };
})(window);
