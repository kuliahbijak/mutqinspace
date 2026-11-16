/* =================================================================
   MutqinSpace — komponen bersama halaman:
   baris setoran (panel gelap), panel detail slate, peta 30 juz, KPI bulanan.
   ================================================================= */
(function (g) {
  'use strict';
  const { icon, esc, avatar, fmt, predKelas, grade, track, toast, modal, $, h } = g.UI;
  const { apiData, swr } = g.Core;
  const K = g.Komp = {};

  K.barisSetoran = function (s, sel) {
    const ayat = s.namaSurah + ' ' + s.a1 + '–' + s.a2;
    return '<button class="row ' + (sel ? 'sel ' : '') + (s.pending ? 'pending' : '') + '" data-id="' + esc(s.id) + '">' + avatar(s.santri, s.foto) +
      '<div class="mid"><div class="t1"><span class="id">#' + esc(s.nis || s.santriId) + '</span> • ' + esc(s.santri) + '</div>' +
      '<div class="t2">' + esc(ayat) + ' • Juz ' + esc(s.juz) + ' • ' + (s.pending ? 'menunggu sinkron' : esc(fmt.rel(s.dibuat || s.tanggal))) + '</div></div>' +
      '<div class="rt"><span class="pred ' + (sel ? 'white' : predKelas(s.pred)) + '">' + esc(sel ? s.jenis : (s.pred || s.jenis)) + '</span><span class="score">' + esc(s.nilai === '' ? '–' : fmt.n(s.nilai)) + '</span></div></button>';
  };

  /** Panel slate detail setoran (dipakai dashboard, halaman setoran, portal wali). */
  K.detailSetoran = function (el, s, opsi) {
    opsi = opsi || {};
    if (!s) { el.innerHTML = '<div class="slate">' + g.UI.empty('Pilih setoran di daftar untuk melihat detail mutaba\'ah.', 'book') + '</div>'; return; }
    const gt = grade(s.tajwid), gk = grade(s.kelancaran), staf = g.App.staf();
    const ayatN = Number(s.a2) - Number(s.a1) + 1;
    el.innerHTML = '<div class="slate"><div class="slate-top"><div><div class="eyebrow">Detail Mutaba\'ah Setoran</div><h2>#' + esc(s.id) + ' <span class="pred white" style="font-size:13px">' + esc(s.jenis) + '</span></h2>' +
      '<div class="hq">Halaqah: ' + esc(s.halaqah || '-') + ' ' + icon('check', 'sm') + '</div></div>' +
      '<div class="teacher">' + avatar(s.muhaffidz || '?', s.mhfFoto, 'sm') + '<div><div class="n">' + esc(s.muhaffidz || '-') + '</div><div class="r">Muhaffidz Halaqah</div></div></div></div>' +
      '<hr class="hr"><div class="who">' + avatar(s.santri, s.foto, 'lg') + '<div style="min-width:0"><div class="n">' + esc(s.santri) + '</div><div class="s">NIS: ' + esc(s.nis || '-') + ' • ' + esc(fmt.tglPanjang(s.tanggal)) + ' <span data-target></span></div></div></div>' +
      '<div class="subcards"><div class="sc"><div class="h">Surah &amp; Ayat ' + (staf ? '<a href="#/santri/' + esc(s.santriId) + '" title="Buka profil santri">' + icon('ext', 'sm') + '</a>' : '') + '</div><div><div class="v">' + esc(s.namaSurah + ' ' + s.a1 + '–' + s.a2) + '</div><div class="d">Juz ' + esc(s.juz) + ' • ±' + fmt.n(s.vol, 2) + ' halaman</div></div></div>' +
      '<div class="sc"><div class="h">Nilai Tajwid ' + (gt ? '<span class="grade ' + gt[1] + '">' + gt[0] + '</span>' : '') + '</div><div><div class="v">' + esc(s.predT || '-') + ' (' + fmt.n(s.tajwid) + ')</div><div class="d">Makhraj, sifat & hukum bacaan</div></div></div>' +
      '<div class="sc"><div class="h">Kelancaran ' + (gk ? '<span class="grade ' + gk[1] + '">' + gk[0] + '</span>' : '') + '</div><div><div class="v">' + esc(s.predK || '-') + ' (' + fmt.n(s.kelancaran) + ')</div><div class="d">Ta\'tsir, waqaf & ibtida\'</div></div></div>' +
      (staf && s.bisaEdit ? '<button class="addcard" data-act="catatan"><span class="plus">+</span>' + (s.catatan ? 'Ubah Catatan' : 'Catatan Evaluasi') + '</button>' : '<div class="addcard" style="cursor:default"><span class="plus">' + icon('book', 'sm') + '</span>' + (s.catatan ? 'Ada catatan guru' : 'Tanpa catatan') + '</div>') + '</div>' +
      (s.catatan ? '<div class="note-q"><b>Catatan muhaffidz:</b> ' + esc(s.catatan) + '</div>' : '') +
      '<hr class="hr"><div class="slate-foot"><div class="stats3"><div><div class="k">Kuantitas</div><div class="v">' + ayatN + ' Ayat</div></div><div><div class="k">Nilai rata-rata</div><div class="v">' + fmt.n(s.nilai) + ' / 100</div></div>' +
      '<div><div class="k">Sisa target</div><div class="v" data-sisa>…</div></div></div><div class="row-flex">' +
      '<button class="ibtn slate" data-act="cetak" title="Unduh rekap bulanan PDF">' + icon('printer') + '</button>' +
      (staf && s.bisaEdit ? '<button class="ibtn slate" data-act="edit" title="Koreksi setoran">' + icon('edit') + '</button>' : '') +
      (staf ? '<button class="btn btn-lime" data-act="wali">Kirim ke Wali ' + icon('phone') + '</button>' : '') + '</div></div></div>';
    // sisa target (dari profil santri, di-cache)
    swr('profil:' + s.santriId, 'santri.profil', { santriId: s.santriId }, { maxAge: 300000, onError: () => { },
      render: (p) => {
        const sisa = el.querySelector('[data-sisa]'), tg = el.querySelector('[data-target]');
        if (!sisa || !p) return;
        const t = p.target;
        sisa.textContent = t && t.ada ? (t.sisaHal ? fmt.n(t.sisaHal) + ' Halaman' : Math.round(t.pct * 100) + '%') : '–';
        if (tg && t && t.ada) tg.textContent = '• Target: ' + t.label;
      } });
    el.onclick = async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'wali') { b.disabled = true; try { const r = await g.Core.api('setoran.kirimWali', { id: s.id }); toast(r.message, r.success ? 'ok' : 'err', 5000); } finally { b.disabled = false; } }
      if (act === 'cetak') { b.disabled = true; try { const d = await apiData('rekap.santri', { santriId: s.santriId, bulan: String(s.tanggal).substring(0, 7) }); g.UI.unduhBase64(d.nama, d.mime, d.base64); } catch (er) { toast(er.message, 'err'); } finally { b.disabled = false; } }
      if (act === 'edit') K.editSetoran(s, opsi.onUbah);
      if (act === 'catatan') K.editSetoran(s, opsi.onUbah, true);
    };
  };

  K.editSetoran = function (s, onUbah, hanyaCatatan) {
    const opsiSurah = g.QURAN.surah.map((x, i) => '<option value="' + (i + 1) + '"' + (i + 1 === Number(s.surah) ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(x[0]) + '</option>').join('');
    const body = hanyaCatatan ? '<label class="field"><span>Catatan evaluasi untuk wali</span><textarea class="inp" name="catatan" maxlength="1000" placeholder="Mis. tawaqquf ayat 9, perkuat murojaah ba\'da Maghrib">' + esc(s.catatan || '') + '</textarea></label>'
      : '<div class="form-grid"><label class="field"><span>Tanggal</span><input class="inp" type="date" name="tanggal" value="' + esc(s.tanggal) + '" max="' + fmt.today() + '"></label><label class="field"><span>Jenis</span><select class="inp" name="jenis"><option' + (s.jenis === 'Ziyadah' ? ' selected' : '') + '>Ziyadah</option><option' + (s.jenis === 'Murojaah' ? ' selected' : '') + '>Murojaah</option></select></label>' +
        '<label class="field full"><span>Surah</span><select class="inp" name="surah">' + opsiSurah + '</select></label><label class="field"><span>Ayat dari</span><input class="inp" type="number" min="1" name="ayatDari" value="' + esc(s.a1) + '"></label><label class="field"><span>Ayat sampai</span><input class="inp" type="number" min="1" name="ayatSampai" value="' + esc(s.a2) + '"></label>' +
        '<label class="field"><span>Nilai tajwid (0–100)</span><input class="inp" type="number" min="0" max="100" name="tajwid" value="' + esc(s.tajwid) + '"></label><label class="field"><span>Nilai kelancaran (0–100)</span><input class="inp" type="number" min="0" max="100" name="kelancaran" value="' + esc(s.kelancaran) + '"></label>' +
        '<label class="field full"><span>Catatan</span><textarea class="inp" name="catatan" maxlength="1000">' + esc(s.catatan || '') + '</textarea></label></div><p class="muted" style="font-size:12px">Setiap koreksi tercatat di log aktivitas.</p>';
    modal({ title: hanyaCatatan ? 'Catatan evaluasi' : 'Koreksi setoran #' + s.id, body,
      actions: [].concat(g.App.mudir() && !hanyaCatatan ? [{ label: 'Hapus', cls: 'btn-danger', icon: 'trash', fn: async () => { if (!(await g.UI.konfirmasi('Hapus setoran ' + s.id + '? Tindakan ini tercatat di log.', { bahaya: true, ya: 'Hapus' }))) return false; await apiData('setoran.hapus', { id: s.id }); toast('Setoran dihapus.'); g.Core.swrHapus(); if (onUbah) onUbah(null); } }] : [])
        .concat([{ label: 'Batal' }, { label: 'Simpan', cls: 'btn-lime', fn: async (b) => {
          const f = g.UI.formData(b), data = Object.assign({ id: s.id }, f);
          if (!hanyaCatatan) { const e = g.QURAN.cekAyat(f.surah, f.ayatDari, f.ayatSampai); if (e) throw new Error(e); }
          const d = await apiData('setoran.update', data); toast('Setoran diperbarui.'); g.Core.swrHapus('setoran'); g.Core.swrHapus('dash'); g.Core.swrHapus('profil:' + s.santriId); if (onUbah) onUbah(d);
        } }]) });
  };

  /** Peta hafalan 30 juz. */
  K.petaJuz = function (peta, opsi) {
    opsi = opsi || {};
    return '<div class="juzgrid">' + peta.map(j => {
      const st = j.status, pct = Math.round(j.hafal * 100);
      return '<div class="juz ' + st + (opsi.aktif === j.juz ? ' aktif' : '') + '" title="Juz ' + j.juz + ': ' + esc(j.label) + ' — hafal ' + pct + '%, mutqin ' + Math.round(j.mutqin * 100) + '%">' +
        '<div class="h"><span>' + String(j.juz).padStart(2, '0') + '</span>' + (st === 'mutqin' ? icon('checkc', 'sm') : st === 'sedang' ? '<small style="font-size:10.5px;font-weight:800">' + pct + '%</small>' : '') + '</div>' +
        '<div><div class="lb">' + esc(j.label) + '</div>' + (st !== 'belum' ? track(pct) : '') + '<div class="st">' + (st === 'mutqin' ? 'Mutqin' : st === 'sedang' ? (j.mutqin > 0 ? 'Murojaah ' + Math.round(j.mutqin * 100) + '%' : 'Ziyadah') : 'Belum mulai') + '</div></div></div>';
    }).join('') + '</div>';
  };

  /** Bar progres bulanan berarsir + kluster avatar muhaffidz. */
  K.bulanan = function (bulan, stafById) {
    return '<div class="months">' + bulan.map((b, i) => {
      const av = (b.muhaffidz || []).slice(0, 3).map(id => { const u = stafById(id) || { nama: '?' }; return avatar(u.nama, u.foto, 'xs'); }).join('');
      return '<div><div class="mh"><span class="' + (i === bulan.length - 1 ? 'now' : '') + '">' + esc(b.label) + (i === bulan.length - 1 ? ' <span class="dot"></span>' : '') + '</span><span>' + fmt.n(b.pct, 0) + '%</span></div>' + track(b.pct) +
        '<div class="avs">' + av + '<span class="more">' + (b.muhaffidz || []).length + ' Ust.</span></div></div>';
    }).join('') + '</div>';
  };
})(window);
