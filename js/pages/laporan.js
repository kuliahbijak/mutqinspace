/* MutqinSpace — Laporan grafis & tabel + ekspor Excel/PDF + rekap bulanan (FR-27..FR-30) */
(function (g) {
  'use strict';
  const { icon, esc, fmt, $, $$, toast, modal } = g.UI;
  const { swr, apiData } = g.Core;

  g.Pages.laporan = {
    peran: ['mudir', 'muhaffidz'],
    render(root, ctx) {
      const App = g.App, hari = fmt.today();
      const st = { tab: ctx.q.tab || 'grafik', jenis: 'setoran', dari: fmt.addDays(hari, -29), sampai: hari, halaqah: '', santri: '', muhaffidz: '', jenisSetoran: '', status: '', q: '', page: 0, per: 25, sort: null };
      const hq = (App.boot.halaqah || []);
      root.innerHTML = App.kepala('Laporan & Ekspor', { sub: 'Grafik capaian, tabel setoran/presensi/target dengan filter, dan unduhan Excel/PDF.', aksi: '<button class="btn btn-white" id="l-rekap">' + icon('file') + 'Rekap Bulanan</button>' }) +
        '<div class="tabs light" id="l-tabs"><button data-t="grafik">' + icon('chart', 'sm') + ' Grafik</button><button data-t="tabel">' + icon('list', 'sm') + ' Tabel</button></div><div id="l-body"></div>';
      $('#l-tabs', root).onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; st.tab = b.dataset.t; tampil(); };
      $('#l-rekap', root).onclick = () => rekap(App);

      function tampil() {
        $$('#l-tabs button', root).forEach(b => b.classList.toggle('on', b.dataset.t === st.tab));
        if (st.tab === 'grafik') grafik(); else tabel();
      }
      /* ---------- Grafik ---------- */
      function grafik() {
        const b = $('#l-body', root);
        b.innerHTML = '<div class="filters">' + (hq.length > 1 ? '<select class="pill-in" id="g-hq"><option value="">Semua Halaqah</option>' + hq.map(x => '<option value="' + esc(x.id) + '"' + (x.id === st.halaqah ? ' selected' : '') + '>' + esc(x.nama) + '</option>').join('') + '</select>' : '') +
          '<select class="pill-in" id="g-bln"><option value="6">6 bulan terakhir</option><option value="3">3 bulan</option><option value="12">12 bulan</option></select></div>' +
          '<div class="grid g12"><div class="glass c7"><div class="sec-t">Capaian Hafalan per Bulan</div><p class="sec-s">Halaman ziyadah (arsir) dan murojaah per bulan</p><div id="g1">' + g.UI.sk(200) + '</div></div>' +
          '<div class="glass c5"><div class="sec-t">Tren Nilai</div><p class="sec-s">Rata-rata tajwid & kelancaran</p><div id="g2">' + g.UI.sk(200) + '</div></div>' +
          '<div class="glass c7"><div class="sec-t">Perbandingan Antarhalaqah (bulan ini)</div><p class="sec-s">Rata-rata halaman per santri • nilai • kehadiran</p><div id="g3"></div></div>' +
          '<div class="glass c5"><div class="sec-t">Distribusi Kehadiran (bulan ini)</div><p class="sec-s">Jumlah sesi per status</p><div id="g4"></div><div class="sec-t mt20">Sebaran Total Hafalan</div><p class="sec-s">Jumlah santri per rentang juz</p><div id="g5"></div></div></div>';
        $('#g-bln', b).value = String(st.bulan || 6);
        const muat = () => swr('grafik:' + st.halaqah + ':' + (st.bulan || 6), 'laporan.grafik', { halaqah: st.halaqah, bulan: st.bulan || 6 }, { maxAge: 60000, render: (d) => {
          if (!d) return;
          const c = d.capaian;
          g.UI.barChart($('#g1', b), c.map(x => x.label), [{ name: 'Ziyadah (hal)', values: c.map(x => x.ziyadah), hatch: true, color: '#C9E632' }, { name: 'Murojaah (hal)', values: c.map(x => x.murojaah), color: '#2F78A8' }], { id: 'g1', unit: ' hal', label: 'Halaman ziyadah dan murojaah per bulan' });
          g.UI.lineChart($('#g2', b), c.map(x => x.label), [{ name: 'Tajwid', color: '#7A8F00', values: c.map(x => x.tajwid) }, { name: 'Kelancaran', color: '#2F78A8', values: c.map(x => x.kelancaran) }], { id: 'g2' });
          $('#g3', b).innerHTML = d.perHalaqah.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="nosort">Halaqah</th><th class="nosort num">Santri</th><th class="nosort">Hal/santri</th><th class="nosort num">Nilai</th><th class="nosort num">Hadir</th></tr></thead><tbody>' +
            (function () { const mx = Math.max.apply(null, d.perHalaqah.map(x => x.halPerSantri).concat([1])); return d.perHalaqah.map(x => '<tr><td><b>' + esc(x.nama) + '</b></td><td class="num">' + x.santri + '</td><td style="min-width:150px"><div class="row-flex" style="flex-wrap:nowrap"><div style="flex:1">' + g.UI.track(x.halPerSantri / mx * 100) + '</div><b>' + fmt.n(x.halPerSantri) + '</b></div></td><td class="num">' + fmt.n(x.nilai) + '</td><td class="num">' + fmt.pct(x.kehadiran) + '</td></tr>').join(''); })() + '</tbody></table></div>' : g.UI.empty('Belum ada halaqah.', 'users', true);
          const k = d.kehadiran, tot = k.Hadir + k.Izin + k.Sakit + k.Alpa;
          $('#g4', b).innerHTML = tot ? '<div style="display:flex;height:22px;border-radius:99px;overflow:hidden;gap:2px">' + [['Hadir', '#C9E632'], ['Izin', '#93C5FD'], ['Sakit', '#FCD34D'], ['Alpa', '#F87171']].map(x => k[x[0]] ? '<span title="' + x[0] + ': ' + k[x[0]] + '" style="flex:' + k[x[0]] + ';background:' + x[1] + '"></span>' : '').join('') + '</div><div class="legend mt12">' + [['Hadir', '#C9E632'], ['Izin', '#93C5FD'], ['Sakit', '#FCD34D'], ['Alpa', '#F87171']].map(x => '<span><i style="background:' + x[1] + '"></i>' + x[0] + ' <b>' + k[x[0]] + '</b> (' + fmt.n(k[x[0]] / tot * 100, 0) + '%)</span>').join('') + '</div>' : g.UI.empty('Belum ada presensi bulan ini.', 'checkc', true);
          g.UI.hbars($('#g5', b), d.sebaranHafalan.map(x => ({ label: x.label, value: x.n })), { unit: ' santri' });
        } });
        const ghq = $('#g-hq', b); if (ghq) ghq.onchange = (e) => { st.halaqah = e.target.value; muat(); };
        $('#g-bln', b).onchange = (e) => { st.bulan = Number(e.target.value); muat(); };
        muat();
      }
      /* ---------- Tabel ---------- */
      function tabel() {
        const b = $('#l-body', root);
        const staf = App.boot.staf || [];
        b.innerHTML = '<div class="filters"><div class="seg" id="t-jenis"><button data-j="setoran">Setoran</button><button data-j="presensi">Presensi</button><button data-j="target">Rekap Target</button></div>' +
          '<input class="pill-in" type="date" id="t-dari" max="' + hari + '"><input class="pill-in" type="date" id="t-sampai" max="' + hari + '">' +
          (hq.length > 1 ? '<select class="pill-in" id="t-hq"><option value="">Semua Halaqah</option>' + hq.map(x => '<option value="' + esc(x.id) + '">' + esc(x.nama) + '</option>').join('') + '</select>' : '') +
          '<select class="pill-in" id="t-santri"><option value="">Semua Santri</option>' + (App.boot.santri || []).slice().sort((a, b2) => a.nama.localeCompare(b2.nama)).map(s => '<option value="' + esc(s.id) + '">' + esc(s.nama) + '</option>').join('') + '</select>' +
          (App.mudir() ? '<select class="pill-in" id="t-mhf"><option value="">Semua Muhaffidz</option>' + staf.map(u => '<option value="' + esc(u.id) + '">' + esc(u.nama) + '</option>').join('') + '</select>' : '') +
          '<select class="pill-in" id="t-sub"></select><select class="pill-in" id="t-status"></select>' +
          '<label class="search"><input class="pill-in" id="t-q" placeholder="Cari...">' + icon('search') + '</label></div>' +
          '<div class="row-flex"><span id="t-ring" class="row-flex"></span><span class="spacer"></span><button class="btn btn-white" id="t-xls">' + icon('download') + 'Unduh Excel</button><button class="btn btn-dark" id="t-pdf">' + icon('file') + 'Unduh PDF</button></div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead id="t-th"></thead><tbody id="t-tb"><tr><td>' + g.UI.sk(200) + '</td></tr></tbody></table></div><div class="pager" id="t-pg"></div>';
        $('#t-dari', b).value = st.dari; $('#t-sampai', b).value = st.sampai;
        function opsiSub() {
          const sub = $('#t-sub', b), sts = $('#t-status', b);
          sub.hidden = st.jenis !== 'setoran'; sts.hidden = st.jenis === 'setoran' && false;
          sub.innerHTML = '<option value="">Ziyadah & Murojaah</option><option>Ziyadah</option><option>Murojaah</option>'; sub.value = st.jenisSetoran;
          const opt = st.jenis === 'setoran' ? ['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Maqbul', 'Rasib'] : st.jenis === 'presensi' ? ['Hadir', 'Izin', 'Sakit', 'Alpa'] : ['Tercapai', 'Sesuai jalur', 'Tertinggal', 'Tanpa target'];
          sts.innerHTML = '<option value="">Semua status</option>' + opt.map(o => '<option>' + o + '</option>').join(''); sts.value = st.status;
          $$('#t-jenis button', b).forEach(x => x.classList.toggle('on', x.dataset.j === st.jenis));
          $('#t-dari', b).disabled = $('#t-sampai', b).disabled = st.jenis === 'target';
        }
        const param = () => ({ jenis: st.jenis, dari: st.dari, sampai: st.sampai, halaqah: st.halaqah, santri: st.santri, muhaffidz: st.muhaffidz, jenisSetoran: st.jenisSetoran, predikat: st.jenis === 'setoran' ? st.status : '', status: st.jenis !== 'setoran' ? st.status : '', q: st.q, page: st.page, per: st.per, sort: st.sort });
        function render(d) {
          $('#t-th', b).innerHTML = '<tr>' + d.kolom.map(k => '<th data-k="' + k.k + '">' + esc(k.label) + (st.sort && st.sort.k === k.k ? (st.sort.arah === 'asc' ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr>';
          $('#t-tb', b).innerHTML = d.rows.length ? d.rows.map(r => '<tr>' + d.kolom.map(k => { const v = r[k.k]; const num = typeof v === 'number'; return '<td class="' + (num ? 'num' : '') + '">' + (k.k === 'santri' && r.santriId ? '<a href="#/santri/' + esc(r.santriId) + '">' + esc(v) + '</a>' : k.k === 'status' ? '<span class="badge ' + ({ Hadir: 'b-ok', Tercapai: 'b-ok', Izin: 'b-info', 'Sesuai jalur': 'b-info', Sakit: 'b-warn', Tertinggal: 'b-warn', Alpa: 'b-bad' }[v] || 'b-mut') + '">' + esc(v) + '</span>' : k.k === 'tanggal' || k.k === 'terakhir' ? (v && v !== '-' ? fmt.tgl(v) : '–') : esc(num ? fmt.n(v) : v)) + '</td>'; }).join('') + '</tr>').join('') : '<tr><td colspan="' + d.kolom.length + '">' + g.UI.empty('Tidak ada data pada filter ini.', 'list', true) + '</td></tr>';
          const maxP = Math.max(0, Math.ceil(d.total / st.per) - 1);
          $('#t-pg', b).innerHTML = '<span>' + fmt.n(d.total, 0) + ' baris' + (d.dari ? ' • ' + fmt.tgl(d.dari) + ' – ' + fmt.tgl(d.sampai) : '') + '</span><span class="pg"><select class="inp" id="t-per" style="height:34px;width:auto">' + [25, 50, 100].map(n => '<option' + (n === st.per ? ' selected' : '') + '>' + n + '</option>').join('') + '</select><button class="btn btn-white btn-sm" data-pg="-1"' + (st.page ? '' : ' disabled') + '>‹</button><span style="align-self:center">' + (st.page + 1) + '/' + (maxP + 1) + '</span><button class="btn btn-white btn-sm" data-pg="1"' + (st.page < maxP ? '' : ' disabled') + '>›</button></span>';
          $('#t-ring', b).innerHTML = Object.keys(d.ringkas || {}).map(k => '<span class="chip">' + esc(k) + ' <span class="n">' + fmt.n(d.ringkas[k]) + '</span></span>').join('');
          $('#t-per', b).onchange = (e) => { st.per = Number(e.target.value); st.page = 0; muat(); };
        }
        const muat = () => swr('tabel:' + JSON.stringify(param()), 'laporan.tabel', param(), { maxAge: 30000, render: (d) => d && render(d) });
        b.onclick = (e) => {
          const j = e.target.closest('[data-j]'); if (j) { st.jenis = j.dataset.j; st.status = ''; st.page = 0; st.sort = null; opsiSub(); muat(); return; }
          const th = e.target.closest('th[data-k]'); if (th) { const k = th.dataset.k; st.sort = st.sort && st.sort.k === k ? { k, arah: st.sort.arah === 'asc' ? 'desc' : 'asc' } : { k, arah: 'desc' }; muat(); return; }
          const pg = e.target.closest('[data-pg]'); if (pg) { st.page += Number(pg.dataset.pg); muat(); }
        };
        const ch = (id, k) => { const el = $(id, b); if (el) el.onchange = (e) => { st[k] = e.target.value; st.page = 0; muat(); }; };
        ch('#t-dari', 'dari'); ch('#t-sampai', 'sampai'); ch('#t-hq', 'halaqah'); ch('#t-santri', 'santri'); ch('#t-mhf', 'muhaffidz'); ch('#t-sub', 'jenisSetoran'); ch('#t-status', 'status');
        let tq; $('#t-q', b).oninput = (e) => { clearTimeout(tq); tq = setTimeout(() => { st.q = e.target.value.trim(); st.page = 0; muat(); }, 400); };
        $('#t-xls', b).onclick = async (e) => { e.target.disabled = true; try { const d = await apiData('laporan.tabel', Object.assign(param(), { semua: true })); await g.UI.eksporExcel('Laporan_' + st.jenis + '_' + hari, d.kolom, d.rows, st.jenis); toast(d.rows.length + ' baris diekspor.'); } catch (er) { toast(er.message, 'err'); } finally { e.target.disabled = false; } };
        $('#t-pdf', b).onclick = async (e) => { e.target.disabled = true; try { const d = await apiData('laporan.pdf', param()); g.UI.unduhBase64(d.nama, d.mime, d.base64); } catch (er) { toast(er.message, 'err'); } finally { e.target.disabled = false; } };
        opsiSub(); muat();
      }
      tampil();
    }
  };

  function rekap(App) {
    const ym = fmt.today().substring(0, 7);
    const bulan = [0, -1, -2, -3, -4, -5].map(n => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); });
    const hq = (App.boot.halaqah || []).filter(x => x.status !== 'Nonaktif');
    const body = '<div class="form-grid"><label class="field"><span>Bulan</span><select class="inp" name="bulan">' + bulan.map(b => '<option value="' + b + '">' + fmt.bulan(b) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Halaqah</span><select class="inp" name="hq">' + hq.map(x => '<option value="' + esc(x.id) + '">' + esc(x.nama) + '</option>').join('') + '</select></label></div>' +
      '<p class="muted" style="font-size:12.5px">Rekap per santri diunduh dari halaman profil santri. Rekap otomatis seluruh santri dibuat tiap tanggal 1 ke folder Drive <b>Rekap_Bulanan</b>.</p>' +
      (App.mudir() ? '<div class="hint mt12" id="rk-job">Memuat status rekap otomatis…</div>' : '');
    const m = modal({ title: 'Rekap bulanan (PDF)', body, actions: [].concat(App.mudir() ? [{ label: 'Buat rekap semua santri ke Drive', icon: 'db', fn: async (b) => { const f = g.UI.formData(b); const r = await g.Core.api('rekap.generate', { bulan: f.bulan }); toast(r.message, r.success ? 'ok' : 'err', 7000); return false; } }] : [])
      .concat([{ label: 'Unduh rekap halaqah', cls: 'btn-lime', icon: 'download', fn: async (b) => { const f = g.UI.formData(b); const d = await apiData('rekap.halaqah', { halaqahId: f.hq, bulan: f.bulan }); g.UI.unduhBase64(d.nama, d.mime, d.base64); return false; } }]) });
    if (App.mudir()) apiData('rekap.status', {}).then(d => { const el = $('#rk-job', m.body); if (!el) return; const j = d.job; el.innerHTML = j ? 'Rekap ' + fmt.bulan(j.bulan) + ': <b>' + (j.selesai ? 'selesai' : 'berjalan') + '</b> — ' + j.file + ' berkas' + (j.total ? ' dari ' + j.total : '') + (j.gagal ? ', ' + j.gagal + ' gagal' : '') + (d.folder ? ' • <a href="' + esc(d.folder) + '" target="_blank" rel="noopener">Buka folder Drive</a>' : '') : 'Belum ada rekap massal yang dibuat.'; }).catch(() => { });
  }
})(window);
