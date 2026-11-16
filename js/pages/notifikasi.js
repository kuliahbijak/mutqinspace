/* MutqinSpace — WhatsApp & Notifikasi (Blast per batch, Antrean, Konfigurasi) + CRM Kontak */
(function (g) {
  'use strict';
  const { icon, esc, avatar, fmt, $, $$, toast, modal } = g.UI;
  const { api, apiData, swr } = g.Core;
  const TABS = [['blast', 'Blast WhatsApp'], ['antrean', 'Antrean & Riwayat'], ['konfig', 'Konfigurasi'], ['crm', 'CRM Kontak']];
  const waBadge = (s) => s === 'Terdaftar' ? '<span class="badge b-ok">✓ WA</span>' : s === 'Tidak Terdaftar' ? '<span class="badge b-bad">✕ bukan WA</span>' : '<span class="badge b-mut">? belum dicek</span>';

  g.Pages.notifikasi = {
    peran: ['mudir'],
    render(root, ctx) {
      const tab = ctx.q.tab || 'blast';
      root.innerHTML = g.App.kepala('Notifikasi WA & CRM', { sub: 'Notifikasi otomatis ke wali (WhatsApp Fonnte + Email), blast per batch, dan database kontak.' }) +
        '<div class="tabs light" id="n-tabs">' + TABS.map(t => '<button data-t="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div><div id="n-body"></div>';
      $('#n-tabs', root).onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) location.hash = '#/notifikasi?tab=' + b.dataset.t; };
      const el = $('#n-body', root);
      ({ blast: tabBlast, antrean: tabAntrean, konfig: tabKonfig, crm: tabCrm }[tab] || tabBlast)(el, ctx);
    }
  };

  /* ---------------- Blast ---------------- */
  function tabBlast(el, ctx) {
    const pre = g.Core.LS.get('blast:pre', null); g.Core.LS.del('blast:pre');
    const st = { rows: [], hanyaWA: false, ukuran: 20, jeda: '3-8', aktif: null, auto: false, timer: null };
    const hq = g.App.boot.halaqah || [];
    el.innerHTML = '<div class="grid g12"><div class="glass c6"><div class="sec-t">1. Pilih sasaran</div><div class="form-grid mt12"><label class="field"><span>Sumber</span><select class="inp" id="b-src"><option value="crm">CRM Kontak</option><option value="manual">Tempel manual</option></select></label>' +
      '<label class="field" data-crm><span>Segmen</span><select class="inp" id="b-seg"><option value="">Semua</option><option>Wali Santri</option><option>Muhaffidz</option><option>Kontak Luar</option></select></label>' +
      '<label class="field" data-crm><span>Halaqah (wali)</span><select class="inp" id="b-hq"><option value="">Semua</option>' + hq.map(x => '<option value="' + esc(x.id) + '">' + esc(x.nama) + '</option>').join('') + '</select></label>' +
      '<label class="field" data-crm><span>Status WA</span><select class="inp" id="b-swa"><option value="">Semua</option><option>Terdaftar</option><option>Tidak Terdaftar</option><option>Belum dicek</option></select></label>' +
      '<label class="field full" data-man hidden><span>Satu nomor per baris: <span class="kbd">0812…|Nama</span></span><textarea class="inp" id="b-man" rows="5"></textarea></label></div>' +
      '<div class="row-flex mt12"><button class="btn btn-dark" id="b-load">' + icon('users') + 'Muat Penerima</button><button class="btn btn-white" id="b-det">' + icon('phone') + 'Deteksi Nomor WA</button></div><div id="b-ring" class="row-flex mt12"></div>' +
      '<label class="row-flex mt12" style="font-size:13px"><span class="switch"><input type="checkbox" id="b-only"><i></i></span>Kirim hanya ke nomor terdeteksi WhatsApp</label><div class="tbl-wrap mt12" style="max-height:320px"><table class="tbl"><thead><tr><th class="nosort"><input type="checkbox" id="b-all" checked></th><th class="nosort">Nama</th><th class="nosort">Nomor</th><th class="nosort">WA</th></tr></thead><tbody id="b-tb"><tr><td colspan="4">' + g.UI.empty('Muat penerima terlebih dahulu.', 'users', true) + '</td></tr></tbody></table></div></div>' +
      '<div class="glass c6"><div class="sec-t">2. Tulis pesan</div><label class="field mt12"><span>Judul internal</span><input class="inp" id="b-judul" placeholder="Mis. Info libur semester"></label><div class="row-flex mt12">' + ['{nama}', '{anak}', '{halaqah}', '{institusi}', '{link}'].map(v => '<button class="chip" data-v="' + v + '">' + v + '</button>').join('') + '</div>' +
      '<label class="field mt12"><span>Isi pesan</span><textarea class="inp" id="b-pesan" rows="6" placeholder="Assalamu\'alaikum {nama}, ...">' + (pre ? '' : 'Assalamu\'alaikum {nama},\n\n') + '</textarea></label><div class="mt12"><span class="muted" style="font-size:12px">Pratinjau (penerima pertama):</span><div class="wa-bubble mt8" id="b-prev"></div></div>' +
      '<div class="sec-t mt20">3. Ukuran batch & jeda</div><div class="row-flex mt12"><div class="seg" id="b-uk"><button data-u="10">10</button><button data-u="20" class="on">20</button><button data-u="50">50</button></div><label class="field" style="width:130px"><span>Jeda (detik)</span><input class="inp" id="b-jeda" value="3-8"></label></div><p class="muted" id="b-est" style="font-size:12.5px"></p>' +
      '<button class="btn btn-lime btn-block mt12" id="b-go">' + icon('send') + 'Mulai Blast</button><p class="muted mt8" style="font-size:12px">Tips anti-banned: mulai batch 10, jeda acak ≥ 5 detik, hindari tautan sama ke ratusan nomor dalam 1 jam.</p></div></div>' +
      '<div id="b-prog"></div><div class="glass"><div class="row-flex mb12"><div class="sec-t">Riwayat blast</div><span class="spacer"></span><button class="btn btn-white btn-sm" id="b-ref">' + icon('refresh', 'sm') + 'Segarkan</button></div><div id="b-hist">' + g.UI.sk(80) + '</div></div>';
    const src = $('#b-src', el);
    const valid = () => st.rows.filter(r => r.pilih && r.valid && !r.ganda && !r.optOut && (!st.hanyaWA || r.statusWA === 'Terdaftar'));
    function prev() {
      const r = valid()[0] || { nama: 'Bapak/Ibu', vars: {} }, v = Object.assign({ institusi: g.App.setting('NAMA_LEMBAGA'), link: location.origin + location.pathname, nama: r.nama }, r.vars || {});
      $('#b-prev', el).innerHTML = esc($('#b-pesan', el).value.replace(/\{(\w+)\}/g, (m, k) => v[k] == null ? '' : v[k])).replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
      const n = valid().length, rj = st.jeda.split('-').map(Number), avg = rj.length > 1 ? (rj[0] + rj[1]) / 2 : rj[0] || 5;
      $('#b-est', el).textContent = n + ' penerima → ' + Math.ceil(n / st.ukuran) + ' batch • ±' + Math.max(1, Math.round(n * avg / 60)) + ' menit (1 batch per menit oleh server)';
      $('#b-go', el).innerHTML = icon('send') + 'Mulai Blast (' + n + ' nomor)';
    }
    function renderRows(R) {
      $('#b-ring', el).innerHTML = R ? ['total', 'valid', 'tidakValid', 'ganda', 'terdaftarWA', 'optOut'].map(k => '<span class="chip">' + { total: 'Total', valid: 'Valid', tidakValid: 'Tidak valid', ganda: 'Ganda', terdaftarWA: 'Terdaftar WA', optOut: 'Opt-out' }[k] + ' <span class="n">' + R[k] + '</span></span>').join('') : '';
      $('#b-tb', el).innerHTML = st.rows.length ? st.rows.slice(0, 1000).map((r, i) => '<tr style="' + (!r.valid || r.ganda || r.optOut ? 'opacity:.45' : '') + '"><td><input type="checkbox" data-i="' + i + '"' + (r.pilih ? ' checked' : '') + (!r.valid || r.ganda || r.optOut ? ' disabled' : '') + '></td><td>' + esc(r.nama) + (r.optOut ? ' <span class="badge b-mut">opt-out</span>' : '') + '</td><td class="mono">' + esc(r.hp) + '</td><td>' + (r.valid ? waBadge(r.statusWA) : '<span class="badge b-bad">tidak valid</span>') + '</td></tr>').join('') : '<tr><td colspan="4">' + g.UI.empty('Tidak ada penerima.', 'users', true) + '</td></tr>';
      prev();
    }
    async function muatPenerima() {
      const d = await apiData('wa.audience', { sumber: src.value, segmen: $('#b-seg', el).value, halaqah: $('#b-hq', el).value, statusWA: $('#b-swa', el).value, teks: $('#b-man', el).value, ids: pre && pre.ids });
      st.rows = d.rows.map(r => Object.assign(r, { pilih: true })); renderRows(d.ringkas);
    }
    src.onchange = () => { $$('[data-crm]', el).forEach(x => x.hidden = src.value !== 'crm'); $$('[data-man]', el).forEach(x => x.hidden = src.value !== 'manual'); };
    $('#b-load', el).onclick = () => muatPenerima().catch(e => toast(e.message, 'err'));
    $('#b-det', el).onclick = async (e) => {
      const nomor = st.rows.filter(r => r.valid && !r.statusWA).map(r => r.hp); if (!nomor.length) return toast('Tidak ada nomor yang perlu dicek.', 'warn');
      e.target.disabled = true;
      try { for (let i = 0; i < nomor.length; i += 50) { e.target.textContent = 'Mengecek ' + Math.min(i + 50, nomor.length) + '/' + nomor.length; const d = await apiData('wa.validate', { nomor: nomor.slice(i, i + 50) }); st.rows.forEach(r => { if (d.peta[r.hp]) r.statusWA = d.peta[r.hp]; }); } renderRows(); toast('Deteksi selesai.'); }
      catch (er) { toast(er.message, 'err', 6000); } finally { e.target.disabled = false; e.target.innerHTML = icon('phone') + 'Deteksi Nomor WA'; }
    };
    $('#b-tb', el).onchange = (e) => { const c = e.target.closest('[data-i]'); if (c) { st.rows[Number(c.dataset.i)].pilih = c.checked; prev(); } };
    $('#b-all', el).onchange = (e) => { st.rows.forEach(r => r.pilih = e.target.checked); renderRows(); };
    $('#b-only', el).onchange = (e) => { st.hanyaWA = e.target.checked; prev(); };
    $('#b-pesan', el).oninput = prev;
    el.querySelectorAll('[data-v]').forEach(c => c.onclick = () => { const t = $('#b-pesan', el); const p = t.selectionStart || t.value.length; t.value = t.value.slice(0, p) + c.dataset.v + t.value.slice(p); t.focus(); prev(); });
    $('#b-uk', el).onclick = (e) => { const b = e.target.closest('[data-u]'); if (!b) return; st.ukuran = Number(b.dataset.u); $$('#b-uk button', el).forEach(x => x.classList.toggle('on', x === b)); prev(); };
    $('#b-jeda', el).oninput = (e) => { st.jeda = e.target.value.trim(); prev(); };
    $('#b-go', el).onclick = async (e) => {
      const pen = valid(); if (!pen.length) return toast('Belum ada penerima valid.', 'err');
      if (!(await g.UI.konfirmasi('Kirim blast ke ' + pen.length + ' nomor dalam ' + Math.ceil(pen.length / st.ukuran) + ' batch?', { ya: 'Mulai blast' }))) return;
      e.target.disabled = true;
      try { const r = await api('wa.blastCreate', { judul: $('#b-judul', el).value, pesan: $('#b-pesan', el).value, ukuranBatch: st.ukuran, jeda: st.jeda, sasaran: src.value === 'crm' ? ($('#b-seg', el).value || 'Semua kontak') : 'Manual', penerima: pen.map(p => ({ id: p.id, nama: p.nama, hp: p.hp, vars: p.vars })) }); toast(r.message, r.success ? 'ok' : 'err', 6000); if (r.success) { st.aktif = r.data.blastId; riwayat(); } }
      finally { e.target.disabled = false; }
    };
    function progres(b) {
      const box = $('#b-prog', el); if (!b || b.Status !== 'Berjalan') { box.innerHTML = ''; clearTimeout(st.timer); return; }
      box.innerHTML = '<div class="glass"><div class="row-flex"><div><div class="sec-t">Blast berjalan: ' + esc(b.Judul) + '</div><div class="muted" style="font-size:13px">Terkirim ' + b.Terkirim + ' • gagal ' + b.Gagal + ' • sisa ' + b.sisa + ' • batch ' + b.Ukuran_Batch + ' • jeda ' + esc(b.Jeda_Detik) + ' dtk</div></div><span class="spacer"></span>' +
        '<label class="row-flex" style="font-size:13px"><span class="switch"><input type="checkbox" id="bp-auto"' + (st.auto ? ' checked' : '') + '><i></i></span>Otomatis</label><button class="btn btn-lime btn-sm" id="bp-next">' + icon('send', 'sm') + 'Kirim batch berikutnya</button><button class="btn btn-danger btn-sm" id="bp-stop">Hentikan</button></div><div class="mt12">' + g.UI.track(b.persen) + '</div><p class="muted" style="font-size:12px;margin-bottom:0">Server tetap mengirim 1 batch per menit walau halaman ini ditutup.</p></div>';
      const next = async () => { try { const d = await apiData('wa.blastProcess', { blastId: b.ID_Blast }); progres(d.blast && Object.assign(d.blast, { persen: d.blast.Total ? Math.round((d.blast.Terkirim + d.blast.Gagal) / d.blast.Total * 100) : 0, sisa: d.blast.Total - d.blast.Terkirim - d.blast.Gagal })); riwayat(); } catch (er) { toast(er.message, 'err'); } };
      $('#bp-next', box).onclick = next;
      $('#bp-stop', box).onclick = async () => { if (!(await g.UI.konfirmasi('Hentikan blast? Pesan yang belum terkirim dibatalkan.', { bahaya: true, ya: 'Hentikan' }))) return; await apiData('wa.blastStop', { blastId: b.ID_Blast }); toast('Blast dihentikan.'); riwayat(); };
      $('#bp-auto', box).onchange = (e) => { st.auto = e.target.checked; tick(); };
      const tick = () => { clearTimeout(st.timer); if (!st.auto) return; const rj = String(b.Jeda_Detik).split('-').map(Number); const tunggu = Math.max(30, b.Ukuran_Batch * ((rj[0] + (rj[1] || rj[0])) / 2)); st.timer = setTimeout(next, tunggu * 1000); };
      tick();
    }
    function riwayat() {
      apiData('wa.blastList', {}).then(L => {
        $('#b-hist', el).innerHTML = L.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="nosort">Tanggal</th><th class="nosort">Judul</th><th class="nosort">Sasaran</th><th class="nosort">Batch</th><th class="nosort">Progres</th><th class="nosort">Status</th></tr></thead><tbody>' + L.map(b => '<tr><td>' + fmt.tgl(b.Tanggal) + ' ' + fmt.jam(b.Tanggal) + '</td><td><b>' + esc(b.Judul) + '</b></td><td>' + esc(b.Sasaran) + '</td><td>' + b.Ukuran_Batch + ' • ' + esc(b.Jeda_Detik) + 's</td><td style="min-width:160px">' + g.UI.track(b.persen) + '<small class="muted">' + b.Terkirim + '/' + b.Total + (b.Gagal ? ' • gagal ' + b.Gagal : '') + '</small></td><td><span class="badge ' + ({ Berjalan: 'b-lime', Selesai: 'b-ok', Dihentikan: 'b-mut' }[b.Status] || 'b-mut') + '">' + esc(b.Status) + '</span></td></tr>').join('') + '</tbody></table></div>' : g.UI.empty('Belum ada blast.', 'send', true);
        progres(L.find(b => b.Status === 'Berjalan'));
      }).catch(e => toast(e.message, 'err'));
    }
    $('#b-ref', el).onclick = riwayat;
    riwayat(); prev();
    if (pre) { muatPenerima().catch(() => { }); }
  }

  /* ---------------- Antrean ---------------- */
  function tabAntrean(el) {
    const f = { status: '', kanal: '' };
    el.innerHTML = '<div id="q-kpi" class="card-list" style="grid-template-columns:repeat(4,minmax(0,1fr))"></div><div class="filters mt16"><select class="pill-in" id="q-st"><option value="">Semua status</option><option>Antre</option><option>Terkirim</option><option>Gagal</option><option>Batal</option></select><select class="pill-in" id="q-k"><option value="">Semua kanal</option><option value="WA">WhatsApp</option><option value="EMAIL">Email</option></select><span class="spacer"></span><button class="btn btn-white" id="q-proc">' + icon('send') + 'Proses sekarang</button><button class="btn btn-white" id="q-retry">' + icon('refresh') + 'Ulangi yang gagal</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="nosort">Waktu</th><th class="nosort">Kanal</th><th class="nosort">Tujuan</th><th class="nosort">Event</th><th class="nosort">Pesan</th><th class="nosort">Status</th></tr></thead><tbody id="q-tb"><tr><td colspan="6">' + g.UI.sk(120) + '</td></tr></tbody></table></div>';
    const muat = () => apiData('notif.queue', f).then(d => {
      const R = d.ringkas;
      $('#q-kpi', el).innerHTML = [['Menunggu', R.Antre, 'b-warn'], ['Terkirim', R.Terkirim, 'b-ok'], ['Gagal', R.Gagal, 'b-bad'], ['Dibatalkan', R.Batal, 'b-mut']].map(x => '<div class="ocard"><div class="s">' + x[0] + '</div><div class="t" style="font-size:28px">' + fmt.n(x[1] || 0, 0) + '</div></div>').join('');
      $('#q-tb', el).innerHTML = d.rows.length ? d.rows.map(r => '<tr><td>' + fmt.tgl(r.waktu) + ' ' + fmt.jam(r.waktu) + '</td><td><span class="badge ' + (r.kanal === 'WA' ? 'b-ok' : 'b-info') + '">' + r.kanal + '</span></td><td><b>' + esc(r.nama) + '</b><div class="mono muted">' + esc(r.tujuan) + '</div></td><td>' + esc(r.event) + '</td><td style="max-width:340px">' + esc(r.pesan) + '</td><td><span class="badge ' + ({ Antre: 'b-warn', Terkirim: 'b-ok', Gagal: 'b-bad', Batal: 'b-mut' }[r.status]) + '">' + esc(r.status) + '</span>' + (r.error ? '<div class="muted" style="font-size:11px">' + esc(r.error) + '</div>' : '') + '</td></tr>').join('') : '<tr><td colspan="6">' + g.UI.empty('Antrean kosong.', 'mail', true) + '</td></tr>';
      if (d.senyap) toast('Sedang jam senyap — notifikasi otomatis ditahan sampai jam senyap berakhir.', 'warn', 5000);
    }).catch(e => toast(e.message, 'err'));
    $('#q-st', el).onchange = (e) => { f.status = e.target.value; muat(); };
    $('#q-k', el).onchange = (e) => { f.kanal = e.target.value; muat(); };
    $('#q-proc', el).onclick = async () => { const r = await api('notif.processNow', {}); toast(r.message, r.success ? 'ok' : 'err'); muat(); };
    $('#q-retry', el).onclick = async () => { const r = await api('notif.retry', {}); toast(r.message, r.success ? 'ok' : 'err'); muat(); };
    muat();
  }

  /* ---------------- Konfigurasi ---------------- */
  function tabKonfig(el) {
    el.innerHTML = g.UI.sk(300);
    apiData('notif.config', {}).then(c => {
      el.innerHTML = '<div class="grid g12"><div class="glass c6"><div class="row-flex"><div class="sec-t">WhatsApp (Fonnte)</div><span class="spacer"></span><label class="row-flex" style="font-weight:800"><span class="switch"><input type="checkbox" id="k-wa"' + (c.waAktif ? ' checked' : '') + '><i></i></span><span id="k-wa-l">' + (c.waAktif ? 'AKTIF' : 'NONAKTIF') + '</span></label></div>' +
        '<div class="form-grid mt16"><label class="field full"><span>Token Fonnte <small>(disimpan di Script Properties, tidak pernah ditampilkan utuh)</small></span><input class="inp" type="password" id="k-token" autocomplete="off" placeholder="' + esc(c.tokenAda ? c.token : 'Tempel token dari fonnte.com → Device') + '"></label>' +
        '<label class="field"><span>Batch blast default</span><select class="inp" id="k-batch">' + [10, 20, 50].map(n => '<option' + (n === c.batchDefault ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label><label class="field"><span>Jeda antarpesan (detik)</span><input class="inp" id="k-jeda" value="' + esc(c.jeda) + '"></label>' +
        '<label class="full row-flex" style="font-size:13px"><span class="switch"><input type="checkbox" id="k-det"' + (c.deteksiOtomatis ? ' checked' : '') + '><i></i></span>Deteksi otomatis nomor kontak baru terdaftar WA</label></div>' +
        '<div class="row-flex mt16"><button class="btn btn-white btn-sm" id="k-dev">' + icon('phone', 'sm') + 'Cek perangkat</button><input class="inp" id="k-tno" placeholder="08… untuk tes" style="width:160px;height:34px"><button class="btn btn-white btn-sm" id="k-twa">Kirim tes WA</button>' + (c.tokenAda ? '<button class="btn btn-ghost btn-sm" id="k-del">Hapus token</button>' : '') + '</div><div id="k-devinfo" class="mt12"></div></div>' +
        '<div class="glass c6"><div class="row-flex"><div class="sec-t">Email</div><span class="spacer"></span><label class="row-flex" style="font-weight:800"><span class="switch"><input type="checkbox" id="k-em"' + (c.emailAktif ? ' checked' : '') + '><i></i></span><span id="k-em-l">' + (c.emailAktif ? 'AKTIF' : 'NONAKTIF') + '</span></label></div>' +
        '<p class="muted" style="font-size:12.5px">Sisa kuota email hari ini: <b>' + (c.kuotaEmail === null ? '–' : c.kuotaEmail) + '</b> (akun Gmail biasa ±100/hari, Workspace ±1.500/hari).</p>' +
        '<div class="form-grid"><label class="field"><span>Nama pengirim</span><input class="inp" id="k-nama" value="' + esc(c.namaPengirim) + '"></label><label class="field"><span>Jam senyap</span><input class="inp" id="k-senyap" value="' + esc(c.jamSenyap || '') + '" placeholder="21:00-05:00"></label>' +
        '<label class="field full"><span>URL aplikasi untuk {link}</span><input class="inp" id="k-url" value="' + esc(c.appUrl) + '"></label></div><div class="row-flex mt12"><input class="inp" id="k-tem" placeholder="email@contoh.com" style="width:220px;height:34px"><button class="btn btn-white btn-sm" id="k-tes">Kirim tes email</button></div>' +
        '<p class="muted mt12" style="font-size:12.5px">Trigger antrean: ' + (c.trigger && c.trigger.aktif ? '<span class="badge b-ok">aktif tiap 1 menit</span>' : '<span class="badge b-bad">belum aktif — Pengaturan → Sistem → Pasang trigger</span>') + '</p></div></div>' +
        '<div class="glass"><div class="sec-t">Matriks Notifikasi Otomatis</div><p class="sec-s">Pilih kejadian mana yang dikirim lewat WhatsApp dan/atau Email. Kolom nonaktif bila saklar utama kanal mati.</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="nosort">Kejadian</th><th class="nosort">WhatsApp</th><th class="nosort">Email</th><th class="nosort"></th></tr></thead><tbody id="k-mx"></tbody></table></div>' +
        '<div class="row-flex mt16"><span class="spacer"></span><button class="btn btn-lime" id="k-save">' + icon('check') + 'Simpan Konfigurasi</button></div></div>';
      const mx = c.matriks.map(m => Object.assign({}, m));
      const renderMx = () => {
        const wa = $('#k-wa', el).checked, em = $('#k-em', el).checked;
        $('#k-mx', el).innerHTML = mx.map((m, i) => '<tr><td><b>' + esc(m.label) + '</b><div class="mono muted">' + esc(m.kode) + '</div></td><td><span class="switch"><input type="checkbox" data-mx="' + i + '" data-k="wa"' + (m.wa ? ' checked' : '') + (wa ? '' : ' disabled') + '><i></i></span></td><td><span class="switch"><input type="checkbox" data-mx="' + i + '" data-k="email"' + (m.email ? ' checked' : '') + (em ? '' : ' disabled') + '><i></i></span></td><td><button class="btn btn-white btn-sm" data-ed="' + i + '">' + icon('edit', 'sm') + 'Ubah pesan</button></td></tr>').join('');
      };
      renderMx();
      el.onchange = (e) => {
        const t = e.target;
        if (t.dataset.mx !== undefined) mx[Number(t.dataset.mx)][t.dataset.k] = t.checked;
        if (t.id === 'k-wa' || t.id === 'k-em') { $('#' + t.id + '-l', el).textContent = t.checked ? 'AKTIF' : 'NONAKTIF'; renderMx(); }
      };
      el.onclick = async (e) => {
        const ed = e.target.closest('[data-ed]');
        if (ed) {
          const m = mx[Number(ed.dataset.ed)];
          modal({ title: 'Pesan: ' + m.label, body: '<p class="muted" style="font-size:12.5px">Variabel: ' + esc(m.vars + ', institusi, link') + '. Teks *tebal* = cetak tebal di WhatsApp.</p><label class="field"><span>Subjek email</span><input class="inp" name="subjek" value="' + esc(m.subjek) + '"></label><label class="field mt12"><span>Isi pesan</span><textarea class="inp" name="pesan" rows="9">' + esc(m.pesan) + '</textarea></label>',
            actions: [{ label: '↺ Kembalikan bawaan', fn: (b) => { $('[name=subjek]', b).value = m.subjekDefault; $('[name=pesan]', b).value = m.pesanDefault; return false; } }, { label: 'Batal' }, { label: 'Terapkan', cls: 'btn-lime', fn: (b) => { const f = g.UI.formData(b); m.subjek = f.subjek; m.pesan = f.pesan; toast('Diterapkan — klik Simpan Konfigurasi.'); } }] });
          return;
        }
        const id = e.target.closest('button') && e.target.closest('button').id; if (!id) return;
        if (id === 'k-dev') { try { const d = await apiData('wa.device', {}); $('#k-devinfo', el).innerHTML = '<div class="hint">Perangkat <b>' + esc(d.device) + '</b> • status <b>' + esc(d.status) + '</b> • paket ' + esc(d.paket) + ' • kuota ' + esc(d.kuota) + ' • aktif s/d ' + esc(d.kedaluwarsa) + '</div>'; } catch (er) { toast(er.message, 'err', 6000); } }
        if (id === 'k-twa') { const r = await api('wa.test', { nomor: $('#k-tno', el).value }); toast(r.message, r.success ? 'ok' : 'err', 6000); }
        if (id === 'k-tes') { const r = await api('email.test', { email: $('#k-tem', el).value }); toast(r.message, r.success ? 'ok' : 'err', 6000); }
        if (id === 'k-del') { if (!(await g.UI.konfirmasi('Hapus token Fonnte? WhatsApp akan nonaktif.', { bahaya: true, ya: 'Hapus' }))) return; const r = await api('notif.configSave', { token: '__HAPUS__', waAktif: false }); toast(r.message); tabKonfig(el); }
        if (id === 'k-save') {
          e.target.disabled = true;
          try {
            const r = await api('notif.configSave', { token: $('#k-token', el).value.trim(), waAktif: $('#k-wa', el).checked, emailAktif: $('#k-em', el).checked, batchDefault: Number($('#k-batch', el).value), jeda: $('#k-jeda', el).value.trim(), deteksiOtomatis: $('#k-det', el).checked, namaPengirim: $('#k-nama', el).value, appUrl: $('#k-url', el).value.trim(), jamSenyap: $('#k-senyap', el).value.trim(), matriks: mx });
            toast(r.message, r.success ? 'ok' : 'err', 5000); if (r.success) tabKonfig(el);
          } finally { e.target.disabled = false; }
        }
      };
    }).catch(e => { el.innerHTML = g.UI.empty(e.message, 'alert', true); });
  }

  /* ---------------- CRM Kontak ---------------- */
  function tabCrm(el) {
    const f = { cari: '', segmen: '', statusWA: '', optOut: '', duplikat: '', tag: '', halaman: 0 };
    const pilih = new Set();
    el.innerHTML = '<div class="card-list" id="c-kpi" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">' + g.UI.sk(80) + '</div>' +
      '<div class="filters mt16"><label class="search" style="margin:0;min-width:240px"><input class="pill-in" id="c-q" placeholder="Cari nama / email / nomor">' + icon('search') + '</label><select class="pill-in" id="c-seg"><option value="">Semua segmen</option><option>Wali Santri</option><option>Muhaffidz</option><option>Kontak Luar</option></select>' +
      '<select class="pill-in" id="c-wa"><option value="">Status WA</option><option>Terdaftar</option><option>Tidak Terdaftar</option><option>Belum dicek</option></select><span class="spacer"></span><button class="btn btn-white" id="c-sync">' + icon('refresh') + 'Sinkron sekarang</button><label class="btn btn-white" style="cursor:pointer">' + icon('upload') + 'Impor CSV<input type="file" id="c-imp" accept=".csv,.xlsx" hidden></label><button class="btn btn-white" id="c-xls">' + icon('download') + 'Ekspor</button></div>' +
      '<div class="row-flex" id="c-bulk"></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="nosort"><input type="checkbox" id="c-all"></th><th class="nosort">Kontak</th><th class="nosort">Email</th><th class="nosort">WhatsApp</th><th class="nosort">Tag</th><th class="nosort">Terakhir dihubungi</th><th class="nosort num">Pesan</th></tr></thead><tbody id="c-tb"></tbody></table></div><div class="pager" id="c-pg"></div>';
    let data = null;
    const statKpi = () => apiData('crm.stats', {}).then(s => {
      $('#c-kpi', el).innerHTML = [['Total kontak', s.total, ''], ['WA terverifikasi', s.terdaftarWA, 'Terdaftar'], ['Email valid', s.emailValid, ''], ['Belum dicek WA', s.belumCek, 'Belum dicek'], ['Opt-out', s.optOut, 'optout'], ['Duplikat', s.duplikat, 'dup']].map(x => '<button class="ocard" data-kpi="' + x[2] + '" style="text-align:left"><div class="s">' + x[0] + '</div><div class="t" style="font-size:26px">' + fmt.n(x[1], 0) + '</div></button>').join('');
    }).catch(() => { });
    function render() {
      const d = data; if (!d) return;
      $('#c-tb', el).innerHTML = d.rows.length ? d.rows.map(k => '<tr style="' + (k.masalah || k.duplikat ? 'background:rgba(254,243,199,.5)' : '') + '"><td><input type="checkbox" data-c="' + esc(k.id) + '"' + (pilih.has(k.id) ? ' checked' : '') + '></td><td class="tclick" data-d="' + esc(k.id) + '"><div class="row-flex" style="flex-wrap:nowrap">' + avatar(k.nama, '', 'sm') + '<div><b>' + esc(k.nama) + '</b><div class="muted" style="font-size:11.5px">' + esc(k.segmen) + (k.info.Anak ? ' • ' + esc(k.info.Anak) : '') + (k.optOut ? ' • <span class="badge b-mut">opt-out</span>' : '') + (k.duplikat ? ' • <span class="badge b-warn">duplikat</span>' : '') + '</div></div></div></td>' +
        '<td>' + (k.email ? esc(k.email) + (k.emailValid === 'YA' ? ' ✓' : ' ⚠') : '–') + '</td><td class="mono">' + (k.wa ? '<a href="https://wa.me/62' + esc(String(k.wa).replace(/^0/, '')) + '" target="_blank" rel="noopener">' + esc(k.wa) + '</a> ' + waBadge(k.statusWA) : '–') + '</td><td>' + esc(k.tag || '') + '</td><td>' + (k.terakhir ? fmt.rel(k.terakhir) : '–') + '</td><td class="num">' + k.jumlahPesan + '</td></tr>').join('') : '<tr><td colspan="7">' + g.UI.empty('Tidak ada kontak. Klik "Sinkron sekarang" untuk menarik data wali & muhaffidz.', 'users', true) + '</td></tr>';
      const maxP = Math.max(0, Math.ceil(d.total / d.per) - 1);
      $('#c-pg', el).innerHTML = '<span>' + d.total + ' kontak • sinkron terakhir ' + (d.syncTerakhir ? fmt.rel(new Date(d.syncTerakhir).toISOString()) : '–') + '</span><span class="pg"><button class="btn btn-white btn-sm" data-pg="-1"' + (f.halaman ? '' : ' disabled') + '>‹</button><span style="align-self:center">' + (f.halaman + 1) + '/' + (maxP + 1) + '</span><button class="btn btn-white btn-sm" data-pg="1"' + (f.halaman < maxP ? '' : ' disabled') + '>›</button></span>';
      $('#c-bulk', el).innerHTML = pilih.size ? '<b>' + pilih.size + ' dipilih:</b>' + [['deteksiWA', 'Deteksi WA'], ['tag', 'Beri tag'], ['blast', 'Blast ke terpilih'], ['optout', 'Opt-out'], ['optin', 'Batalkan opt-out']].map(a => '<button class="btn btn-white btn-sm" data-b="' + a[0] + '">' + a[1] + '</button>').join('') : '';
    }
    const muat = () => apiData('crm.list', Object.assign({ per: 50 }, f)).then(d => { data = d; render(); }).catch(e => toast(e.message, 'err'));
    el.onclick = async (e) => {
      const k = e.target.closest('[data-kpi]'); if (k) { const v = k.dataset.kpi; f.statusWA = v === 'Terdaftar' || v === 'Belum dicek' ? v : ''; f.optOut = v === 'optout' ? 'YA' : ''; f.duplikat = v === 'dup' ? '1' : ''; f.halaman = 0; muat(); return; }
      const c = e.target.closest('[data-c]'); if (c) { c.checked ? pilih.add(c.dataset.c) : pilih.delete(c.dataset.c); render(); return; }
      const pg = e.target.closest('[data-pg]'); if (pg) { f.halaman += Number(pg.dataset.pg); muat(); return; }
      const d = e.target.closest('[data-d]'); if (d) return detail(d.dataset.d, muat);
      const b = e.target.closest('[data-b]'); if (b) {
        const ids = Array.from(pilih), a = b.dataset.b;
        if (a === 'blast') { g.Core.LS.set('blast:pre', { ids }); location.hash = '#/notifikasi?tab=blast'; return; }
        const jalan = async (nilai) => { const r = await api('crm.bulk', { ids, aksi: a, nilai: nilai || '' }); toast(r.message, r.success ? 'ok' : 'err'); pilih.clear(); muat(); statKpi(); };
        if (a === 'tag') modal({ title: 'Beri tag ' + ids.length + ' kontak', body: '<label class="field"><span>Nama tag</span><input class="inp" name="tag" placeholder="Mis. wali-angkatan-2026"></label>', actions: [{ label: 'Batal' }, { label: 'Terapkan', cls: 'btn-lime', fn: async (bd) => { const t = g.UI.formData(bd).tag; if (!t) throw new Error('Isi nama tag.'); await jalan(t); } }] });
        else await jalan();
      }
    };
    $('#c-all', el).onchange = (e) => { (data ? data.rows : []).forEach(k => e.target.checked ? pilih.add(k.id) : pilih.delete(k.id)); render(); };
    let tq; $('#c-q', el).oninput = (e) => { clearTimeout(tq); tq = setTimeout(() => { f.cari = e.target.value.trim(); f.halaman = 0; muat(); }, 350); };
    $('#c-seg', el).onchange = (e) => { f.segmen = e.target.value; f.halaman = 0; muat(); };
    $('#c-wa', el).onchange = (e) => { f.statusWA = e.target.value; f.halaman = 0; muat(); };
    $('#c-sync', el).onclick = async () => { const r = await api('crm.sync', {}); toast(r.message, r.success ? 'ok' : 'err'); muat(); statKpi(); };
    $('#c-xls', el).onclick = async () => { const d = await apiData('crm.export', { segmen: f.segmen }); g.UI.eksporExcel('Kontak_CRM_' + fmt.today(), Object.keys(d.rows[0] || { Nama: '' }).map(k => ({ k, label: k })), d.rows, 'Kontak'); };
    $('#c-imp', el).onchange = async (e) => { const file = e.target.files[0]; if (!file) return; try { const rows = (await g.UI.bacaFileTabel(file)).map(r => { const o = {}; Object.keys(r).forEach(k => o[k.trim().toLowerCase()] = r[k]); return o; }); const r = await api('crm.import', { rows }); toast(r.message, r.success ? 'ok' : 'err', 6000); muat(); statKpi(); } catch (er) { toast(er.message, 'err'); } e.target.value = ''; };
    statKpi(); muat();
  }
  function detail(id, onUbah) {
    apiData('crm.detail', { kontakId: id }).then(d => {
      const k = d.kontak;
      const body = g.UI.h('<div><div class="row-flex">' + avatar(k.nama, '', 'lg') + '<div><div style="font-weight:800;font-size:18px">' + esc(k.nama) + '</div><div class="muted">' + esc(k.segmen) + (k.info.Anak ? ' • Anak: ' + esc(k.info.Anak) : '') + '</div></div><span class="spacer"></span>' + (k.wa ? '<a class="btn btn-lime btn-sm" target="_blank" rel="noopener" href="https://wa.me/62' + esc(String(k.wa).replace(/^0/, '')) + '">' + icon('wa', 'sm') + 'WhatsApp</a>' : '') + (k.email ? '<a class="btn btn-white btn-sm" href="mailto:' + esc(k.email) + '">' + icon('mail', 'sm') + 'Email</a>' : '') + '</div>' +
        '<div class="form-grid mt16"><label class="field"><span>Tag (pisah koma)</span><input class="inp" name="tag" value="' + esc(k.tag || '') + '"></label><label class="field"><span>Opt-out blast</span><select class="inp" name="optOut"><option value="">Tidak</option><option value="1"' + (k.optOut ? ' selected' : '') + '>Ya — jangan kirim blast</option></select></label><label class="field full"><span>Catatan</span><textarea class="inp" name="catatan">' + esc(k.catatan || '') + '</textarea></label></div>' +
        '<div class="sec-t mt20">Catat interaksi</div><div class="row-flex"><select class="inp" name="kanal" style="width:160px"><option>Telepon</option><option>WA Manual</option><option>Kunjungan</option><option>Catatan</option></select><input class="inp" name="ringkasan" placeholder="Ringkasan interaksi" style="flex:1"><button class="btn btn-dark btn-sm" type="button" data-int>Catat</button></div>' +
        '<div class="sec-t mt20">Timeline</div><div>' + (d.timeline.length ? d.timeline.map(t => '<div class="queue-item"><span class="badge ' + (t.arah === 'Masuk' ? 'b-info' : 'b-mut') + '">' + esc(t.kanal) + '</span><div class="mid">' + esc(t.ringkasan) + '<div class="muted" style="font-size:11.5px">' + fmt.tgl(t.waktu) + ' ' + fmt.jam(t.waktu) + ' • ' + esc(t.oleh || '') + (t.status ? ' • ' + esc(t.status) : '') + '</div></div></div>').join('') : '<p class="muted">Belum ada interaksi.</p>') + '</div></div>');
      $('[data-int]', body).onclick = async () => { const f = g.UI.formData(body); const r = await api('crm.interaksi', { kontakId: id, kanal: f.kanal, ringkasan: f.ringkasan }); toast(r.message, r.success ? 'ok' : 'err'); };
      modal({ title: 'Detail kontak', wide: true, body, actions: [{ label: 'Tutup' }, { label: 'Simpan', cls: 'btn-lime', fn: async () => { const f = g.UI.formData(body); await apiData('crm.save', { kontak: { id, tag: f.tag, catatan: f.catatan, optOut: !!f.optOut } }); toast('Kontak tersimpan.'); if (onUbah) onUbah(); } }] });
    }).catch(e => toast(e.message, 'err'));
  }
})(window);
