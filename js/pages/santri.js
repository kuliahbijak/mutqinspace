/* MutqinSpace — Profil capaian santri, Peta Hafalan 30 Juz (FR-19, FR-20) & Portal Wali/Santri (FR-21..FR-23) */
(function (g) {
  'use strict';
  const { icon, esc, avatar, fmt, $, $$, toast, modal, track } = g.UI;
  const { swr, apiData, LS } = g.Core;
  const K = g.Komp;

  function juzBerjalan(p) {
    const sedang = p.peta.filter(j => j.status === 'sedang').sort((a, b) => b.hafal - a.hafal);
    const mutqin = p.peta.filter(j => j.status === 'mutqin');
    const z = p.hafalan.saran && p.hafalan.saran.z, aktif = z ? g.QURAN.juzOf(z.surah, z.dari) : (sedang[0] || {}).juz;
    let pilih = [];
    const a = p.peta.find(j => j.juz === aktif); if (a) pilih.push(a);
    sedang.forEach(j => { if (pilih.length < 3 && !pilih.includes(j)) pilih.push(j); });
    mutqin.slice().reverse().forEach(j => { if (pilih.length < 2 && !pilih.includes(j)) pilih.push(j); });
    [aktif - 1, aktif + 1, aktif - 2, aktif + 2].forEach(n => { const j = p.peta.find(x => x.juz === n); if (j && pilih.length < 3 && !pilih.includes(j)) pilih.push(j); });
    pilih = pilih.slice(0, 3).sort((x, y) => y.juz - x.juz);
    return { pilih, aktif };
  }
  function kartuJuz(p) {
    const jb = juzBerjalan(p);
    if (!jb.pilih.length) return '<div class="hint mb12">Belum ada hafalan tercatat. Setoran pertama akan muncul di sini.</div>';
    return '<div class="mini-cards">' + jb.pilih.map(j => '<div class="mini ' + (j.juz === jb.aktif ? 'on' : '') + '">' +
      (j.juz === jb.aktif ? '<div class="row-flex" style="gap:6px"><span class="fokus">#JUZ-' + j.juz + '</span></div>' : '<div class="k">Juz ' + j.juz + '</div>') +
      '<div><div class="n">' + (j.status === 'mutqin' ? 'Mutqin' : j.status === 'belum' ? 'Antrean' : j.hafal >= 0.999 ? 'Hafal 100%' : Math.round(j.hafal * 100) + '% ' + (j.juz === jb.aktif ? 'Aktif' : '')) + '</div><div class="s">' + (j.status === 'belum' ? 'Target berikutnya' : esc(j.label)) + '</div></div></div>').join('') + '</div>';
  }
  function bulanTrack(bul) {
    const max = Math.max.apply(null, bul.map(b => b.halZ + b.halM).concat([1]));
    return '<div class="months" style="grid-template-columns:repeat(' + bul.length + ',minmax(0,1fr))">' + bul.map((b, i) => '<div><div class="mh"><span class="' + (i === bul.length - 1 ? 'now' : '') + '">' + esc(fmt.bulan(b.ym).split(' ')[0]) + (i === bul.length - 1 ? ' <span class="dot"></span>' : '') + '</span><span>' + fmt.n(b.halZ + b.halM) + ' hal</span></div>' +
      track((b.halZ + b.halM) / max * 100) + '<div class="muted" style="font-size:11.5px;margin-top:8px">' + b.setoran + ' setoran • ' + b.hariSetor + ' hari</div></div>').join('') + '</div>';
  }
  function titik(k) {
    return '<div class="attn-dots">' + k.titik.map(t => '<i class="' + (t.st || 'x') + '" title="' + fmt.tgl(t.t) + ': ' + ({ H: 'Hadir', I: 'Izin', S: 'Sakit', A: 'Alpa' }[t.st] || 'tidak ada halaqah') + '">' + (t.st && t.st !== 'H' ? t.st : '') + '</i>').join('') + '</div>';
  }
  function evaluasi(p) {
    const r = p.riwayat.find(x => x.catatan);
    return '<div class="sec-t">Catatan Evaluasi Muhaffidz</div>' +
      (p.surah.lemah.length ? '<p class="muted mt8" style="font-size:13px">Surah perlu murojaah intensif (kelancaran rata-rata &lt; 85):</p>' + p.surah.lemah.map(s => '<div class="row-flex mt8"><span class="badge b-warn">' + icon('alert', 'sm') + fmt.n(s.k) + '</span><b>QS. ' + esc(s.nama) + '</b><span class="muted" style="font-size:12px">' + s.n + '× setor</span></div>').join('') : '<p class="muted mt8" style="font-size:13px">Belum ada surah dengan kelancaran di bawah 85. Alhamdulillah.</p>') +
      (p.surah.kuat.length ? '<p class="muted mt16" style="font-size:13px">Paling lancar:</p><div class="row-flex">' + p.surah.kuat.map(s => '<span class="chip">' + esc(s.nama) + ' <span class="n">' + fmt.n(s.k) + '</span></span>').join('') + '</div>' : '') +
      (r ? '<div class="hint mt16"><b>Catatan terbaru (' + fmt.tgl(r.tanggal) + '):</b> ' + esc(r.catatan) + '</div>' : '');
  }
  function panelRiwayat(root, p, opsi) {
    const st = { tab: '', sel: null, rows: p.riwayat.slice(), page: 0, lagi: p.riwayat.length >= 30 };
    const el = $(opsi.sel, root);
    el.innerHTML = '<section class="dark-panel"><div class="dp-top"><div class="tabs" data-tabs></div>' + (opsi.unduh ? '<button class="btn btn-lime btn-sm" data-unduh>' + icon('download', 'sm') + 'Unduh Rekap PDF</button>' : '') + '</div><div class="split"><div><div class="list-head"><h3>Log Riwayat Setoran</h3><span data-n></span></div><div data-rows></div></div><div data-det></div></div></section>';
    function render() {
      const rows = st.rows.filter(r => !st.tab || r.jenis === st.tab);
      const n = j => st.rows.filter(r => r.jenis === j).length;
      $('[data-tabs]', el).innerHTML = [['', 'Semua Riwayat'], ['Ziyadah', 'Ziyadah', n('Ziyadah')], ['Murojaah', 'Murojaah', n('Murojaah')]].map(t => '<button data-t="' + t[0] + '" class="' + (st.tab === t[0] ? 'on' : '') + '">' + t[1] + (t[2] !== undefined ? ' <span class="n">' + t[2] + '</span>' : '') + '</button>').join('');
      $('[data-n]', el).textContent = rows.length + ' sesi terakhir';
      if (!rows.length) { $('[data-rows]', el).innerHTML = g.UI.empty('Belum ada riwayat setoran.', 'book'); K.detailSetoran($('[data-det]', el), null); return; }
      if (!rows.some(r => r.id === st.sel)) st.sel = rows[0].id;
      $('[data-rows]', el).innerHTML = '<div class="rows">' + rows.map(s => K.barisSetoran(s, s.id === st.sel)).join('') + '</div>' + (st.lagi ? '<button class="btn btn-dark btn-block mt12" data-lagi>Muat lebih lama</button>' : '');
      K.detailSetoran($('[data-det]', el), rows.find(r => r.id === st.sel), { onUbah: opsi.onUbah });
    }
    el.onclick = async (e) => {
      const t = e.target.closest('[data-t]'); if (t) { st.tab = t.dataset.t; render(); return; }
      const r = e.target.closest('.row'); if (r) { st.sel = r.dataset.id; render(); return; }
      if (e.target.closest('[data-lagi]')) { st.page++; try { const d = await apiData('santri.riwayat', { santriId: p.santri.id, page: st.page }); st.rows = st.rows.concat(d.rows.filter(x => !st.rows.some(y => y.id === x.id))); st.lagi = d.lagi; render(); } catch (er) { toast(er.message, 'err'); } }
      if (e.target.closest('[data-unduh]')) unduhRekap(p.santri.id);
    };
    render();
  }
  async function unduhRekap(id, bulan) {
    try { const d = await apiData('rekap.santri', { santriId: id, bulan: bulan || fmt.today().substring(0, 7) }); g.UI.unduhBase64(d.nama, d.mime, d.base64); toast('Rekap PDF diunduh.'); }
    catch (e) { toast(e.message, 'err'); }
  }
  function kpiProfil(p) {
    const t = p.target;
    return '<div class="kpis"><div class="kpi"><div class="lb">Total Hafalan</div><div class="val">' + fmt.n(p.hafalan.juz) + ' <small>Juz</small></div><div class="sb">Mutqin ' + fmt.n(p.hafalan.mutqinJuz) + ' juz • ' + esc(p.hafalan.ringkas) + '</div></div>' +
      '<div class="kpi"><div class="lb">' + (t.ada ? 'Target ' + esc(t.periodeLabel) : 'Target') + '</div><div class="val">' + (t.ada ? Math.round(t.pct * 100) + '%' : '–') + (t.ada ? '<span class="delta ' + (t.tertinggal ? 'turun' : '') + '">harapan ' + Math.round(t.harap * 100) + '%</span>' : '') + '</div><div class="sb">' + (t.ada ? esc(t.label) + (t.sisaHal ? ' • sisa ' + fmt.n(t.sisaHal) + ' hal' : '') + (t.murPct !== null ? ' • murojaah ' + Math.round(t.murPct * 100) + '%' : '') : 'Belum ada target untuk santri/tingkat ini') + '</div></div>' +
      '<div class="kpi"><div class="lb">Rata-rata Skor Kelancaran</div><div class="val">' + fmt.n(p.nilai.kelancaran) + ' <small>/100</small></div><div class="sb">Predikat: ' + esc(p.nilai.predikat || '–') + ' • tajwid ' + fmt.n(p.nilai.tajwid) + '</div></div></div>';
  }

  /* ---------------- Profil santri (staf) ---------------- */
  g.Pages.santri = {
    peran: ['mudir', 'muhaffidz'],
    render(root, ctx) {
      const App = g.App, id = ctx.params[0];
      const sn = App.santri(id);
      if (!id) { location.hash = '#/halaqah'; return; }
      root.innerHTML = App.kepala(sn ? sn.nama : 'Profil Santri', { sub: sn ? 'NIS ' + esc(sn.nis) : '', aksi: '<button class="btn btn-white" id="pr-pdf">' + icon('download') + 'Unduh Rapor (PDF)</button><a class="btn btn-lime" href="#/setoran/input?santri=' + esc(id) + '"><span class="plus">+</span>Input Setoran Santri</a>' }) +
        '<div id="pr-body">' + g.UI.sk(180) + '<div class="mt20">' + g.UI.sk(300) + '</div></div>';
      $('#pr-pdf', root).onclick = () => pilihBulanRekap(id);
      const muat = (paksa) => swr('profil:' + id, 'santri.profil', { santriId: id }, { maxAge: 60000, force: paksa, render: (p) => p && tampil(p) });
      function tampil(p) {
        const sub = 'NIS ' + esc(p.santri.nis) + ' • Halaqah ' + esc(p.halaqah.nama) + ' • Muhaffidz ' + esc(p.muhaffidz.nama) + (p.santri.status !== 'Aktif' ? ' • <span class="badge b-warn">' + esc(p.santri.status) + '</span>' : '');
        $('.pagehead h1', root).textContent = p.santri.nama; $('.pagehead .sub', root).innerHTML = sub;
        const b = $('#pr-body', root);
        b.innerHTML = '<div class="grid g12"><div class="glass c8">' + kpiProfil(p) + '<div class="row-flex mt20"><b style="font-size:13px">Track Mutaba\'ah 4 Bulan</b><span class="spacer"></span><span class="muted" style="font-size:12.5px">Terakhir setor: <b>' + (p.hafalan.terakhir ? fmt.rel(p.hafalan.terakhir) : 'belum ada') + '</b></span></div>' + bulanTrack(p.bulanan.slice(-4)) +
          '<div class="row-flex mt16 muted" style="font-size:12.5px"><span>' + avatar(p.muhaffidz.nama, p.muhaffidz.foto, 'xs') + '</span><span>' + esc(p.muhaffidz.nama) + '</span><span class="spacer"></span><span>Kehadiran bulan ini: <b style="color:#111">' + fmt.pct(p.kehadiran.bulanIni.pct) + '</b></span></div></div>' +
          '<div class="glass c4"><div class="att-head"><span class="lb">Kelancaran Juz Berjalan</span>' + (App.mudir() ? '<button class="ibtn" id="pr-awal" title="Hafalan awal / kartu fisik" style="width:34px;height:34px">' + icon('edit', 'sm') + '</button>' : '') + '</div><div class="mt16">' + kartuJuz(p) + '</div>' +
          (p.wali && p.wali.length ? '<div class="sec-t" style="font-size:14px">Wali santri</div>' + p.wali.map(w => '<div class="row-flex mt8"><span class="badge b-mut">' + esc(w.hubungan) + '</span><b>' + esc(w.nama) + '</b><span class="spacer"></span>' + (w.wa ? '<a class="ibtn" style="width:34px;height:34px" target="_blank" rel="noopener" href="https://wa.me/' + esc('62' + String(w.wa).replace(/^0/, '')) + '" title="WhatsApp ' + esc(w.wa) + '">' + icon('wa', 'sm') + '</a>' : '') + '</div>').join('') : '<div class="hint">Belum ada data wali.</div>') +
          (App.mudir() ? '<div class="row-flex mt16"><button class="btn btn-white btn-sm" id="pr-pin">' + icon('key', 'sm') + 'Reset PIN wali</button><a class="btn btn-white btn-sm" href="#/halaqah?tab=santri&q=' + esc(p.santri.nis) + '">' + icon('edit', 'sm') + 'Edit data</a></div>' : '') + '</div></div>' +
          '<div class="glass"><div class="row-flex mb12"><div><div class="sec-t">Peta Hafalan 30 Juz</div><div class="muted" style="font-size:13px">Pemetaan hafalan (ziyadah) dan daya ingat jangka panjang (mutqin = sudah dimurojaah lancar).</div></div><span class="spacer"></span><div class="legend"><span><i style="background:rgba(216,244,60,.7)"></i>Mutqin</span><span><i style="background:#fff;border:1px solid #C9E632"></i>Sedang dihafal</span><span><i style="background:#E5E7EB"></i>Belum mulai</span></div></div>' + K.petaJuz(p.peta, { aktif: juzBerjalan(p).aktif }) + '</div>' +
          '<div class="grid g12"><div class="glass c8"><div class="row-flex"><div><div class="sec-t">Tren Nilai Tajwid & Kelancaran</div><div class="muted" style="font-size:13px">Rata-rata bulanan, 6 bulan terakhir</div></div></div><div id="pr-ch" class="mt12"></div></div><div class="glass c4">' + evaluasi(p) + '</div></div>' +
          '<div class="glass"><div class="row-flex mb12"><div><div class="sec-t">Kedisiplinan Halaqah (30 Hari Terakhir)</div><div class="muted" style="font-size:13px">Tingkat kehadiran ' + fmt.pct(p.kehadiran.hari30.pct) + ' • ' + p.kehadiran.hari30.h + ' hadir, ' + p.kehadiran.hari30.i + ' izin, ' + p.kehadiran.hari30.s + ' sakit, ' + p.kehadiran.hari30.a + ' alpa</div></div></div>' + titik(p.kehadiran) + '</div>' +
          '<div id="pr-riw"></div>';
        const bl = p.bulanan;
        g.UI.lineChart($('#pr-ch', b), bl.map(x => x.label), [{ name: 'Tajwid', color: '#7A8F00', values: bl.map(x => x.tajwid) }, { name: 'Kelancaran', color: '#2F78A8', values: bl.map(x => x.kelancaran) }], { id: 'pr', label: 'Tren nilai tajwid dan kelancaran' });
        panelRiwayat(b, p, { sel: '#pr-riw', onUbah: () => muat(true) });
        const aw = $('#pr-awal', b); if (aw) aw.onclick = () => hafalanAwal(p.santri.id, () => muat(true));
        const pin = $('#pr-pin', b); if (pin) pin.onclick = () => g.Pages.halaqah.resetPin([p.santri.id]);
      }
      ctx.halaman.segarkan = () => muat(true);
      muat(false);
    }
  };

  function pilihBulanRekap(id) {
    const ym = fmt.today().substring(0, 7);
    const opsi = [0, -1, -2, -3, -4, -5].map(n => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + n); const v = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); return '<option value="' + v + '">' + fmt.bulan(v) + '</option>'; }).join('');
    modal({ title: 'Unduh rekap bulanan (PDF)', body: '<label class="field"><span>Bulan</span><select class="inp" name="bulan">' + opsi + '</select></label><p class="muted" style="font-size:12.5px">Berisi ringkasan setoran, target, peta hafalan 30 juz, dan rincian setoran bulan tersebut.</p>',
      actions: [{ label: 'Batal' }, { label: 'Unduh PDF', cls: 'btn-lime', icon: 'download', fn: async (b) => { await unduhRekap(id, g.UI.formData(b).bulan || ym); } }] });
  }

  function hafalanAwal(id, onSimpan) {
    apiData('hafalan.awal', { santriId: id }).then(d => {
      const body = g.UI.h('<div><p class="muted" style="margin-top:0">Tandai juz yang sudah dihafal sebelum memakai aplikasi (dari kartu mutaba\'ah fisik). Klik sekali = hafal, dua kali = mutqin, tiga kali = kosongkan.</p><div class="juzgrid" data-g></div><label class="field mt16"><span>Catatan</span><input class="inp" name="catatan" value="' + esc(d.catatan || '') + '" placeholder="Mis. sumber: kartu mutaba\'ah 2024"></label></div>');
      const st = {}; d.juz.forEach(j => st[j.juz] = j.mutqin >= 0.999 ? 2 : j.hafal >= 0.999 ? 1 : 0);
      const render = () => { $('[data-g]', body).innerHTML = d.juz.map(j => '<button type="button" class="juz ' + (st[j.juz] === 2 ? 'mutqin' : st[j.juz] === 1 ? 'sedang' : 'belum') + '" data-j="' + j.juz + '"><div class="h"><span>' + j.juz + '</span></div><div class="st">' + (st[j.juz] === 2 ? 'Mutqin' : st[j.juz] === 1 ? 'Hafal' : (j.hafal > 0 ? 'Sebagian' : '–')) + '</div></button>').join(''); };
      body.onclick = (e) => { const b = e.target.closest('[data-j]'); if (!b) return; const j = Number(b.dataset.j); st[j] = (st[j] + 1) % 3; render(); };
      render();
      modal({ title: 'Hafalan awal (kartu fisik)', wide: true, body, actions: [{ label: 'Batal' }, { label: 'Simpan', cls: 'btn-lime', fn: async (b) => {
        const hafal = Object.keys(st).filter(k => st[k] >= 1).map(Number), mutqin = Object.keys(st).filter(k => st[k] === 2).map(Number);
        const r = await apiData('hafalan.awalSimpan', { santriId: id, juzHafal: hafal, juzMutqin: mutqin, catatan: g.UI.formData(b).catatan }); toast('Hafalan awal tersimpan.'); g.Core.swrHapus('profil:' + id); if (onSimpan) onSimpan(r);
      } }] });
    }).catch(e => toast(e.message, 'err'));
  }
  g.Pages.santri.hafalanAwal = hafalanAwal;

  /* ---------------- Portal wali / santri ---------------- */
  function idAnak() {
    const App = g.App, me = App.boot.me;
    if (me.role === 'santri') return me.sid;
    const ada = (App.boot.santri || []).map(s => s.id);
    let id = App.anakAktif || LS.get('anak:' + g.Core.Sesi.uid(), '');
    if (ada.indexOf(id) === -1) id = me.sid || ada[0];
    App.anakAktif = id; return id;
  }
  function pemilihAnak(aktif) {
    const anak = (g.App.boot.santri || []).filter(s => s.status !== 'Nonaktif');
    if (anak.length < 2) return '';
    return '<div class="tabs light" id="pt-anak" style="padding:5px">' + anak.map(s => { const hq = g.App.halaqah(s.halaqah); return '<button data-a="' + esc(s.id) + '" class="' + (s.id === aktif ? 'on' : '') + '" style="padding:6px 14px 6px 6px">' + avatar(s.nama, s.foto, 'sm') + '<span style="text-align:left;line-height:1.15"><b style="display:block;font-size:13px">' + esc(s.nama) + '</b><small style="font-size:10.5px;opacity:.75">' + esc(hq ? hq.nama : '') + '</small></span></button>'; }).join('') + '</div>';
  }
  function ikatAnak(root, ulang) { const el = $('#pt-anak', root); if (el) el.onclick = (e) => { const b = e.target.closest('[data-a]'); if (!b) return; g.App.anakAktif = b.dataset.a; LS.set('anak:' + g.Core.Sesi.uid(), b.dataset.a); ulang(); }; }

  g.Pages.portal = {
    peran: ['wali', 'santri'],
    render(root, ctx) {
      const App = g.App, me = App.boot.me, id = idAnak();
      const sapaan = me.role === 'wali' ? 'Assalamu\'alaikum, ' + (/^(bapak|ibu|wali)/i.test(me.nama) ? '' : 'Bapak/Ibu ') + me.nama : 'Assalamu\'alaikum, ' + me.nama;
      root.innerHTML = '<div class="pagehead"><div class="ttl"><span class="ibtn" style="background:var(--accent-lime);border:0;width:44px;height:44px">' + icon('users') + '</span><div><h1 style="font-size:30px">' + esc(sapaan) + '</h1><div class="sub">Portal Mutaba\'ah & Monitoring Capaian Tahfidz Al-Qur\'an ' + (me.role === 'wali' ? 'Ananda' : '') + '</div></div></div>' +
        '<div class="act">' + pemilihAnak(id) + '<button class="btn btn-lime" id="pt-pdf">' + icon('download') + 'Unduh Rekap (PDF)</button></div></div><div id="pt-body">' + g.UI.sk(200) + '<div class="mt20">' + g.UI.sk(300) + '</div></div>';
      ikatAnak(root, () => App.route());
      $('#pt-pdf', root).onclick = () => pilihBulanRekap(id);
      const muat = (paksa) => swr('profil:' + id, 'santri.profil', { santriId: id }, { maxAge: 60000, force: paksa, render: (p) => p && tampil(p) });
      function tampil(p) {
        const r0 = p.riwayat[0], t = p.target, k = p.kehadiran;
        const jb = juzBerjalan(p);
        $('#pt-body', root).innerHTML = '<div class="grid g12"><div class="glass c7"><div class="row-flex mb12"><span class="dot pulse" style="background:#B8D41F"></span><b style="font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:#6B7280">Ikhtisar Capaian ' + esc(App.setting('LABEL_PERIODE') || '') + '</b><span class="spacer"></span><span class="badge b-mut">' + esc(p.santri.nama) + '</span></div>' +
          '<div class="kpis"><div class="kpi"><div class="lb">Setoran Terakhir</div><div class="val" style="font-size:24px">' + (r0 ? esc(r0.namaSurah + ' ' + r0.a1 + '–' + r0.a2) : '–') + '</div>' + (r0 ? '<div class="row-flex mt8"><span class="badge b-lime">Nilai ' + fmt.n(r0.nilai) + ' • ' + esc(r0.pred) + '</span></div><div class="sb">' + fmt.rel(r0.tanggal) + ' • ' + esc(r0.muhaffidz) + '</div>' : '<div class="sb">Belum ada setoran</div>') + '</div>' +
          '<div class="kpi"><div class="lb">' + (t.ada ? 'Target ' + esc(t.periodeLabel) : 'Target') + '</div><div class="val">' + (t.ada ? Math.round(t.pct * 100) + '%' : '–') + (t.ada ? '<span class="delta ' + (t.tertinggal ? 'turun' : '') + '">' + (t.tertinggal ? 'perlu dikejar' : 'on-track') + '</span>' : '') + '</div><div class="sb">' + (t.ada ? esc(t.label) + (t.sisaHal ? ' • sisa ' + fmt.n(t.sisaHal) + ' hal' : '') : 'Target belum ditetapkan') + '</div></div>' +
          '<div class="kpi"><div class="lb">Kehadiran Halaqah</div><div class="val">' + fmt.pct(k.hari30.pct) + '</div><div class="sb">' + k.hari30.h + ' dari ' + (k.hari30.h + k.hari30.i + k.hari30.s + k.hari30.a) + ' sesi hadir (30 hari)</div></div></div>' +
          '<div class="mt20"><div class="mh"><span>Progres Bulanan</span><span class="muted" style="font-weight:500">halaman ziyadah + murojaah</span></div></div>' + bulanTrack(p.bulanan.slice(-3)) + '</div>' +
          '<div class="glass c5"><div class="att-head"><span class="lb">Status Kelancaran & Mutaba\'ah</span><a class="ibtn" href="#/peta" style="width:34px;height:34px" title="Peta hafalan">' + icon('ne', 'sm') + '</a></div>' +
          '<div class="big-n" style="font-size:40px">' + fmt.n(p.hafalan.juz) + ' <small style="font-size:16px;color:#6B7280;font-weight:600">Juz</small><span class="tag-warn" style="background:#F1F9C4;color:#4D5B00;border-color:#D8F43C">Mutqin ' + fmt.n(p.hafalan.mutqinJuz) + ' juz</span></div>' + kartuJuz(p) +
          (p.muhaffidz.wa ? '<a class="btn btn-dark btn-block" target="_blank" rel="noopener" href="https://wa.me/' + esc(p.muhaffidz.wa) + '?text=' + encodeURIComponent('Assalamu\'alaikum ' + p.muhaffidz.nama + ', saya wali dari ' + p.santri.nama + '.') + '">' + icon('wa') + 'Hubungi ' + esc(p.muhaffidz.nama) + ' via WhatsApp</a>' : '<div class="hint">Muhaffidz: <b>' + esc(p.muhaffidz.nama) + '</b> • ' + esc(p.halaqah.nama) + '</div>') + '</div></div>' +
          '<div class="glass"><div class="row-flex mb12">' + icon('cal') + '<div><div class="sec-t" style="margin:0">Kedisiplinan Halaqah (30 Hari Terakhir)</div><div class="muted" style="font-size:13px">Tingkat kehadiran ' + fmt.pct(k.hari30.pct) + ' • ' + k.hari30.h + ' hadir, ' + k.hari30.i + ' izin, ' + k.hari30.s + ' sakit, ' + k.hari30.a + ' alpa</div></div><span class="spacer"></span><div class="legend"><span><i style="background:#D8F43C"></i>Hadir</span><span><i style="background:#93C5FD"></i>Izin</span><span><i style="background:#FCD34D"></i>Sakit</span><span><i style="background:#FCA5A5"></i>Alpa</span></div></div>' + titik(k) + '</div>' +
          '<div id="pt-riw"></div>';
        panelRiwayat($('#pt-body', root), p, { sel: '#pt-riw', unduh: true });
        void jb;
      }
      ctx.halaman.segarkan = () => muat(true);
      muat(false);
    }
  };

  g.Pages.peta = {
    peran: ['wali', 'santri'],
    render(root, ctx) {
      const App = g.App, id = idAnak();
      root.innerHTML = App.kepala('Peta Hafalan 30 Juz', { sub: 'Pemetaan hafalan dan daya ingat jangka panjang (mutqin)', aksi: pemilihAnak(id) }) + '<div id="pe-body">' + g.UI.sk(300) + '</div>';
      ikatAnak(root, () => App.route());
      swr('profil:' + id, 'santri.profil', { santriId: id }, { maxAge: 60000, render: (p) => {
        if (!p) return;
        const b = $('#pe-body', root);
        b.innerHTML = '<div class="glass">' + kpiProfil(p) + '</div><div class="glass mt20"><div class="row-flex mb12"><div class="sec-t">' + esc(p.santri.nama) + ' — ' + esc(p.hafalan.ringkas) + '</div><span class="spacer"></span><div class="legend"><span><i style="background:rgba(216,244,60,.7)"></i>Mutqin</span><span><i style="background:#fff;border:1px solid #C9E632"></i>Sedang dihafal</span><span><i style="background:#E5E7EB"></i>Belum</span></div></div>' + K.petaJuz(p.peta, { aktif: juzBerjalan(p).aktif }) + '</div>' +
          '<div class="grid g12 mt20"><div class="glass c8"><div class="sec-t">Tren Nilai (6 Bulan)</div><div id="pe-ch" class="mt12"></div></div><div class="glass c4">' + evaluasi(p) + '</div></div>';
        g.UI.lineChart($('#pe-ch', b), p.bulanan.map(x => x.label), [{ name: 'Tajwid', color: '#7A8F00', values: p.bulanan.map(x => x.tajwid) }, { name: 'Kelancaran', color: '#2F78A8', values: p.bulanan.map(x => x.kelancaran) }], { id: 'pe' });
      } });
    }
  };

  g.Pages.riwayat = {
    peran: ['wali', 'santri'],
    render(root, ctx) {
      const App = g.App, id = idAnak();
      root.innerHTML = App.kepala('Riwayat Setoran', { sub: 'Seluruh setoran ziyadah & murojaah beserta catatan muhaffidz', aksi: pemilihAnak(id) }) + '<div id="rw-body">' + g.UI.skRows(6) + '</div>';
      ikatAnak(root, () => App.route());
      swr('profil:' + id, 'santri.profil', { santriId: id }, { maxAge: 60000, render: (p) => { if (p) { $('#rw-body', root).innerHTML = ''; panelRiwayat(root, p, { sel: '#rw-body', unduh: true }); } } });
    }
  };
})(window);
