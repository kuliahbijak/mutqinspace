/* MutqinSpace — Pengaturan sistem (Mudir): umum, keamanan & rahasia, data & migrasi, status sistem, log aktivitas */
(function (g) {
  'use strict';
  const { icon, esc, fmt, $, $$, toast, modal } = g.UI;
  const { api, apiData } = g.Core;
  const TABS = [['umum', 'Umum'], ['keamanan', 'Keamanan'], ['data', 'Data & Migrasi'], ['sistem', 'Sistem'], ['log', 'Log Aktivitas']];

  g.Pages.pengaturan = {
    peran: ['mudir'],
    render(root, ctx) {
      const tab = ctx.q.tab || 'umum';
      root.innerHTML = g.App.kepala('Pengaturan', { sub: 'Konfigurasi lembaga, keamanan, data, dan kesehatan sistem.' }) +
        '<div class="tabs light" id="p-tabs">' + TABS.map(t => '<button data-t="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div><div id="p-body">' + g.UI.sk(300) + '</div>';
      $('#p-tabs', root).onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) location.hash = '#/pengaturan?tab=' + b.dataset.t; };
      const el = $('#p-body', root);
      ({ umum: tabUmum, keamanan: tabKeamanan, data: tabData, sistem: tabSistem, log: tabLog }[tab] || tabUmum)(el);
    }
  };

  function tabUmum(el) {
    apiData('pengaturan.get', {}).then(d => {
      const ya = (k) => /_AKTIF$|^TAMPILKAN_|^REKAP_OTOMATIS$/.test(k);
      el.innerHTML = '<div class="glass"><div class="form-grid">' + d.list.map(x => '<label class="field' + (x.k === 'SKALA_NILAI' ? ' full' : '') + '"><span>' + esc(x.k.replace(/_/g, ' ')) + '</span>' +
        (ya(x.k) ? '<select class="inp" name="' + x.k + '"><option' + (x.v === 'YA' ? ' selected' : '') + '>YA</option><option' + (x.v !== 'YA' ? ' selected' : '') + '>TIDAK</option></select>'
          : x.k === 'SKALA_NILAI' ? '<textarea class="inp mono" name="' + x.k + '" rows="3">' + esc(x.v) + '</textarea>'
            : '<input class="inp" name="' + x.k + '" value="' + esc(x.v) + '"' + (/SEMESTER_(MULAI|SELESAI)/.test(x.k) ? ' type="date"' : '') + '>') + '<small>' + esc(x.ket) + '</small></label>').join('') + '</div>' +
        '<div class="row-flex mt20"><span class="muted" style="font-size:12.5px">Versi backend ' + esc(d.versi) + ' • skema v' + esc(d.skema) + '</span><span class="spacer"></span><button class="btn btn-lime" id="u-save">' + icon('check') + 'Simpan pengaturan</button></div></div>';
      $('#u-save', el).onclick = async (e) => { e.target.disabled = true; try { const r = await api('pengaturan.save', { values: g.UI.formData(el) }); toast(r.message, r.success ? 'ok' : 'err', 5000); if (r.success) { g.Core.swrHapus(); await g.App.segarkanBoot(); } } finally { e.target.disabled = false; } };
    }).catch(e => { el.innerHTML = g.UI.empty(e.message, 'alert', true); });
  }

  function tabKeamanan(el) {
    apiData('pengaturan.get', {}).then(d => {
      el.innerHTML = '<div class="grid g12"><div class="glass c6"><div class="sec-t">' + icon('key') + ' Login Google untuk staf</div><p class="sec-s">Client ID OAuth dari Google Cloud Console (jenis <b>Web application</b>, Authorized JavaScript origin = alamat GitHub Pages Anda). Disimpan di Script Properties.</p>' +
        '<label class="field"><span>Client ID</span><input class="inp mono" id="s-cid" value="' + esc(d.rahasia.GOOGLE_CLIENT_ID || '') + '" placeholder="1234-abc.apps.googleusercontent.com"></label><div class="row-flex mt12"><button class="btn btn-lime" id="s-cid-save">Simpan Client ID</button></div>' +
        '<div class="hint mt16">Origin yang harus didaftarkan: <span class="kbd">' + esc(location.origin) + '</span></div></div>' +
        '<div class="glass c6"><div class="sec-t">' + icon('shield') + ' Akses darurat</div><p class="sec-s">Dipakai bila login Google bermasalah. Halaman login darurat: <span class="kbd">' + esc(location.origin + location.pathname) + '#/darurat</span> (tidak ditautkan di mana pun).</p>' +
        '<div class="form-grid"><label class="field"><span>Nama pengguna</span><input class="inp" id="s-du" value="' + esc(d.rahasia.darurat.user || 'darurat') + '" autocomplete="off"></label><label class="field"><span>Kata sandi baru</span><input class="inp" type="password" id="s-dp" autocomplete="new-password" placeholder="≥ 12 karakter, huruf + angka"></label></div>' +
        '<div class="row-flex mt12"><button class="btn btn-dark" id="s-dsave">Ganti kredensial darurat</button></div></div>' +
        '<div class="glass c12"><div class="sec-t">' + icon('logout') + ' Sesi</div><p class="sec-s">Keluarkan satu akun dari semua perangkat, atau semua pengguna sekaligus (merotasi secret sesi).</p><div class="row-flex"><input class="inp" id="s-rev" placeholder="email akun staf" style="max-width:280px"><button class="btn btn-white" id="s-rev-go">Keluarkan akun ini</button><span class="spacer"></span><button class="btn btn-danger" id="s-all">Keluarkan semua pengguna</button></div>' +
        '<p class="muted mt16" style="font-size:12.5px">' + icon('lock', 'sm') + ' Token Fonnte, secret sesi, pepper PIN, dan hash sandi hanya tersimpan di Script Properties. Batasi editor proyek Apps Script hanya untuk orang tepercaya.</p></div></div>';
      $('#s-cid-save', el).onclick = async () => { const r = await api('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: $('#s-cid', el).value.trim() }); toast(r.message, r.success ? 'ok' : 'err', 5000); };
      $('#s-dsave', el).onclick = async () => { const r = await api('auth.rotasiDarurat', { username: $('#s-du', el).value.trim(), passwordBaru: $('#s-dp', el).value }); toast(r.message, r.success ? 'ok' : 'err', 6000); if (r.success) $('#s-dp', el).value = ''; };
      $('#s-rev-go', el).onclick = async () => { const em = $('#s-rev', el).value.trim(); if (!em) return; const r = await api('auth.keluarSemua', { email: em }); toast(r.message, r.success ? 'ok' : 'err'); };
      $('#s-all', el).onclick = async () => { if (!(await g.UI.konfirmasi('Semua pengguna (termasuk Anda) harus login ulang. Lanjutkan?', { bahaya: true, ya: 'Keluarkan semua' }))) return; const r = await api('auth.keluarSemua', {}); toast(r.message); g.App.logout('Semua sesi telah diakhiri.'); };
    }).catch(e => { el.innerHTML = g.UI.empty(e.message, 'alert', true); });
  }

  function tabData(el) {
    const SH = ['Muhaffidz', 'Halaqah', 'Santri', 'Wali', 'Target', 'Setoran', 'Presensi', 'HafalanAwal'];
    el.innerHTML = '<div class="grid g12"><div class="glass c7"><div class="sec-t">' + icon('db') + ' Impor dari spreadsheet lama</div><p class="sec-s">Pindahkan data dari spreadsheet mutaba\'ah lama atau versi MutqinSpace sebelumnya. Sumber <b>hanya dibaca</b>, kolom dikenali dari nama header, aman diulang (tidak dobel). Spreadsheet harus bisa dibuka akun pemilik skrip.</p>' +
      '<label class="field"><span>URL / ID spreadsheet lama</span><input class="inp" id="mg-src" placeholder="https://docs.google.com/spreadsheets/d/..."></label><div class="row-flex mt12">' + SH.map(s => '<label class="chip"><input type="checkbox" value="' + s + '"' + (s === 'Presensi' ? '' : ' checked') + ' style="margin:0"> ' + s + '</label>').join('') + '</div>' +
      '<label class="row-flex mt12" style="font-size:13px"><span class="switch"><input type="checkbox" id="mg-timpa"><i></i></span>Timpa data yang sudah ada (nama/halaqah/jadwal)</label>' +
      '<div class="row-flex mt16"><button class="btn btn-white" id="mg-scan">' + icon('search') + 'Pindai (dry-run)</button><button class="btn btn-lime" id="mg-run">' + icon('upload') + 'Jalankan impor</button></div><div id="mg-res" class="mt16"></div></div>' +
      '<div class="glass c5"><div class="sec-t">' + icon('layers') + ' Skema database</div><p class="sec-s">Menambah sheet/kolom yang belum ada setelah update aplikasi. Tidak pernah menghapus atau menggeser data.</p><div class="row-flex"><button class="btn btn-white" id="sk-cek">Periksa</button><button class="btn btn-dark" id="sk-run">Perbarui skema</button></div><div id="sk-res" class="mt12"></div>' +
      '<div class="sec-t mt20">' + icon('file') + ' Backup</div><p class="sec-s">Salinan spreadsheet ke folder Drive <b>Backup</b> (otomatis tiap Minggu).</p><button class="btn btn-white" id="bk-run">Backup sekarang</button>' +
      '<div class="sec-t mt20">' + icon('clock') + ' Arsip tahunan</div><p class="sec-s">Pindahkan setoran/presensi/log lama (&gt; 90 hari) ke spreadsheet arsip agar database tetap cepat. Peta hafalan & total tetap utuh.</p><div class="row-flex"><input class="inp" type="date" id="ar-tgl" style="max-width:180px"><button class="btn btn-white" id="ar-scan">Hitung</button><button class="btn btn-danger" id="ar-run">Arsipkan</button></div><div id="ar-res" class="mt12"></div></div></div>';
    const sheets = () => $$('.chip input:checked', el).map(x => x.value);
    const lapor = (d) => '<div class="hint"><b>' + esc(d.sumber.nama) + '</b> — ' + (d.dryRun ? 'pratinjau (tidak ada yang ditulis)' : 'selesai') + '</div><div class="tbl-wrap mt12"><table class="tbl"><thead><tr><th class="nosort">Data</th><th class="nosort num">Di sumber</th><th class="nosort num">Ditambah</th><th class="nosort num">Diperbarui</th><th class="nosort num">Dilewati</th></tr></thead><tbody>' +
      Object.keys(d.laporan).map(k => { const x = d.laporan[k]; return '<tr><td>' + esc(k) + (x.ada ? '' : ' <span class="badge b-mut">tidak ada</span>') + '</td><td class="num">' + x.sumber + '</td><td class="num">' + x.ditambah + '</td><td class="num">' + x.diperbarui + '</td><td class="num">' + x.dilewati + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      (d.peringatan.length ? '<ul class="mt12" style="font-size:12.5px">' + d.peringatan.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' : '');
    $('#mg-scan', el).onclick = async (e) => { e.target.disabled = true; try { const d = await apiData('migrasi.scan', { sumber: $('#mg-src', el).value, sheets: sheets(), timpa: $('#mg-timpa', el).checked }); $('#mg-res', el).innerHTML = lapor(d); } catch (er) { toast(er.message, 'err', 6000); } finally { e.target.disabled = false; } };
    $('#mg-run', el).onclick = async (e) => { if (!(await g.UI.konfirmasi('Jalankan impor sekarang? Data yang sudah ada tidak akan digandakan.', { ya: 'Jalankan' }))) return; e.target.disabled = true; try { const r = await api('migrasi.run', { sumber: $('#mg-src', el).value, sheets: sheets(), timpa: $('#mg-timpa', el).checked }); toast(r.message, r.success ? 'ok' : 'err', 7000); if (r.success) { $('#mg-res', el).innerHTML = lapor(r.data); g.Core.swrHapus(); g.App.segarkanBoot(); } } finally { e.target.disabled = false; } };
    const skema = async (dry, btn) => { btn.disabled = true; try { const r = await api('migrasi.skema', { dryRun: dry }); const d = r.data || {}; $('#sk-res', el).innerHTML = '<div class="hint">' + esc(r.message) + (d.sheetBaru && d.sheetBaru.length ? '<br>Sheet baru: ' + esc(d.sheetBaru.join(', ')) : '') + (d.kolomBaru && Object.keys(d.kolomBaru).length ? '<br>Kolom baru: ' + esc(Object.keys(d.kolomBaru).map(k => k + ' (' + d.kolomBaru[k].join(', ') + ')').join('; ')) : '') + '</div>'; } finally { btn.disabled = false; } };
    $('#sk-cek', el).onclick = (e) => skema(true, e.target);
    $('#sk-run', el).onclick = (e) => skema(false, e.target);
    $('#bk-run', el).onclick = async (e) => { e.target.disabled = true; try { const r = await api('sys.backup', {}); toast(r.message, r.success ? 'ok' : 'err', 6000); } finally { e.target.disabled = false; } };
    $('#ar-scan', el).onclick = async () => { try { const d = await apiData('arsip.scan', { sebelum: $('#ar-tgl', el).value }); $('#ar-res', el).innerHTML = '<div class="hint">Sebelum ' + fmt.tgl(d.sebelum) + ': ' + Object.keys(d.jumlah).map(k => k + ' <b>' + d.jumlah[k] + '</b>').join(' • ') + '</div>'; } catch (er) { toast(er.message, 'err'); } };
    $('#ar-run', el).onclick = async (e) => { if (!(await g.UI.konfirmasi('Arsipkan data sebelum ' + $('#ar-tgl', el).value + '? Data dipindah ke spreadsheet arsip di folder Backup.', { bahaya: true, ya: 'Arsipkan' }))) return; e.target.disabled = true; try { const r = await api('arsip.run', { sebelum: $('#ar-tgl', el).value }); toast(r.message, r.success ? 'ok' : 'err', 7000); if (r.success) $('#ar-res', el).innerHTML = '<div class="hint">Selesai dalam ' + r.data.detik + ' dtk • <a href="' + esc(r.data.url) + '" target="_blank" rel="noopener">buka arsip</a></div>'; } finally { e.target.disabled = false; } };
  }

  function tabSistem(el) {
    apiData('sys.status', {}).then(s => {
      const pctSel = Math.round(s.sel / s.batasSel * 1000) / 10;
      el.innerHTML = '<div class="grid g12"><div class="glass c6"><div class="sec-t">Kesehatan sistem</div><dl class="kv mt12"><dt>Versi backend</dt><dd>' + esc(s.versi) + '</dd><dt>Agregat hafalan</dt><dd>' + (s.agg ? '<span class="badge b-ok">HANGAT</span> ' + fmt.n(s.agg.baris, 0) + ' setoran • ' + s.agg.santri + ' santri • ' + fmt.rel(s.agg.at) : '<span class="badge b-warn">dingin</span>') + '</dd>' +
        '<dt>Warmup terakhir</dt><dd>' + (s.warm ? fmt.rel(s.warm.at) + ' (' + esc(s.warm.scope) + ')' : '–') + '</dd><dt>Antrean notifikasi</dt><dd>' + (s.antrean ? '<span class="badge b-warn">ada pesan menunggu</span>' : '<span class="badge b-ok">kosong</span>') + '</dd>' +
        '<dt>Kuota email</dt><dd>' + (s.kuotaEmail === null ? '–' : s.kuotaEmail + ' tersisa hari ini') + '</dd><dt>Backup terakhir</dt><dd>' + (s.backup ? fmt.rel(s.backup) : 'belum pernah') + '</dd>' +
        '<dt>Script Properties</dt><dd>' + s.props.jumlah + ' kunci • ' + fmt.n(s.props.byte / 1024) + ' KB / 500 KB</dd><dt>Sel spreadsheet</dt><dd>' + fmt.n(s.sel, 0) + ' (' + pctSel + '% dari batas 10 juta)</dd></dl>' +
        '<div class="row-flex mt16"><a class="btn btn-white btn-sm" target="_blank" rel="noopener" href="' + esc(s.spreadsheetUrl) + '">' + icon('ext', 'sm') + 'Buka spreadsheet</a><button class="btn btn-white btn-sm" id="sy-segar">' + icon('refresh', 'sm') + 'Kosongkan cache</button><button class="btn btn-white btn-sm" id="sy-perf">Lihat performa (console)</button></div></div>' +
        '<div class="glass c6"><div class="sec-t">Trigger otomatis</div><div class="mt12">' + s.trigger.map(t => '<div class="row-flex mt8"><span class="badge ' + (t.aktif ? 'b-ok' : 'b-bad') + '">' + (t.aktif ? 'aktif' : 'mati') + '</span><b class="mono">' + esc(t.fn) + '</b><span class="muted" style="font-size:12px">' + esc(t.ket) + '</span></div>').join('') + '</div>' +
        '<div class="row-flex mt16"><button class="btn btn-dark btn-sm" data-t="pasang">Pasang trigger</button><button class="btn btn-white btn-sm" data-t="keepWarmOff">Matikan keep-warm</button><button class="btn btn-white btn-sm" data-t="keepWarmOn">Nyalakan keep-warm</button></div>' +
        '<p class="muted mt12" style="font-size:12px">Kuota trigger akun Gmail biasa ±90 menit/hari. Trigger tiap menit hanya bekerja singkat bila tidak ada antrean.</p></div>' +
        '<div class="glass c12"><div class="sec-t">Jumlah baris per sheet</div><div class="card-list mt12" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">' + Object.keys(s.sheets).map(k => '<div class="ocard"><div class="s">' + esc(k) + '</div><div class="t">' + fmt.n(s.sheets[k], 0) + '</div></div>').join('') + '</div></div></div>';
      $('#sy-segar', el).onclick = async () => { const r = await api('sys.segarkan', {}); g.Core.swrHapus(); toast(r.message); };
      $('#sy-perf', el).onclick = () => { g.Perf.summary(); toast('Ringkasan performa ditampilkan di console (F12).'); };
      $$('[data-t]', el).forEach(b => b.onclick = async () => { const r = await api('sys.trigger', { aksi: b.dataset.t }); toast(r.message, r.success ? 'ok' : 'err'); tabSistem(el); });
    }).catch(e => { el.innerHTML = g.UI.empty(e.message, 'alert', true); });
  }

  function tabLog(el) {
    const f = { q: '', page: 0 };
    el.innerHTML = '<div class="filters"><label class="search" style="margin:0;min-width:280px"><input class="pill-in" id="lg-q" placeholder="Cari pengguna, aksi, data...">' + icon('search') + '</label></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="nosort">Waktu</th><th class="nosort">Pengguna</th><th class="nosort">Peran</th><th class="nosort">Aksi</th><th class="nosort">Data</th><th class="nosort">Detail</th></tr></thead><tbody id="lg-tb"></tbody></table></div><div class="pager" id="lg-pg"></div>';
    const muat = () => apiData('log.list', f).then(d => {
      $('#lg-tb', el).innerHTML = d.rows.length ? d.rows.map(r => '<tr><td style="white-space:nowrap">' + fmt.tgl(r.Waktu) + ' ' + fmt.jam(r.Waktu) + '</td><td>' + esc(r.Pengguna) + '</td><td>' + esc(r.Peran) + '</td><td class="mono">' + esc(r.Aksi) + '</td><td>' + esc(r.Entitas) + '</td><td style="max-width:420px;font-size:12px" class="muted">' + esc(r.Detail) + '</td></tr>').join('') : '<tr><td colspan="6">' + g.UI.empty('Belum ada log.', 'list', true) + '</td></tr>';
      const maxP = Math.max(0, Math.ceil(d.total / d.per) - 1);
      $('#lg-pg', el).innerHTML = '<span>' + d.total + ' entri (3.000 terakhir)</span><span class="pg"><button class="btn btn-white btn-sm" data-pg="-1"' + (f.page ? '' : ' disabled') + '>‹</button><span style="align-self:center">' + (f.page + 1) + '/' + (maxP + 1) + '</span><button class="btn btn-white btn-sm" data-pg="1"' + (f.page < maxP ? '' : ' disabled') + '>›</button></span>';
    }).catch(e => toast(e.message, 'err'));
    el.onclick = (e) => { const pg = e.target.closest('[data-pg]'); if (pg) { f.page += Number(pg.dataset.pg); muat(); } };
    let tq; $('#lg-q', el).oninput = (e) => { clearTimeout(tq); tq = setTimeout(() => { f.q = e.target.value.trim(); f.page = 0; muat(); }, 350); };
    muat();
  }
})(window);
