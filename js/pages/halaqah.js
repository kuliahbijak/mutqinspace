/* MutqinSpace — Manajemen Halaqah, Santri, Wali, Muhaffidz, Target, Impor & PIN (FR-04..FR-09) */
(function (g) {
  'use strict';
  const { icon, esc, avatar, fmt, $, $$, toast, modal, h } = g.UI;
  const { swr, apiData, swrHapus } = g.Core;

  const TABS = [['halaqah', 'Halaqah', 'users'], ['santri', 'Santri', 'user'], ['wali', 'Wali', 'phone'], ['muhaffidz', 'Muhaffidz', 'award'], ['target', 'Target', 'target'], ['impor', 'Impor & PIN', 'upload'], ['riwayat', 'Riwayat Pindah', 'move']];
  const opsiHq = (sel, kosong) => (kosong ? '<option value="">' + kosong + '</option>' : '') + (g.App.boot.halaqah || []).map(x => '<option value="' + esc(x.id) + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(x.nama) + (x.status === 'Nonaktif' ? ' (nonaktif)' : '') + '</option>').join('');
  const namaHq = (id) => { const x = g.App.halaqah(id); return x ? x.nama : (id || '–'); };
  const namaStaf = (id) => { const x = g.App.staf_(id); return x ? x.nama : (id || '–'); };
  const segar = async () => { swrHapus('m:'); await g.App.segarkanBoot(); };
  const badgeStatus = (s) => '<span class="badge ' + ({ Aktif: 'b-ok', Cuti: 'b-warn', Lulus: 'b-info', Nonaktif: 'b-mut' }[s] || 'b-mut') + '">' + esc(s || '-') + '</span>';

  function data(entity, render, paksa) { return swr('m:' + entity, 'master.list', { entity }, { maxAge: 30000, force: paksa, render }); }

  g.Pages.halaqah = {
    peran: ['mudir', 'muhaffidz'],
    render(root, ctx) {
      const App = g.App;
      if (!App.mudir()) return halaqahSaya(root);
      const tab = ctx.q.tab || 'halaqah';
      root.innerHTML = App.kepala('Halaqah & Data Santri', { sub: 'Kelola halaqah, santri, wali, muhaffidz, dan target hafalan.', aksi: '<button class="btn btn-lime" id="m-tambah"><span class="plus">+</span>Tambah</button>' }) +
        '<div class="tabs light" id="m-tabs">' + TABS.map(t => '<button data-t="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div><div id="m-body"></div>';
      $('#m-tabs', root).onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) location.hash = '#/halaqah?tab=' + b.dataset.t; };
      const body = $('#m-body', root);
      const peta = { halaqah: tabHalaqah, santri: tabSantri, wali: tabWali, muhaffidz: tabMuhaffidz, target: tabTarget, impor: tabImpor, riwayat: tabRiwayat };
      const fn = peta[tab] || tabHalaqah;
      const api = fn(body, ctx.q) || {};
      $('#m-tambah', root).onclick = () => (api.tambah ? api.tambah() : formSantri());
      $('#m-tambah', root).hidden = !api.tambah;
      ctx.halaman.segarkan = () => api.muat && api.muat(true);
    },
    resetPin: (ids) => buatPin({ ids })
  };

  /* ---------------- Muhaffidz: halaqah saya (baca saja) ---------------- */
  function halaqahSaya(root) {
    const App = g.App, hq = (App.boot.halaqah || []).filter(x => x.muhaffidz === App.boot.me.id);
    root.innerHTML = App.kepala('Halaqah Saya', { sub: 'Santri binaan Anda. Perubahan data santri dilakukan oleh Mudir.' }) +
      (hq.length ? hq.map(x => {
        const sn = (App.boot.santri || []).filter(s => s.halaqah === x.id && s.status !== 'Nonaktif');
        return '<section class="dark-panel"><div class="dp-top"><div><h3 style="margin:0;font-size:22px">' + esc(x.nama) + '</h3><div style="color:var(--muted-on-dark)">' + esc(x.jadwal || '') + ' • ' + esc(x.tingkat || '') + ' • ' + sn.length + ' santri</div></div><button class="btn btn-lime btn-sm" data-rekap="' + esc(x.id) + '">' + icon('download', 'sm') + 'Rekap PDF</button></div>' +
          '<div class="rows">' + sn.map(s => '<a class="row" href="#/santri/' + esc(s.id) + '">' + avatar(s.nama, s.foto) + '<div class="mid"><div class="t1">' + esc(s.nama) + '</div><div class="t2">NIS ' + esc(s.nis) + '</div></div><div class="rt">' + (s.status !== 'Aktif' ? '<span class="pred">' + esc(s.status) + '</span>' : '') + icon('arrow') + '</div></a>').join('') + '</div></section>';
      }).join('') : '<div class="glass">' + g.UI.empty('Belum ada halaqah yang ditugaskan kepada Anda.', 'users', true) + '</div>');
    $$('[data-rekap]', root).forEach(b => b.onclick = async () => { try { const d = await apiData('rekap.halaqah', { halaqahId: b.dataset.rekap }); g.UI.unduhBase64(d.nama, d.mime, d.base64); } catch (e) { toast(e.message, 'err'); } });
  }

  /* ---------------- Halaqah: panel gelap + slate ---------------- */
  function tabHalaqah(el) {
    const App = g.App; let sel = null, rows = [];
    el.innerHTML = '<section class="dark-panel"><div class="split"><div><div class="list-head"><h3>Daftar Halaqah</h3><span id="hq-n"></span></div><div id="hq-rows">' + g.UI.skRows(4) + '</div></div><div id="hq-det"></div></div></section>';
    function render() {
      const sn = App.boot.santri || [];
      $('#hq-n', el).textContent = rows.filter(r => r.Status !== 'Nonaktif').length + ' aktif';
      if (!rows.some(r => r.ID_Halaqah === sel)) sel = rows[0] && rows[0].ID_Halaqah;
      $('#hq-rows', el).innerHTML = '<div class="rows"><button class="addcard" id="hq-add" style="min-height:64px;color:#E5E7EB;border-color:rgba(255,255,255,.25)"><span class="plus" style="background:rgba(255,255,255,.15)">+</span>Halaqah baru</button>' +
        rows.map(r => { const n = sn.filter(s => s.halaqah === r.ID_Halaqah && s.status === 'Aktif').length; return '<button class="row ' + (r.ID_Halaqah === sel ? 'sel' : '') + '" data-id="' + esc(r.ID_Halaqah) + '">' + avatar(r.Nama_Halaqah) + '<div class="mid"><div class="t1">' + esc(r.Nama_Halaqah) + '</div><div class="t2">' + esc(namaStaf(r.ID_Muhaffidz)) + ' • ' + esc(r.Jadwal || '-') + '</div></div><div class="rt"><span class="pred ' + (r.ID_Halaqah === sel ? 'white' : '') + '">' + esc(r.Status === 'Nonaktif' ? 'Nonaktif' : r.Tingkat || '-') + '</span><span class="score">' + n + '</span></div></button>'; }).join('') + '</div>';
      $('#hq-add', el).onclick = () => formHalaqah();
      const r = rows.find(x => x.ID_Halaqah === sel), det = $('#hq-det', el);
      if (!r) { det.innerHTML = '<div class="slate">' + g.UI.empty('Belum ada halaqah. Tambahkan halaqah pertama.', 'users') + '</div>'; return; }
      const anggota = sn.filter(s => s.halaqah === r.ID_Halaqah && s.status !== 'Nonaktif'), g0 = App.staf_(r.ID_Muhaffidz) || { nama: '-' };
      det.innerHTML = '<div class="slate"><div class="slate-top"><div><div class="eyebrow">Detail Halaqah</div><h2>' + esc(r.Nama_Halaqah) + ' <span class="pred white" style="font-size:13px">' + esc(r.Tingkat || '-') + '</span></h2><div class="hq">' + icon('clock', 'sm') + esc(r.Jadwal || 'Jadwal belum diisi') + '</div></div>' +
        '<div class="teacher">' + avatar(g0.nama, g0.foto, 'sm') + '<div><div class="n">' + esc(g0.nama) + '</div><div class="r">Muhaffidz penanggung jawab</div></div></div></div><hr class="hr">' +
        '<div class="row-flex"><b style="color:#10222E">' + anggota.length + ' santri</b><span class="spacer"></span>' + badgeStatus(r.Status) + '</div>' +
        '<div class="subcards" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">' + anggota.slice(0, 15).map(s => '<a class="sc" href="#/santri/' + esc(s.id) + '" style="min-height:0;flex-direction:row;align-items:center;gap:10px;justify-content:flex-start">' + avatar(s.nama, s.foto, 'sm') + '<div style="min-width:0"><div class="v" style="margin:0;font-size:14px">' + esc(s.nama) + '</div><div class="d">NIS ' + esc(s.nis) + '</div></div></a>').join('') +
        '<button class="addcard" data-a="tambahSantri" style="min-height:62px"><span class="plus">+</span>Tambah santri</button></div>' + (anggota.length > 15 ? '<p style="font-size:12.5px">+' + (anggota.length - 15) + ' santri lainnya — lihat tab Santri.</p>' : '') +
        '<hr class="hr"><div class="slate-foot"><div class="stats3"><div><div class="k">Santri aktif</div><div class="v">' + anggota.filter(s => s.status === 'Aktif').length + '</div></div><div><div class="k">Tingkat</div><div class="v">' + esc(r.Tingkat || '-') + '</div></div></div>' +
        '<div class="row-flex"><button class="ibtn slate" data-a="rekap" title="Rekap PDF">' + icon('printer') + '</button><button class="ibtn slate" data-a="status" title="' + (r.Status === 'Nonaktif' ? 'Aktifkan' : 'Nonaktifkan') + '">' + icon(r.Status === 'Nonaktif' ? 'check' : 'x') + '</button><button class="btn btn-lime" data-a="edit">' + icon('edit') + 'Edit halaqah</button></div></div></div>';
      det.onclick = async (e) => {
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'edit') formHalaqah(r);
        if (a.dataset.a === 'tambahSantri') formSantri({ ID_Halaqah: r.ID_Halaqah });
        if (a.dataset.a === 'rekap') { try { const d = await apiData('rekap.halaqah', { halaqahId: r.ID_Halaqah }); g.UI.unduhBase64(d.nama, d.mime, d.base64); } catch (er) { toast(er.message, 'err'); } }
        if (a.dataset.a === 'status') { const ke = r.Status === 'Nonaktif' ? 'Aktif' : 'Nonaktif'; if (!(await g.UI.konfirmasi(ke + 'kan halaqah ' + r.Nama_Halaqah + '?' + (ke === 'Nonaktif' ? ' Riwayat setoran tetap tersimpan.' : '')))) return; try { await apiData('master.status', { entity: 'halaqah', ids: [r.ID_Halaqah], status: ke }); toast('Status diperbarui.'); await segar(); muat(true); } catch (er) { toast(er.message, 'err'); } }
      };
    }
    $('#hq-rows', el).onclick = (e) => { const b = e.target.closest('.row'); if (!b) return; sel = b.dataset.id; render(); };
    const muat = (paksa) => data('halaqah', (d) => { rows = (d || []).sort((a, b) => (a.Status === 'Nonaktif') - (b.Status === 'Nonaktif') || a.Nama_Halaqah.localeCompare(b.Nama_Halaqah)); render(); }, paksa);
    muat();
    return { muat, tambah: () => formHalaqah() };
  }
  function formHalaqah(r) {
    r = r || {};
    const staf = (g.App.boot.staf || []).filter(u => u.status !== 'Nonaktif');
    const tingkat = String(g.App.setting('TINGKAT_LIST') || '').split(',').map(x => x.trim()).filter(Boolean);
    modal({ title: r.ID_Halaqah ? 'Edit halaqah' : 'Halaqah baru', body: '<div class="form-grid"><label class="field full"><span>Nama halaqah</span><input class="inp" name="Nama_Halaqah" value="' + esc(r.Nama_Halaqah || '') + '" required></label>' +
      '<label class="field"><span>Muhaffidz penanggung jawab</span><select class="inp" name="ID_Muhaffidz">' + staf.map(u => '<option value="' + esc(u.id) + '"' + (u.id === r.ID_Muhaffidz ? ' selected' : '') + '>' + esc(u.nama) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Tingkat</span><select class="inp" name="Tingkat">' + tingkat.map(t => '<option' + (t === r.Tingkat ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select></label>' +
      '<label class="field full"><span>Jadwal</span><input class="inp" name="Jadwal" value="' + esc(r.Jadwal || '') + '" placeholder="Mis. Senin–Kamis, ba\'da Subuh"></label>' +
      '<label class="field"><span>Status</span><select class="inp" name="Status"><option' + (r.Status !== 'Nonaktif' ? ' selected' : '') + '>Aktif</option><option' + (r.Status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></label></div>',
      actions: [{ label: 'Batal' }, { label: 'Simpan', cls: 'btn-lime', fn: async (b) => { await apiData('master.save', { entity: 'halaqah', row: Object.assign({ ID_Halaqah: r.ID_Halaqah }, g.UI.formData(b)) }); toast('Halaqah tersimpan.'); await segar(); g.App.route(); } }] });
  }

  /* ---------------- Santri: tabel + aksi massal ---------------- */
  function tabSantri(el, q) {
    const App = g.App; let rows = [], pilih = new Set(), f = { q: q.q || '', hq: '', status: 'Aktif' }, page = 0;
    el.innerHTML = '<div class="filters"><label class="search" style="margin:0;min-width:240px"><input class="pill-in" id="sn-q" placeholder="Cari nama / NIS" value="' + esc(f.q) + '">' + icon('search') + '</label>' +
      '<select class="pill-in" id="sn-hq">' + opsiHq('', 'Semua halaqah') + '</select><select class="pill-in" id="sn-st"><option value="">Semua status</option>' + ['Aktif', 'Cuti', 'Lulus', 'Nonaktif'].map(s => '<option' + (s === f.status ? ' selected' : '') + '>' + s + '</option>').join('') + '</select>' +
      '<span class="spacer"></span><span id="sn-bulk" class="row-flex"></span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="nosort"><input type="checkbox" id="sn-all" aria-label="Pilih semua"></th><th>NIS</th><th>Nama</th><th>JK</th><th>Halaqah</th><th>Status</th><th>PIN</th><th>Masuk</th><th class="nosort"></th></tr></thead><tbody id="sn-tb"><tr><td colspan="9">' + g.UI.sk(120) + '</td></tr></tbody></table></div><div class="pager" id="sn-pg"></div>';
    const PER = 50;
    function tersaring() { const s = f.q.toLowerCase(); return rows.filter(r => (!s || (r.Nama + ' ' + r.NIS).toLowerCase().indexOf(s) > -1) && (!f.hq || r.ID_Halaqah === f.hq) && (!f.status || r.Status === f.status)); }
    function render() {
      const list = tersaring(), maxP = Math.max(0, Math.ceil(list.length / PER) - 1); page = Math.min(page, maxP);
      $('#sn-tb', el).innerHTML = list.length ? list.slice(page * PER, page * PER + PER).map(r => '<tr><td><input type="checkbox" data-c="' + esc(r.ID_Santri) + '"' + (pilih.has(r.ID_Santri) ? ' checked' : '') + '></td><td class="mono">' + esc(r.NIS) + '</td><td class="tclick" data-p="' + esc(r.ID_Santri) + '"><div class="row-flex" style="flex-wrap:nowrap">' + avatar(r.Nama, r.Foto_URL, 'sm') + '<b>' + esc(r.Nama) + '</b></div></td><td>' + esc(r.Jenis_Kelamin) + '</td><td>' + esc(namaHq(r.ID_Halaqah)) + '</td><td>' + badgeStatus(r.Status) + '</td><td>' + (r.punyaPin ? '<span class="badge b-ok">✓</span>' : '<span class="badge b-warn">belum</span>') + '</td><td>' + fmt.tgl(r.Tanggal_Masuk) + '</td><td><button class="ibtn" data-e="' + esc(r.ID_Santri) + '" title="Edit" style="width:34px;height:34px">' + icon('edit', 'sm') + '</button></td></tr>').join('') : '<tr><td colspan="9">' + g.UI.empty('Tidak ada santri pada filter ini.', 'user', true) + '</td></tr>';
      $('#sn-pg', el).innerHTML = '<span>' + list.length + ' santri' + (pilih.size ? ' • ' + pilih.size + ' dipilih' : '') + '</span><span class="pg"><button class="btn btn-white btn-sm" data-pg="-1"' + (page ? '' : ' disabled') + '>‹</button><span style="align-self:center">' + (page + 1) + '/' + (maxP + 1) + '</span><button class="btn btn-white btn-sm" data-pg="1"' + (page < maxP ? '' : ' disabled') + '>›</button></span>';
      $('#sn-bulk', el).innerHTML = pilih.size ? '<button class="btn btn-white btn-sm" data-b="pindah">' + icon('move', 'sm') + 'Pindah halaqah</button><button class="btn btn-white btn-sm" data-b="status">Ubah status</button><button class="btn btn-white btn-sm" data-b="pin">' + icon('key', 'sm') + 'Buat/Reset PIN</button>' : '';
    }
    el.onclick = async (e) => {
      const c = e.target.closest('[data-c]'); if (c) { c.checked ? pilih.add(c.dataset.c) : pilih.delete(c.dataset.c); render(); return; }
      const p = e.target.closest('[data-p]'); if (p) { location.hash = '#/santri/' + p.dataset.p; return; }
      const ed = e.target.closest('[data-e]'); if (ed) { formSantri(rows.find(r => r.ID_Santri === ed.dataset.e)); return; }
      const pg = e.target.closest('[data-pg]'); if (pg) { page += Number(pg.dataset.pg); render(); return; }
      const b = e.target.closest('[data-b]'); if (!b) return;
      const ids = Array.from(pilih);
      if (b.dataset.b === 'pin') buatPin({ ids });
      if (b.dataset.b === 'pindah') modal({ title: 'Pindah ' + ids.length + ' santri', body: '<div class="form-grid"><label class="field full"><span>Ke halaqah</span><select class="inp" name="ke">' + opsiHq('') + '</select></label><label class="field full"><span>Alasan</span><input class="inp" name="alasan" placeholder="Mis. naik tingkat"></label></div>',
        actions: [{ label: 'Batal' }, { label: 'Pindahkan', cls: 'btn-lime', fn: async (bd) => { const fd = g.UI.formData(bd); const r = await apiData('master.pindah', { santriIds: ids, keHalaqah: fd.ke, alasan: fd.alasan }); toast('Santri dipindahkan.'); pilih.clear(); await segar(); muat(true); void r; } }] });
      if (b.dataset.b === 'status') modal({ title: 'Ubah status ' + ids.length + ' santri', body: '<label class="field"><span>Status baru</span><select class="inp" name="st"><option>Aktif</option><option>Cuti</option><option>Lulus</option><option>Nonaktif</option></select></label><p class="muted" style="font-size:12.5px">Data tidak dihapus — riwayat setoran tetap utuh (FR-09).</p>',
        actions: [{ label: 'Batal' }, { label: 'Simpan', cls: 'btn-lime', fn: async (bd) => { await apiData('master.status', { entity: 'santri', ids, status: g.UI.formData(bd).st }); toast('Status diperbarui.'); pilih.clear(); await segar(); muat(true); } }] });
    };
    $('#sn-all', el).onchange = (e) => { tersaring().forEach(r => e.target.checked ? pilih.add(r.ID_Santri) : pilih.delete(r.ID_Santri)); render(); };
    let tq; $('#sn-q', el).oninput = (e) => { clearTimeout(tq); tq = setTimeout(() => { f.q = e.target.value.trim(); page = 0; render(); }, 200); };
    $('#sn-hq', el).onchange = (e) => { f.hq = e.target.value; page = 0; render(); };
    $('#sn-st', el).onchange = (e) => { f.status = e.target.value; page = 0; render(); };
    const muat = (paksa) => data('santri', (d) => { rows = (d || []).sort((a, b) => a.Nama.localeCompare(b.Nama)); render(); }, paksa);
    muat();
    return { muat, tambah: () => formSantri() };
  }
  function formSantri(r) {
    r = r || {};
    modal({ title: r.ID_Santri ? 'Edit santri' : 'Santri baru', body: '<div class="form-grid"><label class="field"><span>NIS</span><input class="inp" name="NIS" value="' + esc(r.NIS || '') + '" required></label><label class="field"><span>Nama lengkap</span><input class="inp" name="Nama" value="' + esc(r.Nama || '') + '" required></label>' +
      '<label class="field"><span>Jenis kelamin</span><select class="inp" name="Jenis_Kelamin"><option value="L"' + (r.Jenis_Kelamin !== 'P' ? ' selected' : '') + '>Laki-laki</option><option value="P"' + (r.Jenis_Kelamin === 'P' ? ' selected' : '') + '>Perempuan</option></select></label>' +
      '<label class="field"><span>Tanggal masuk</span><input class="inp" type="date" name="Tanggal_Masuk" value="' + esc(r.Tanggal_Masuk || fmt.today()) + '"></label>' +
      '<label class="field"><span>Halaqah</span><select class="inp" name="ID_Halaqah">' + opsiHq(r.ID_Halaqah, '— belum ditentukan —') + '</select></label>' +
      '<label class="field"><span>Status</span><select class="inp" name="Status">' + ['Aktif', 'Cuti', 'Lulus', 'Nonaktif'].map(s => '<option' + ((r.Status || 'Aktif') === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></label>' +
      '<label class="field full"><span>Foto (tautan Google Drive, opsional)</span><input class="inp" name="Foto_URL" value="' + esc(r.Foto_URL || '') + '" placeholder="https://drive.google.com/file/d/.../view"><small>Bagikan foto di folder Foto_Santri sebagai "Siapa saja yang memiliki link".</small></label>' +
      '<label class="field full"><span>Catatan</span><input class="inp" name="Catatan" value="' + esc(r.Catatan || '') + '"></label>' + (r.ID_Santri ? '<label class="field full"><span>Alasan (jika pindah halaqah)</span><input class="inp" name="alasan"></label>' : '') + '</div>',
      actions: [].concat(r.ID_Santri ? [{ label: 'Hafalan awal', icon: 'layers', fn: () => { g.Pages.santri.hafalanAwal(r.ID_Santri); } }] : []).concat([{ label: 'Batal' }, { label: 'Simpan', cls: 'btn-lime', fn: async (b) => {
        const fd = g.UI.formData(b), alasan = fd.alasan; delete fd.alasan;
        const d = await apiData('master.save', { entity: 'santri', row: Object.assign({ ID_Santri: r.ID_Santri }, fd), alasan });
        toast('Data santri tersimpan.'); await segar(); g.App.route();
        if (!r.ID_Santri) setTimeout(async () => { if (await g.UI.konfirmasi('Tambahkan data wali untuk ' + d.Nama + ' sekarang?', { ya: 'Tambah wali' })) formWali({ ID_Santri: d.ID_Santri }); }, 60);
      } }]) });
  }

  /* ---------------- Wali ---------------- */
  function tabWali(el) {
    let rows = [], f = '';
    el.innerHTML = '<div class="filters"><label class="search" style="margin:0;min-width:260px"><input class="pill-in" id="wl-q" placeholder="Cari wali / santri / nomor">' + icon('search') + '</label><span class="spacer"></span><span class="muted" style="font-size:12.5px">Satu wali boleh terhubung ke beberapa anak (nomor WA yang sama = satu akun portal).</span></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama wali</th><th>Hubungan</th><th>WhatsApp</th><th>Email</th><th>Santri</th><th class="nosort"></th></tr></thead><tbody id="wl-tb"><tr><td colspan="6">' + g.UI.sk(100) + '</td></tr></tbody></table></div>';
    function render() {
      const q = f.toLowerCase(), list = rows.filter(r => { const s = g.App.santri(r.ID_Santri) || {}; return !q || (r.Nama + ' ' + r.No_WA + ' ' + r.Email + ' ' + s.nama).toLowerCase().indexOf(q) > -1; });
      $('#wl-tb', el).innerHTML = list.length ? list.slice(0, 300).map(r => { const s = g.App.santri(r.ID_Santri) || {}; return '<tr><td><b>' + esc(r.Nama) + '</b></td><td>' + esc(r.Hubungan) + '</td><td class="mono">' + esc(r.No_WA) + ' ' + (r.StatusWA === 'Terdaftar' ? '<span class="badge b-ok">✓ WA</span>' : r.StatusWA ? '<span class="badge b-bad">✕ WA</span>' : '') + '</td><td>' + esc(r.Email || '–') + '</td><td><a href="#/santri/' + esc(r.ID_Santri) + '">' + esc(s.nama || r.ID_Santri) + '</a></td><td class="row-flex" style="flex-wrap:nowrap"><button class="ibtn" data-e="' + esc(r.ID_Wali) + '" style="width:34px;height:34px">' + icon('edit', 'sm') + '</button><button class="ibtn" data-d="' + esc(r.ID_Wali) + '" style="width:34px;height:34px">' + icon('trash', 'sm') + '</button></td></tr>'; }).join('') : '<tr><td colspan="6">' + g.UI.empty('Belum ada data wali.', 'phone', true) + '</td></tr>';
    }
    el.onclick = async (e) => {
      const ed = e.target.closest('[data-e]'); if (ed) return formWali(rows.find(r => r.ID_Wali === ed.dataset.e));
      const dl = e.target.closest('[data-d]'); if (dl) { if (!(await g.UI.konfirmasi('Hapus relasi wali ini? Data santri tidak terpengaruh.', { bahaya: true, ya: 'Hapus' }))) return; try { await apiData('master.hapus', { entity: 'wali', ids: [dl.dataset.d] }); toast('Relasi wali dihapus.'); await segar(); muat(true); } catch (er) { toast(er.message, 'err'); } }
    };
    let tq; $('#wl-q', el).oninput = (e) => { clearTimeout(tq); tq = setTimeout(() => { f = e.target.value.trim(); render(); }, 200); };
    const muat = (paksa) => data('wali', (d) => { rows = (d || []).sort((a, b) => a.Nama.localeCompare(b.Nama)); render(); }, paksa);
    muat();
    return { muat, tambah: () => formWali() };
  }
  function formWali(r) {
    r = r || {};
    const sn = (g.App.boot.santri || []).filter(s => s.status !== 'Nonaktif').sort((a, b) => a.nama.localeCompare(b.nama));
    modal({ title: r.ID_Wali ? 'Edit wali' : 'Wali baru', body: '<div class="form-grid"><label class="field full"><span>Santri</span><select class="inp" name="ID_Santri">' + sn.map(s => '<option value="' + esc(s.id) + '"' + (s.id === r.ID_Santri ? ' selected' : '') + '>' + esc(s.nama) + ' (' + esc(s.nis) + ')</option>').join('') + '</select></label>' +
      '<label class="field"><span>Nama wali</span><input class="inp" name="Nama" value="' + esc(r.Nama || '') + '" required></label><label class="field"><span>Hubungan</span><select class="inp" name="Hubungan">' + ['Ayah', 'Ibu', 'Wali'].map(x => '<option' + (x === r.Hubungan ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>No. WhatsApp</span><input class="inp" name="No_WA" inputmode="tel" value="' + esc(r.No_WA || '') + '" placeholder="0812xxxxxxxx" required></label><label class="field"><span>Email (opsional)</span><input class="inp" type="email" name="Email" value="' + esc(r.Email || '') + '"></label></div>',
      actions: [{ label: 'Batal' }, { label: 'Simpan', cls: 'btn-lime', fn: async (b) => { await apiData('master.save', { entity: 'wali', row: Object.assign({ ID_Wali: r.ID_Wali }, g.UI.formData(b)) }); toast('Data wali tersimpan.'); await segar(); g.App.route(); } }] });
  }

  /* ---------------- Muhaffidz & Mudir ---------------- */
  function tabMuhaffidz(el) {
    let rows = [];
    el.innerHTML = '<div class="hint">Hanya email Google yang terdaftar & aktif di sini yang bisa login sebagai Mudir/Muhaffidz (whitelist, FR-01).</div><div class="card-list mt16" id="mh-list">' + g.UI.sk(140) + '</div>';
    function render() {
      $('#mh-list', el).innerHTML = rows.map(r => { const hq = (g.App.boot.halaqah || []).filter(x => x.muhaffidz === r.ID_Muhaffidz && x.status !== 'Nonaktif'); return '<div class="ocard"><div class="h">' + avatar(r.Nama, r.Foto_URL) + '<div style="min-width:0;flex:1"><div class="t">' + esc(r.Nama) + '</div><div class="s">' + esc(r.Email_Google) + '</div></div>' + (r.Peran === 'Mudir' ? '<span class="badge b-lime">Mudir</span>' : '') + '</div>' +
        '<dl class="kv"><dt>WhatsApp</dt><dd class="mono">' + esc(r.No_WA || '–') + '</dd><dt>Halaqah</dt><dd>' + (hq.map(x => esc(x.nama)).join(', ') || '–') + '</dd><dt>Status</dt><dd>' + badgeStatus(r.Status) + '</dd></dl>' +
        '<div class="row-flex"><button class="btn btn-white btn-sm" data-e="' + esc(r.ID_Muhaffidz) + '">' + icon('edit', 'sm') + 'Edit</button><button class="btn btn-ghost btn-sm" data-s="' + esc(r.ID_Muhaffidz) + '">' + (r.Status === 'Nonaktif' ? 'Aktifkan' : 'Nonaktifkan') + '</button></div></div>'; }).join('') +
        '<button class="addcard light" id="mh-add" style="min-height:180px"><span class="plus">+</span>Tambah muhaffidz</button>';
      $('#mh-add', el).onclick = () => formMuhaffidz();
    }
    el.onclick = async (e) => {
      const ed = e.target.closest('[data-e]'); if (ed) return formMuhaffidz(rows.find(r => r.ID_Muhaffidz === ed.dataset.e));
      const s = e.target.closest('[data-s]'); if (s) { const r = rows.find(x => x.ID_Muhaffidz === s.dataset.s), ke = r.Status === 'Nonaktif' ? 'Aktif' : 'Nonaktif'; if (!(await g.UI.konfirmasi(ke + 'kan ' + r.Nama + '?' + (ke === 'Nonaktif' ? ' Sesi login-nya akan dicabut.' : '')))) return; try { await apiData('master.status', { entity: 'muhaffidz', ids: [r.ID_Muhaffidz], status: ke }); toast('Status diperbarui.'); await segar(); muat(true); } catch (er) { toast(er.message, 'err'); } }
    };
    const muat = (paksa) => data('muhaffidz', (d) => { rows = (d || []).sort((a, b) => (b.Peran === 'Mudir') - (a.Peran === 'Mudir') || a.Nama.localeCompare(b.Nama)); render(); }, paksa);
    muat();
    return { muat, tambah: () => formMuhaffidz() };
  }
  function formMuhaffidz(r) {
    r = r || {};
    modal({ title: r.ID_Muhaffidz ? 'Edit muhaffidz' : 'Muhaffidz baru', body: '<div class="form-grid"><label class="field full"><span>Nama</span><input class="inp" name="Nama" value="' + esc(r.Nama || '') + '" placeholder="Ust. ..." required></label>' +
      '<label class="field full"><span>Email Google (untuk login)</span><input class="inp" type="email" name="Email_Google" value="' + esc(r.Email_Google || '') + '" required></label>' +
      '<label class="field"><span>No. WhatsApp</span><input class="inp" name="No_WA" value="' + esc(r.No_WA || '') + '"></label><label class="field"><span>Peran</span><select class="inp" name="Peran"><option' + (r.Peran !== 'Mudir' ? ' selected' : '') + '>Muhaffidz</option><option' + (r.Peran === 'Mudir' ? ' selected' : '') + '>Mudir</option></select></label>' +
      '<label class="field"><span>Status</span><select class="inp" name="Status"><option' + (r.Status !== 'Nonaktif' ? ' selected' : '') + '>Aktif</option><option' + (r.Status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></label>' +
      '<label class="field"><span>Foto (tautan, opsional)</span><input class="inp" name="Foto_URL" value="' + esc(r.Foto_URL || '') + '"></label></div>',
      actions: [{ label: 'Batal' }, { label: 'Simpan', cls: 'btn-lime', fn: async (b) => { await apiData('master.save', { entity: 'muhaffidz', row: Object.assign({ ID_Muhaffidz: r.ID_Muhaffidz }, g.UI.formData(b)) }); toast('Tersimpan.'); await segar(); g.App.route(); } }] });
  }

  /* ---------------- Target hafalan (FR-08) ---------------- */
  function tabTarget(el) {
    let rows = [];
    el.innerHTML = '<div class="hint">Target berlaku per <b>tingkat halaqah</b> atau per <b>santri</b> (target santri mengalahkan target tingkat). Periode: bulan (2026-11), rentang (2026-07..2026-12), atau <b>SEMESTER</b> (mengikuti tanggal semester di Pengaturan).</div><div class="card-list mt16" id="tg-list">' + g.UI.sk(140) + '</div>';
    function render() {
      $('#tg-list', el).innerHTML = rows.map(r => { const s = g.App.santri(r.Level_atau_ID_Santri); return '<div class="ocard"><div class="h"><span class="ibtn" style="background:var(--accent-lime);border:0">' + icon('target') + '</span><div style="flex:1;min-width:0"><div class="t">' + esc(r.Target_Juz_atau_Surah) + '</div><div class="s">' + (s ? 'Santri: ' + esc(s.nama) : 'Tingkat: ' + esc(r.Level_atau_ID_Santri)) + '</div></div></div>' +
        '<dl class="kv"><dt>Periode</dt><dd>' + esc(r.Periode) + '</dd><dt>Murojaah</dt><dd>' + esc(r.Target_Murojaah || '–') + '</dd>' + (r.Keterangan ? '<dt>Ket.</dt><dd>' + esc(r.Keterangan) + '</dd>' : '') + '</dl><div class="row-flex"><button class="btn btn-white btn-sm" data-e="' + esc(r.ID_Target) + '">' + icon('edit', 'sm') + 'Edit</button><button class="btn btn-ghost btn-sm" data-d="' + esc(r.ID_Target) + '">' + icon('trash', 'sm') + 'Hapus</button></div></div>'; }).join('') +
        '<button class="addcard light" id="tg-add" style="min-height:170px"><span class="plus">+</span>Tambah target</button>';
      $('#tg-add', el).onclick = () => formTarget();
    }
    el.onclick = async (e) => {
      const ed = e.target.closest('[data-e]'); if (ed) return formTarget(rows.find(r => r.ID_Target === ed.dataset.e));
      const dl = e.target.closest('[data-d]'); if (dl) { if (!(await g.UI.konfirmasi('Hapus target ini?', { bahaya: true, ya: 'Hapus' }))) return; try { await apiData('master.hapus', { entity: 'target', ids: [dl.dataset.d] }); toast('Target dihapus.'); swrHapus(); muat(true); } catch (er) { toast(er.message, 'err'); } }
    };
    const muat = (paksa) => data('target', (d) => { rows = d || []; render(); }, paksa);
    muat();
    return { muat, tambah: () => formTarget() };
  }
  function formTarget(r) {
    r = r || {};
    const tingkat = String(g.App.setting('TINGKAT_LIST') || '').split(',').map(x => x.trim()).filter(Boolean);
    const sn = (g.App.boot.santri || []).filter(s => s.status === 'Aktif').sort((a, b) => a.nama.localeCompare(b.nama));
    const m = String(r.Target_Juz_atau_Surah || 'Juz 30').match(/^(juz|surah)\s+(.+)$/i), mv = String(r.Target_Juz_atau_Surah || '').match(/^([\d.,]+)\s*(halaman|hal|ayat|juz)$/i);
    const jenis = m ? (m[1].toLowerCase() === 'juz' ? 'juz' : 'surah') : mv ? (/ayat/i.test(mv[2]) ? 'ayat' : 'halaman') : 'juz';
    const nilai = m ? m[2] : mv ? mv[1] : '30';
    const body = h('<div class="form-grid"><label class="field"><span>Sasaran</span><select class="inp" name="sasaran"><optgroup label="Per tingkat">' + tingkat.map(t => '<option value="' + esc(t) + '"' + (t === r.Level_atau_ID_Santri ? ' selected' : '') + '>Tingkat ' + esc(t) + '</option>').join('') + '<option value="Semua"' + (r.Level_atau_ID_Santri === 'Semua' ? ' selected' : '') + '>Semua santri</option></optgroup><optgroup label="Per santri">' + sn.map(s => '<option value="' + esc(s.id) + '"' + (s.id === r.Level_atau_ID_Santri ? ' selected' : '') + '>' + esc(s.nama) + '</option>').join('') + '</optgroup></select></label>' +
      '<label class="field"><span>Periode</span><input class="inp" name="periode" value="' + esc(r.Periode || 'SEMESTER') + '" list="dl-per"><datalist id="dl-per"><option value="SEMESTER"><option value="' + fmt.today().substring(0, 7) + '"></datalist><small>SEMESTER, 2026-11, atau 2026-07..2026-12</small></label>' +
      '<label class="field"><span>Jenis target ziyadah</span><select class="inp" name="jenis"><option value="juz">Juz (daftar/rentang)</option><option value="surah">Surah (nomor)</option><option value="halaman">Jumlah halaman</option><option value="ayat">Jumlah ayat</option></select></label>' +
      '<label class="field"><span id="tg-lb">Nilai</span><input class="inp" name="nilai" value="' + esc(nilai) + '"><small id="tg-hint"></small></label>' +
      '<label class="field"><span>Target murojaah (opsional)</span><input class="inp" name="mur" value="' + esc(r.Target_Murojaah || '') + '" placeholder="Mis. 20 Halaman atau 2 Juz"></label><label class="field"><span>Keterangan</span><input class="inp" name="ket" value="' + esc(r.Keterangan || '') + '"></label>' +
      '<div class="full hint" id="tg-prev"></div></div>');
    const sj = $('[name=jenis]', body); sj.value = jenis;
    const susun = () => { const f = g.UI.formData(body); return f.jenis === 'juz' ? 'Juz ' + f.nilai : f.jenis === 'surah' ? 'Surah ' + f.nilai : f.nilai + (f.jenis === 'ayat' ? ' Ayat' : ' Halaman'); };
    const upd = () => { const j = sj.value; $('#tg-hint', body).textContent = { juz: 'Contoh: 30 atau 28-30 atau 29, 30', surah: 'Contoh: 67-77 (nomor surah)', halaman: 'Contoh: 20', ayat: 'Contoh: 150' }[j]; $('#tg-prev', body).innerHTML = 'Disimpan sebagai: <b>' + esc(susun()) + '</b>'; };
    body.oninput = upd; upd();
    modal({ title: r.ID_Target ? 'Edit target' : 'Target baru', body, actions: [{ label: 'Batal' }, { label: 'Simpan', cls: 'btn-lime', fn: async () => { const f = g.UI.formData(body); await apiData('master.save', { entity: 'target', row: { ID_Target: r.ID_Target, Level_atau_ID_Santri: f.sasaran, Periode: f.periode, Target_Juz_atau_Surah: susun(), Target_Murojaah: f.mur, Keterangan: f.ket } }); toast('Target tersimpan.'); swrHapus(); g.App.route(); } }] });
  }

  /* ---------------- Impor massal & PIN ---------------- */
  const KOLOM_TPL = ['nis', 'nama', 'jk', 'tanggal_masuk', 'halaqah', 'status', 'nama_wali', 'hubungan', 'no_wa', 'email'];
  function tabImpor(el) {
    el.innerHTML = '<div class="grid g12"><div class="glass c7"><div class="sec-t">Impor santri & wali dari Excel/CSV (FR-07)</div><p class="sec-s">Unggah berkas → pratinjau & validasi → simpan. Santri dengan NIS yang sudah ada akan diperbarui (tidak dobel).</p>' +
      '<div class="row-flex"><button class="btn btn-white" id="im-tpl">' + icon('download') + 'Unduh template CSV</button><label class="btn btn-lime" style="cursor:pointer">' + icon('upload') + 'Pilih berkas<input type="file" id="im-file" accept=".csv,.xlsx,.xls" hidden></label></div>' +
      '<p class="muted mt12" style="font-size:12.5px">Kolom: <span class="kbd">' + KOLOM_TPL.join('</span> <span class="kbd">') + '</span>. Kolom halaqah diisi <b>nama</b> halaqah. Tanggal berformat yyyy-MM-dd.</p><div id="im-prev"></div></div>' +
      '<div class="glass c5"><div class="sec-t">PIN Portal Wali (FR-02, FR-04)</div><p class="sec-s">PIN 6 angka disimpan sebagai hash — hanya bisa dilihat sekali saat dibuat. Cetak atau kirim langsung ke WhatsApp/email wali.</p>' +
      '<label class="row-flex mb12" style="font-size:13.5px"><span class="switch"><input type="checkbox" id="pin-kirim"><i></i></span>Kirim PIN ke wali via WA/Email (antrean notifikasi)</label>' +
      '<button class="btn btn-dark btn-block" id="pin-buat">' + icon('key') + 'Buat PIN untuk santri yang belum punya</button><p class="muted mt12" style="font-size:12.5px">Untuk reset PIN satu/beberapa santri: tab Santri → centang → Buat/Reset PIN.</p></div></div>';
    $('#im-tpl', el).onclick = () => g.UI.unduhBlob('template_impor_santri.csv', new Blob(['﻿' + KOLOM_TPL.join(',') + '\n2024001,Ahmad Fauzan,L,2026-07-14,' + ((g.App.boot.halaqah || [])[0] || { nama: 'Nama Halaqah' }).nama + ',Aktif,Budi Santoso,Ayah,081234567890,budi@email.com\n'], { type: 'text/csv' }));
    let rows = [];
    $('#im-file', el).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const raw = await g.UI.bacaFileTabel(f);
        rows = raw.map(r => { const o = {}; Object.keys(r).forEach(k => o[String(k).trim().toLowerCase().replace(/\s+/g, '_')] = r[k]); return o; });
        const d = await apiData('master.import', { rows, commit: false });
        const R = d.ringkas;
        $('#im-prev', el).innerHTML = '<div class="row-flex mt16"><span class="badge b-ok">Baru ' + R.baru + '</span><span class="badge b-info">Diperbarui ' + R.perbarui + '</span><span class="badge b-bad">Galat ' + R.galat + '</span><span class="spacer"></span><button class="btn btn-lime" id="im-go"' + (R.baru + R.perbarui ? '' : ' disabled') + '>' + icon('check') + 'Impor ' + (R.baru + R.perbarui) + ' baris valid</button></div>' +
          '<div class="tbl-wrap mt12" style="max-height:360px"><table class="tbl"><thead><tr><th>Baris</th><th>NIS</th><th>Nama</th><th>Halaqah</th><th>Wali</th><th>Aksi</th></tr></thead><tbody>' + d.pratinjau.map(x => '<tr><td>' + x.baris + '</td><td class="mono">' + esc(x.nis) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(x.halaqah) + '</td><td>' + esc(x.namaWali) + ' <span class="mono">' + esc(x.wa) + '</span></td><td>' + (x.aksi === 'galat' ? '<span class="badge b-bad">' + esc(x.galat.join('; ')) + '</span>' : '<span class="badge ' + (x.aksi === 'baru' ? 'b-ok' : 'b-info') + '">' + x.aksi + '</span>') + '</td></tr>').join('') + '</tbody></table></div>';
        $('#im-go', el).onclick = async (ev) => { ev.target.disabled = true; try { const r = await g.Core.api('master.import', { rows, commit: true }); toast(r.message, r.success ? 'ok' : 'err', 6000); if (r.success) { $('#im-prev', el).innerHTML = '<div class="hint mt16">' + esc(r.message) + '</div>'; await segar(); } } finally { ev.target.disabled = false; } };
      } catch (er) { toast(er.message, 'err', 6000); }
      e.target.value = '';
    };
    $('#pin-buat', el).onclick = () => buatPin({ tanpaPin: true, kirim: $('#pin-kirim', el).checked });
    return {};
  }
  async function buatPin(opsi) {
    if (!(await g.UI.konfirmasi(opsi.ids ? 'Buat PIN baru untuk ' + opsi.ids.length + ' santri? PIN lama tidak berlaku lagi.' : 'Buat PIN untuk semua santri aktif yang belum punya PIN (maks. 300 sekali proses)?', { ya: 'Buat PIN' }))) return;
    try {
      const r = await g.Core.api('master.pin', opsi);
      if (!r.success) return toast(r.message, 'err', 5000);
      const L = r.data.daftar;
      const m = modal({ title: 'PIN Portal Wali (' + L.length + ')', wide: true, body: '<div class="hint mb12">' + icon('alert', 'sm') + ' ' + esc(r.message) + '</div><div class="tbl-wrap" id="pin-cetak"><table class="tbl"><thead><tr><th>NIS</th><th>Nama</th><th>Halaqah</th><th>Wali</th><th>PIN</th></tr></thead><tbody>' + L.map(x => '<tr><td class="mono">' + esc(x.nis) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(x.halaqah) + '</td><td>' + esc(x.wali) + '</td><td class="mono" style="font-size:16px;font-weight:800;letter-spacing:.15em">' + esc(x.pin) + '</td></tr>').join('') + '</tbody></table></div>',
        actions: [{ label: 'Unduh Excel', icon: 'download', fn: () => { g.UI.eksporExcel('PIN_Wali_' + fmt.today(), [{ k: 'nis', label: 'NIS' }, { k: 'nama', label: 'Nama' }, { k: 'halaqah', label: 'Halaqah' }, { k: 'wali', label: 'Wali' }, { k: 'wa', label: 'WA Wali' }, { k: 'pin', label: 'PIN' }], L, 'PIN'); return false; } },
          { label: 'Cetak', icon: 'printer', fn: () => { const w = window.open('', '_blank'); w.document.write('<title>PIN Portal Wali</title><style>body{font-family:Arial;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;text-align:left}</style><h2>PIN Portal Wali — ' + esc(g.App.setting('NAMA_LEMBAGA')) + '</h2><p>Login di ' + esc(location.origin + location.pathname) + ' → Wali Santri → NIS + PIN</p>' + $('#pin-cetak', m.body).innerHTML); w.document.close(); w.print(); return false; } },
          { label: 'Selesai', cls: 'btn-lime' }] });
      swrHapus('m:'); g.App.segarkanBoot();
    } catch (e) { toast(e.message, 'err'); }
  }

  function tabRiwayat(el) {
    el.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Santri</th><th>Dari</th><th>Ke</th><th>Alasan</th><th>Oleh</th></tr></thead><tbody id="rw-tb"><tr><td colspan="6">' + g.UI.sk(80) + '</td></tr></tbody></table></div>';
    const muat = (paksa) => data('riwayat', (d) => {
      const rows = (d || []).slice().reverse();
      $('#rw-tb', el).innerHTML = rows.length ? rows.map(r => { const s = g.App.santri(r.ID_Santri) || {}; return '<tr><td>' + fmt.tgl(r.Tanggal) + '</td><td><a href="#/santri/' + esc(r.ID_Santri) + '">' + esc(s.nama || r.ID_Santri) + '</a></td><td>' + esc(namaHq(r.Dari_Halaqah)) + '</td><td>' + esc(namaHq(r.Ke_Halaqah)) + '</td><td>' + esc(r.Alasan) + '</td><td>' + esc(r.Oleh) + '</td></tr>'; }).join('') : '<tr><td colspan="6">' + g.UI.empty('Belum ada riwayat pemindahan.', 'move', true) + '</td></tr>';
    }, paksa);
    muat(); return { muat };
  }
})(window);
