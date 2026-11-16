/* MutqinSpace — Dashboard Mudir & Muhaffidz (FR-17, FR-18) — tata letak mengikuti referensi UI */
(function (g) {
  'use strict';
  const { icon, esc, avatar, fmt, $, $$, toast, modal, track } = g.UI;
  const { swr, apiData, LS } = g.Core;
  const K = g.Komp;

  g.Pages.dashboard = {
    peran: ['mudir', 'muhaffidz'],
    render(root, ctx) {
      const App = g.App, mudir = App.mudir();
      const hari = fmt.today();
      const st = Object.assign({ halaqah: '', predikat: '', dari: hari, sampai: hari, q: '', tab: 'semua', sel: null, fokus: 0 }, LS.get('f:dash', {}));
      if (st.sampai < st.dari) st.sampai = st.dari;
      let dash = null, list = null;
      const hqOpt = (App.boot.halaqah || []).filter(x => x.status !== 'Nonaktif');
      root.innerHTML = App.kepala(mudir ? 'Dashboard Tahfidz' : 'Dashboard Halaqah', {
        kembali: true, aksi: '<a class="btn btn-white" href="#/laporan">' + icon('download') + 'Ekspor Laporan</a><a class="btn btn-lime" href="#/setoran/input"><span class="plus">+</span>Input Setoran</a>' }) +
        '<div class="grid g12" id="d-top"><div class="glass c8" id="d-kpi">' + g.UI.sk(110) + '<div class="mt20">' + g.UI.sk(60) + '</div></div><div class="glass c4" id="d-att">' + g.UI.sk(200) + '</div></div>' +
        '<div class="filters" id="d-fil"><span class="lbl">Filter Aktif <span class="count-dot" id="d-nf">0</span></span>' +
        (hqOpt.length > 1 ? '<select class="pill-in" id="f-hq" aria-label="Halaqah"><option value="">Semua Halaqah</option>' + hqOpt.map(x => '<option value="' + esc(x.id) + '">' + esc(x.nama) + '</option>').join('') + '</select>' : '') +
        '<select class="pill-in" id="f-pred" aria-label="Status nilai"><option value="">Semua Status</option>' + ['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Maqbul', 'Rasib'].map(p => '<option>' + p + '</option>').join('') + '</select>' +
        '<input class="pill-in" type="date" id="f-dari" aria-label="Dari tanggal" max="' + hari + '"><input class="pill-in" type="date" id="f-sampai" aria-label="Sampai tanggal" max="' + hari + '">' +
        '<label class="search"><input class="pill-in" id="f-q" placeholder="Cari santri atau surah..." aria-label="Cari santri atau surah">' + icon('search') + '</label></div>' +
        '<section class="dark-panel"><div class="dp-top"><div class="tabs" id="d-tabs" role="tablist"></div><div class="row-flex"><button class="ibtn dark" id="d-ref" title="Segarkan" aria-label="Segarkan">' + icon('refresh') + '</button><button class="ibtn dark" id="d-more" title="Lainnya" aria-label="Lainnya">' + icon('more') + '</button></div></div>' +
        '<div class="split"><div><div class="list-head"><h3 id="d-lt">Daftar Setoran Hari Ini</h3><span id="d-ls"></span></div><div id="d-rows">' + g.UI.skRows(5) + '</div></div><div id="d-det"></div></div></section>';

      const fhq = $('#f-hq', root), fpred = $('#f-pred', root), fdari = $('#f-dari', root), fsamp = $('#f-sampai', root), fq = $('#f-q', root);
      if (fhq) fhq.value = st.halaqah; fpred.value = st.predikat; fdari.value = st.dari; fsamp.value = st.sampai; fq.value = st.q;
      const simpanF = () => LS.set('f:dash', { halaqah: st.halaqah, predikat: st.predikat });

      /* ---------- KPI & perhatian ---------- */
      function renderDash(d) {
        dash = d; if (!d) return;
        const k = d.kpi;
        $('#d-kpi', root).innerHTML = '<div class="kpis">' +
          '<div class="kpi"><div class="lb">Setoran Bulan Ini</div><div class="val">' + fmt.n(k.halamanBulan) + ' <small>Hal</small>' + (k.deltaBulan !== null ? '<span class="delta ' + (k.deltaBulan < 0 ? 'turun' : '') + '" title="Dibanding bulan lalu pada periode yang sama">' + (k.deltaBulan > 0 ? '+' : '') + fmt.n(k.deltaBulan) + '%</span>' : '') + '</div><div class="sb">' + fmt.n(k.setoranBulan, 0) + ' setoran • ziyadah ' + fmt.n(k.halZ) + ' • murojaah ' + fmt.n(k.halM) + ' hal</div></div>' +
          '<div class="kpi"><div class="lb">Pencapaian Target</div><div class="val">' + (k.pencapaian === null ? '–' : fmt.n(k.pencapaian, 0) + '%') + (k.nTarget ? '<span class="delta ' + (k.tertinggal ? 'turun' : '') + '">' + (k.nTarget - k.tertinggal) + '/' + k.nTarget + ' on-track</span>' : '') + '</div><div class="sb">' + (k.nTarget ? 'Rata-rata capaian dari target ' + esc(App.setting('LABEL_PERIODE') || 'periode') : 'Belum ada target — atur di menu Halaqah → Target') + '</div></div>' +
          '<div class="kpi"><div class="lb">Rata-rata Kehadiran</div><div class="val">' + (k.kehadiran === null ? '–' : fmt.n(k.kehadiran, 0) + '%') + '</div><div class="sb">' + fmt.n(k.santriAktif, 0) + ' santri aktif • ' + fmt.n(k.sudahSetor, 0) + ' setor hari ini</div></div></div>' +
          K.bulanan(d.bulan, App.staf_);
        const grup = d.perhatian.grup || [];
        if (st.fokus >= grup.length) st.fokus = 0;
        const fokus = grup[st.fokus];
        $('#d-att', root).innerHTML = '<div class="att-head"><span class="lb">Santri Perlu Perhatian</span><button class="ibtn" id="att-all" aria-label="Lihat semua" style="width:34px;height:34px">' + icon('ne', 'sm') + '</button></div>' +
          '<div class="big-n">' + fmt.n(d.perhatian.total, 0) + (d.perhatian.total ? '<span class="tag-warn">' + (d.kpi.tertinggal ? 'Ketinggalan Target' : 'Perlu Pendampingan') + '</span>' : '<span class="badge b-ok">Semua on-track</span>') + '</div>' +
          (grup.length ? '<div class="mini-cards">' + grup.slice(0, 3).map((x, i) => '<button class="mini ' + (i === st.fokus ? 'on' : '') + '" data-i="' + i + '">' + (i === st.fokus ? '<div class="row-flex" style="gap:6px"><span class="fokus">FOKUS</span><b style="font-size:12px">' + x.jumlah + ' santri</b></div>' : '<div class="k">' + esc(x.muhaffidz) + '</div>') +
            '<div><div class="n">' + esc(x.nama) + '</div><div class="s">' + (i === st.fokus ? esc(x.muhaffidz) : x.jumlah + ' Santri') + '</div></div></button>').join('') + '</div>' : '<div class="hint mb12">Tidak ada santri yang tertinggal. Alhamdulillah.</div>') +
          '<button class="btn btn-dark btn-block" id="att-kirim" ' + (fokus ? '' : 'disabled') + '>Kirim Pengingat Wali ' + icon('arrow') + '</button>';
        $$('#d-att .mini', root).forEach(b => b.onclick = () => { st.fokus = Number(b.dataset.i); renderDash(dash); });
        $('#att-all', root).onclick = () => lihatPerhatian(d);
        $('#att-kirim', root).onclick = async (e) => {
          const ids = d.perhatian.santri.filter(x => !fokus || x.halaqahId === fokus.id).map(x => x.id);
          if (!(await g.UI.konfirmasi('Kirim pesan pengingat ke wali dari ' + ids.length + ' santri di ' + (fokus ? fokus.nama : 'semua halaqah') + '?', { ya: 'Kirim' }))) return;
          e.target.disabled = true;
          try { const r = await g.Core.api('dash.pengingatWali', { santriIds: ids }); toast(r.message, r.success ? 'ok' : 'err', 5000); } finally { e.target.disabled = false; }
        };
        $('#d-ls', root).textContent = fmt.n(k.sudahSetor, 0) + ' dari ' + fmt.n(k.santriAktif, 0) + ' santri';
      }
      function lihatPerhatian(d) {
        const body = d.perhatian.santri.length ? '<div class="card-list" style="grid-template-columns:1fr">' + d.perhatian.santri.map(x => {
          const hq = App.halaqah(x.halaqahId);
          return '<a class="ocard" href="#/santri/' + esc(x.id) + '" style="flex-direction:row;align-items:center;gap:12px">' + avatar(x.nama, x.foto, 'sm') + '<div style="flex:1;min-width:0"><div class="t" style="font-size:14px">' + esc(x.nama) + ' <span class="muted" style="font-weight:500">• ' + esc(hq ? hq.nama : '') + '</span></div><div class="s">' + x.alasan.map(esc).join(' • ') + '</div></div>' + (x.pct !== null ? '<span class="badge b-warn">' + Math.round(x.pct * 100) + '%</span>' : '') + '</a>';
        }).join('') + '</div>' : g.UI.empty('Tidak ada santri yang perlu perhatian.', 'checkc', true);
        const m = modal({ title: 'Santri perlu perhatian (' + d.perhatian.total + ')', body, wide: true });
        $$('a', m.body).forEach(a => a.addEventListener('click', () => m.tutup()));
      }

      /* ---------- Daftar setoran + detail ---------- */
      function tersaring() {
        if (!list) return [];
        const q = st.q.toLowerCase();
        const pending = pendingRows();
        return pending.concat(list.rows).filter(s => (st.tab === 'semua' || s.jenis.toLowerCase() === st.tab) && (!st.predikat || s.pred === st.predikat) &&
          (!q || (s.santri + ' ' + s.nis + ' ' + s.namaSurah + ' ' + s.id).toLowerCase().indexOf(q) > -1));
      }
      function pendingRows() {
        return g.Core.Outbox.list().filter(o => o.action === 'setoran.save').flatMap(o => o.data.items.map(it => {
          const sn = App.santri(it.santriId) || {};
          return { id: 'offline', pending: true, santriId: it.santriId, santri: sn.nama || '?', nis: sn.nis, foto: sn.foto, jenis: it.jenis, juz: g.QURAN.juzOf(it.surah, it.ayatDari), surah: it.surah, namaSurah: g.QURAN.nama(it.surah), a1: it.ayatDari, a2: it.ayatSampai, tajwid: it.tajwid, kelancaran: it.kelancaran, nilai: (Number(it.tajwid) + Number(it.kelancaran)) / 2, tanggal: it.tanggal, catatan: it.catatan };
        })).filter(s => (!st.halaqah || (App.santri(s.santriId) || {}).halaqah === st.halaqah) && s.tanggal >= st.dari && s.tanggal <= st.sampai);
      }
      function renderList() {
        const rows = tersaring(), h = list ? list.hitung : { semua: 0, ziyadah: 0, murojaah: 0 };
        $('#d-tabs', root).innerHTML = [['semua', 'Semua Setoran', h.semua], ['ziyadah', 'Ziyadah', h.ziyadah], ['murojaah', 'Murojaah', h.murojaah]]
          .map(t => '<button role="tab" data-t="' + t[0] + '" class="' + (st.tab === t[0] ? 'on' : '') + '" aria-selected="' + (st.tab === t[0]) + '">' + t[1] + (t[0] !== 'semua' ? ' <span class="n">' + t[2] + '</span>' : '') + '</button>').join('');
        $('#d-lt', root).textContent = st.dari === hari && st.sampai === hari ? 'Daftar Setoran Hari Ini' : 'Setoran ' + fmt.tgl(st.dari) + (st.sampai !== st.dari ? ' – ' + fmt.tgl(st.sampai) : '');
        if (!list) return;
        if (!rows.length) { $('#d-rows', root).innerHTML = g.UI.empty(st.dari === hari ? 'Belum ada setoran hari ini. Ketuk "Input Setoran" untuk mulai mencatat.' : 'Tidak ada setoran pada filter ini.', 'book'); K.detailSetoran($('#d-det', root), null); return; }
        if (!st.sel || !rows.some(r => r.id === st.sel)) st.sel = rows.find(r => !r.pending) ? rows.find(r => !r.pending).id : null;
        $('#d-rows', root).innerHTML = '<div class="rows">' + rows.slice(0, 80).map(s => K.barisSetoran(s, s.id === st.sel)).join('') + '</div>' + (rows.length > 80 ? '<p class="muted" style="text-align:center;font-size:12.5px">Menampilkan 80 dari ' + rows.length + ' — gunakan menu Setoran untuk daftar lengkap.</p>' : '');
        K.detailSetoran($('#d-det', root), rows.find(r => r.id === st.sel), { onUbah: () => muat(true) });
      }
      $('#d-rows', root).onclick = (e) => { const b = e.target.closest('.row'); if (!b || b.classList.contains('pending')) return; st.sel = b.dataset.id; renderList(); if (innerWidth < 1024) $('#d-det', root).scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      $('#d-tabs', root).onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; st.tab = b.dataset.t; renderList(); };

      function nFilter() { const n = [st.halaqah, st.predikat, st.q, st.dari !== hari || st.sampai !== hari ? 1 : ''].filter(Boolean).length; $('#d-nf', root).textContent = n; }
      function muat(paksa) {
        nFilter();
        const kunci = (st.halaqah || 'all');
        swr('dash:' + kunci, 'dash.ringkas', { halaqah: st.halaqah }, { maxAge: 30000, force: !!paksa, render: renderDash });
        swr('setoran:' + kunci + ':' + st.dari + ':' + st.sampai, 'setoran.list', { dari: st.dari, sampai: st.sampai, halaqah: st.halaqah, per: 200 }, { maxAge: 20000, force: !!paksa, render: (d) => { list = d; renderList(); } });
      }
      if (fhq) fhq.onchange = () => { st.halaqah = fhq.value; st.fokus = 0; simpanF(); muat(); };
      fpred.onchange = () => { st.predikat = fpred.value; simpanF(); nFilter(); renderList(); };
      fdari.onchange = () => { st.dari = fdari.value || hari; if (st.sampai < st.dari) { st.sampai = st.dari; fsamp.value = st.sampai; } muat(); };
      fsamp.onchange = () => { st.sampai = fsamp.value || hari; if (st.sampai < st.dari) { st.dari = st.sampai; fdari.value = st.dari; } muat(); };
      let tq; fq.oninput = () => { clearTimeout(tq); tq = setTimeout(() => { st.q = fq.value.trim(); nFilter(); renderList(); }, 250); };
      $('#d-ref', root).onclick = () => { muat(true); toast('Data disegarkan dari server.'); };
      $('#d-more', root).onclick = () => {
        const m = modal({ title: 'Aksi cepat', body: '<div class="card-list" style="grid-template-columns:1fr">' +
          '<button class="btn btn-white" data-a="xls">' + icon('download') + 'Unduh daftar ini (Excel)</button>' +
          '<a class="btn btn-white" href="#/presensi">' + icon('checkc') + 'Presensi cepat</a>' +
          (dash && dash.belumSetor ? '<button class="btn btn-white" data-a="belum">' + icon('alert') + 'Belum setor hari ini (' + dash.jumlahBelumSetor + ')</button>' : '') + '</div>' });
        m.body.onclick = (e) => {
          const a = e.target.closest('[data-a]'); if (e.target.closest('a')) m.tutup(); if (!a) return;
          if (a.dataset.a === 'xls') { const r = tersaring().filter(x => !x.pending); g.UI.eksporExcel('Setoran_' + st.dari + '_' + st.sampai, [{ k: 'tanggal', label: 'Tanggal' }, { k: 'nis', label: 'NIS' }, { k: 'santri', label: 'Santri' }, { k: 'halaqah', label: 'Halaqah' }, { k: 'jenis', label: 'Jenis' }, { k: 'namaSurah', label: 'Surah' }, { k: 'a1', label: 'Ayat dari' }, { k: 'a2', label: 'Ayat sampai' }, { k: 'tajwid', label: 'Tajwid' }, { k: 'kelancaran', label: 'Kelancaran' }, { k: 'pred', label: 'Predikat' }, { k: 'catatan', label: 'Catatan' }], r); m.tutup(); }
          if (a.dataset.a === 'belum') { m.tutup(); modal({ title: 'Belum setor hari ini', wide: true, body: '<div class="card-list">' + dash.belumSetor.map(x => '<a class="ocard" href="#/santri/' + esc(x.id) + '" style="flex-direction:row;align-items:center;gap:10px">' + avatar(x.nama, x.foto, 'sm') + '<div><div class="t" style="font-size:14px">' + esc(x.nama) + '</div><div class="s">Terakhir: ' + (x.last ? fmt.tgl(x.last) : 'belum pernah') + '</div></div></a>').join('') + '</div>' }); }
        };
      };
      ctx.halaman.segarkan = () => muat(true);
      renderList();
      muat();
    }
  };
})(window);
