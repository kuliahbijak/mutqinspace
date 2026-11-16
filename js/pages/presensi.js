/* MutqinSpace — Presensi Cepat (FR-10): satu ketukan per santri, default Hadir */
(function (g) {
  'use strict';
  const { icon, esc, avatar, fmt, $, $$, toast } = g.UI;
  const { swr, Outbox, swrHapus } = g.Core;
  const KODE = { Hadir: 'H', Izin: 'I', Sakit: 'S', Alpa: 'A' };

  g.Pages.presensi = {
    peran: ['mudir', 'muhaffidz'],
    render(root, ctx) {
      const App = g.App, hari = fmt.today();
      const hqList = (App.boot.halaqah || []).filter(x => x.status !== 'Nonaktif' && (App.mudir() || x.muhaffidz === App.boot.me.id));
      const st = { tanggal: hari, halaqah: (hqList[0] || {}).id || '', rows: [], ubah: false, tercatat: false };
      root.innerHTML = App.kepala('Presensi Cepat', { sub: 'Ketuk status tiap santri — semua dianggap Hadir sampai diubah.', aksi: '<button class="btn btn-white" id="p-semua">' + icon('checkc') + 'Semua Hadir</button><button class="btn btn-lime" id="p-simpan">' + icon('check') + 'Simpan Presensi</button>' }) +
        '<div class="filters"><select class="pill-in" id="p-hq">' + hqList.map(x => '<option value="' + esc(x.id) + '">' + esc(x.nama) + (x.jadwal ? ' — ' + esc(x.jadwal) : '') + '</option>').join('') + '</select>' +
        '<input class="pill-in" type="date" id="p-tgl" max="' + hari + '"><span class="spacer"></span><span id="p-ring" class="row-flex"></span></div>' +
        '<section class="dark-panel"><div class="dp-top"><div><h3 style="margin:0;font-size:18px">Daftar Hadir Halaqah</h3><div style="color:var(--muted-on-dark);font-size:13px" id="p-sub"></div></div>' +
        '<div class="legend" style="color:#D1D5DB"><span><i style="background:#D8F43C"></i>H Hadir</span><span><i style="background:#93C5FD"></i>I Izin</span><span><i style="background:#FCD34D"></i>S Sakit</span><span><i style="background:#F87171"></i>A Alpa</span></div></div>' +
        '<div class="rows" id="p-rows">' + g.UI.skRows(6) + '</div></section>';
      $('#p-tgl', root).value = st.tanggal; if ($('#p-hq', root)) $('#p-hq', root).value = st.halaqah;

      function ringkas() {
        const n = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 }; st.rows.forEach(r => n[r.status || 'Hadir']++);
        $('#p-ring', root).innerHTML = '<span class="badge b-lime">H ' + n.Hadir + '</span><span class="badge b-info">I ' + n.Izin + '</span><span class="badge b-warn">S ' + n.Sakit + '</span><span class="badge b-bad">A ' + n.Alpa + '</span>';
      }
      function render() {
        $('#p-sub', root).textContent = fmt.tglPanjang(st.tanggal) + ' • ' + st.rows.length + ' santri' + (st.tercatat ? ' • sudah pernah disimpan' : ' • belum disimpan');
        $('#p-rows', root).innerHTML = st.rows.length ? st.rows.map((r, i) => {
          const s = r.status || 'Hadir';
          return '<div class="att-row" data-i="' + i + '">' + avatar(r.nama, r.foto) + '<div class="mid"><div style="font-weight:600">' + esc(r.nama) + (r.statusSantri === 'Cuti' ? ' <span class="badge b-warn">Cuti</span>' : '') + '</div><div style="font-size:12px;color:var(--muted-on-dark)">NIS ' + esc(r.nis) + (r.sudahSetor ? ' • ✓ sudah setor' : '') + '</div>' +
            (s !== 'Hadir' ? '<input class="inp" data-ket style="height:36px;margin-top:6px;background:#26272B;border-color:#3A3B40;color:#fff" placeholder="Keterangan ' + s.toLowerCase() + ' (opsional)" value="' + esc(r.keterangan || '') + '">' : '') + '</div>' +
            '<div class="att-btns" role="radiogroup" aria-label="Status ' + esc(r.nama) + '">' + Object.keys(KODE).map(k => '<button class="' + KODE[k] + (s === k ? ' on' : '') + '" data-s="' + k + '" role="radio" aria-checked="' + (s === k) + '" title="' + k + '">' + KODE[k] + '</button>').join('') + '</div></div>';
        }).join('') : g.UI.empty('Tidak ada santri aktif di halaqah ini.', 'users');
        ringkas();
      }
      function muat() {
        if (!st.halaqah) { $('#p-rows', root).innerHTML = g.UI.empty('Anda belum memegang halaqah.', 'users'); return; }
        swr('presensi:' + st.halaqah + ':' + st.tanggal, 'presensi.get', { halaqahId: st.halaqah, tanggal: st.tanggal }, { maxAge: 15000, render: (d) => {
          if (!d || st.ubah) return;
          st.rows = d.rows.map(r => Object.assign({}, r, { status: r.status || 'Hadir' })); st.tercatat = d.tercatat; render();
        } });
      }
      $('#p-rows', root).onclick = (e) => {
        const b = e.target.closest('[data-s]'); if (!b) return;
        const i = Number(b.closest('[data-i]').dataset.i); st.rows[i].status = b.dataset.s; st.ubah = true; render();
        if (b.dataset.s !== 'Hadir') { const inp = $$('[data-i="' + i + '"] [data-ket]', root)[0]; if (inp) inp.focus(); }
      };
      $('#p-rows', root).oninput = (e) => { if (!e.target.matches('[data-ket]')) return; st.rows[Number(e.target.closest('[data-i]').dataset.i)].keterangan = e.target.value; st.ubah = true; };
      $('#p-semua', root).onclick = () => { st.rows.forEach(r => { r.status = 'Hadir'; r.keterangan = ''; }); st.ubah = true; render(); };
      $('#p-simpan', root).onclick = async (e) => {
        if (!st.rows.length) return;
        e.target.disabled = true;
        try {
          const r = await Outbox.kirim('presensi.save', { halaqahId: st.halaqah, tanggal: st.tanggal, items: st.rows.map(x => ({ santriId: x.id, status: x.status || 'Hadir', keterangan: x.keterangan || '' })) }, 'Presensi ' + fmt.tgl(st.tanggal));
          toast(r.message || 'Presensi tersimpan.', r.queued ? 'warn' : r.success ? 'ok' : 'err', 5000);
          if (r.success) { st.ubah = false; st.tercatat = true; swrHapus('presensi:' + st.halaqah); swrHapus('dash'); render(); }
        } catch (er) { toast(er.message, 'err'); } finally { e.target.disabled = false; }
      };
      const ganti = async () => { if (st.ubah && !(await g.UI.konfirmasi('Perubahan presensi belum disimpan. Lanjutkan tanpa menyimpan?', { ya: 'Lanjutkan' }))) return false; st.ubah = false; return true; };
      if ($('#p-hq', root)) $('#p-hq', root).onchange = async (e) => { const v = e.target.value; if (!(await ganti())) { e.target.value = st.halaqah; return; } st.halaqah = v; muat(); };
      $('#p-tgl', root).onchange = async (e) => { const v = e.target.value; if (!(await ganti())) { e.target.value = st.tanggal; return; } st.tanggal = v || hari; muat(); };
      ctx.halaman.segarkan = muat;
      muat();
    }
  };
})(window);
