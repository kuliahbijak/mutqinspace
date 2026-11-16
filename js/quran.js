/* MutqinSpace — data Al-Qur'an (dibangkitkan dari backend/Quran.gs oleh tools/build-quran.js — jangan diedit manual) */
(function (g) {

// [nama surah, jumlah ayat] — indeks 0 = surah ke-1
const DATA_SURAH = [
  ['Al-Fatihah', 7], ['Al-Baqarah', 286], ["Ali 'Imran", 200], ["An-Nisa'", 176], ["Al-Ma'idah", 120],
  ["Al-An'am", 165], ["Al-A'raf", 206], ['Al-Anfal', 75], ['At-Taubah', 129], ['Yunus', 109],
  ['Hud', 123], ['Yusuf', 111], ["Ar-Ra'd", 43], ['Ibrahim', 52], ['Al-Hijr', 99],
  ['An-Nahl', 128], ["Al-Isra'", 111], ['Al-Kahf', 110], ['Maryam', 98], ['Taha', 135],
  ["Al-Anbiya'", 112], ['Al-Hajj', 78], ["Al-Mu'minun", 118], ['An-Nur', 64], ['Al-Furqan', 77],
  ["Asy-Syu'ara'", 227], ['An-Naml', 93], ['Al-Qasas', 88], ["Al-'Ankabut", 69], ['Ar-Rum', 60],
  ['Luqman', 34], ['As-Sajdah', 30], ['Al-Ahzab', 73], ["Saba'", 54], ['Fatir', 45],
  ['Yasin', 83], ['As-Saffat', 182], ['Sad', 88], ['Az-Zumar', 75], ['Gafir', 85],
  ['Fussilat', 54], ['Asy-Syura', 53], ['Az-Zukhruf', 89], ['Ad-Dukhan', 59], ['Al-Jasiyah', 37],
  ['Al-Ahqaf', 35], ['Muhammad', 38], ['Al-Fath', 29], ['Al-Hujurat', 18], ['Qaf', 45],
  ['Az-Zariyat', 60], ['At-Tur', 49], ['An-Najm', 62], ['Al-Qamar', 55], ['Ar-Rahman', 78],
  ["Al-Waqi'ah", 96], ['Al-Hadid', 29], ['Al-Mujadilah', 22], ['Al-Hasyr', 24], ['Al-Mumtahanah', 13],
  ['As-Saff', 14], ["Al-Jumu'ah", 11], ['Al-Munafiqun', 11], ['At-Tagabun', 18], ['At-Talaq', 12],
  ['At-Tahrim', 12], ['Al-Mulk', 30], ['Al-Qalam', 52], ['Al-Haqqah', 52], ["Al-Ma'arij", 44],
  ['Nuh', 28], ['Al-Jinn', 28], ['Al-Muzzammil', 20], ['Al-Muddassir', 56], ['Al-Qiyamah', 40],
  ['Al-Insan', 31], ['Al-Mursalat', 50], ["An-Naba'", 40], ["An-Nazi'at", 46], ["'Abasa", 42],
  ['At-Takwir', 29], ['Al-Infitar', 19], ['Al-Mutaffifin', 36], ['Al-Insyiqaq', 25], ['Al-Buruj', 22],
  ['At-Tariq', 17], ["Al-A'la", 19], ['Al-Gasyiyah', 26], ['Al-Fajr', 30], ['Al-Balad', 20],
  ['Asy-Syams', 15], ['Al-Lail', 21], ['Ad-Duha', 11], ['Asy-Syarh', 8], ['At-Tin', 8],
  ["Al-'Alaq", 19], ['Al-Qadr', 5], ['Al-Bayyinah', 8], ['Az-Zalzalah', 8], ["Al-'Adiyat", 11],
  ["Al-Qari'ah", 11], ['At-Takasur', 8], ["Al-'Asr", 3], ['Al-Humazah', 9], ['Al-Fil', 5],
  ['Quraisy', 4], ["Al-Ma'un", 7], ['Al-Kausar', 3], ['Al-Kafirun', 6], ['An-Nasr', 3],
  ['Al-Lahab', 5], ['Al-Ikhlas', 4], ['Al-Falaq', 5], ['An-Nas', 6]
];

// Awal setiap juz: [surah, ayat] — indeks 0 = juz 1
const DATA_JUZ = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1]
];

const HALAMAN_PER_JUZ = 20;   // estimasi standar mushaf 15 baris (604 halaman)
let _Q = null;

/** Bangun indeks global ayat (1..6236) sekali per eksekusi. */
function Q_() {
  if (_Q) return _Q;
  const off = [0], total = [];
  let g = 0;
  DATA_SURAH.forEach(function (s, i) { off[i + 1] = g; g += s[1]; });
  const juzAwal = DATA_JUZ.map(function (j) { return off[j[0]] + j[1]; });          // global index awal juz
  const juzAyat = juzAwal.map(function (a, i) { return (i < 29 ? juzAwal[i + 1] : g + 1) - a; });
  // bobot halaman kumulatif: tiap ayat = 20 / jumlah ayat di juznya
  const W = new Float64Array(g + 1);
  let j = 0;
  for (let k = 1; k <= g; k++) {
    while (j < 29 && k >= juzAwal[j + 1]) j++;
    W[k] = W[k - 1] + HALAMAN_PER_JUZ / juzAyat[j];
  }
  _Q = { off: off, total: g, juzAwal: juzAwal, juzAyat: juzAyat, W: W };
  return _Q;
}

function namaSurah_(s) { const d = DATA_SURAH[Number(s) - 1]; return d ? d[0] : ''; }
function jumlahAyat_(s) { const d = DATA_SURAH[Number(s) - 1]; return d ? d[1] : 0; }
function gIdx_(s, a) { return Q_().off[Number(s)] + Number(a); }

/** Juz dari indeks global. */
function juzG_(g) {
  const ja = Q_().juzAwal;
  let lo = 0, hi = 29;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ja[m] <= g) lo = m; else hi = m - 1; }
  return lo + 1;
}
function juzOf_(s, a) { return juzG_(gIdx_(s, a)); }

/** Estimasi jumlah halaman untuk rentang ayat dalam satu surah. */
function halaman_(s, a1, a2) {
  const q = Q_(), g1 = gIdx_(s, a1), g2 = gIdx_(s, a2);
  if (!(g2 >= g1)) return 0;
  return Math.round((q.W[g2] - q.W[g1 - 1]) * 100) / 100;
}

/** Rentang global [awal, akhir] sebuah juz. */
function rentangJuz_(j) {
  const q = Q_();
  return [q.juzAwal[j - 1], j < 30 ? q.juzAwal[j] - 1 : q.total];
}

/** Label surah pertama–terakhir dalam juz, mis. "Al-Mulk – Al-Mursalat". */
function labelJuz_(j) {
  const a = DATA_JUZ[j - 1], b = j < 30 ? DATA_JUZ[j] : [114, 6];
  const akhirSurah = b[1] === 1 ? b[0] - 1 : b[0];
  return namaSurah_(a[0]) + (akhirSurah !== a[0] ? ' – ' + namaSurah_(akhirSurah) : '');
}

/** Validasi rentang ayat (FR-13). Mengembalikan pesan galat atau ''. */
function cekAyat_(s, a1, a2) {
  s = Number(s); a1 = Number(a1); a2 = Number(a2);
  if (!(s >= 1 && s <= 114) || Math.floor(s) !== s) return 'Surah tidak valid.';
  const n = jumlahAyat_(s);
  if (!(a1 >= 1) || Math.floor(a1) !== a1) return 'Ayat awal tidak valid.';
  if (!(a2 >= a1) || Math.floor(a2) !== a2) return 'Ayat akhir harus ≥ ayat awal.';
  if (a2 > n) return 'Surah ' + namaSurah_(s) + ' hanya ' + n + ' ayat.';
  return '';
}

// ---------------- Operasi interval (cakupan hafalan) ----------------
/** Gabungkan interval [[a,b],...] yang tumpang tindih/bersebelahan. */
function gabungInterval_(list) {
  if (!list || !list.length) return [];
  const s = list.filter(function (x) { return x && x[1] >= x[0]; }).sort(function (x, y) { return x[0] - y[0]; });
  const out = [];
  s.forEach(function (x) {
    const last = out[out.length - 1];
    if (last && x[0] <= last[1] + 1) { if (x[1] > last[1]) last[1] = x[1]; } else out.push([x[0], x[1]]);
  });
  return out;
}
function tambahInterval_(list, a, b) { list.push([a, b]); return gabungInterval_(list); }

/** Jumlah ayat dari interval yang jatuh di rentang [lo, hi]. */
function cakupan_(list, lo, hi) {
  let n = 0;
  (list || []).forEach(function (x) { const a = Math.max(x[0], lo), b = Math.min(x[1], hi); if (b >= a) n += b - a + 1; });
  return n;
}
/** Irisan dua daftar interval. */
function irisanInterval_(A, B) {
  const out = []; let i = 0, j = 0;
  A = A || []; B = B || [];
  while (i < A.length && j < B.length) {
    const a = Math.max(A[i][0], B[j][0]), b = Math.min(A[i][1], B[j][1]);
    if (b >= a) out.push([a, b]);
    if (A[i][1] < B[j][1]) i++; else j++;
  }
  return out;
}
/** Halaman (estimasi) dari daftar interval. */
function halamanInterval_(list) {
  const W = Q_().W; let h = 0;
  (list || []).forEach(function (x) { h += W[x[1]] - W[x[0] - 1]; });
  return Math.round(h * 100) / 100;
}
/** Serialisasi interval ke teks "a-b,c-d" (untuk disimpan di sheet). */
function intervalKeTeks_(list) { return (list || []).map(function (x) { return x[0] === x[1] ? String(x[0]) : x[0] + '-' + x[1]; }).join(','); }
function teksKeInterval_(t) {
  const out = [];
  String(t || '').split(',').forEach(function (p) {
    const m = p.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (m) out.push([Number(m[1]), Number(m[2] || m[1])]);
  });
  return gabungInterval_(out);
}
/** Ringkasan manusiawi interval → "Juz 29–30, Al-Baqarah 1–20". */
function ringkasInterval_(list) {
  const juzPenuh = [], sisa = [];
  for (let j = 1; j <= 30; j++) {
    const r = rentangJuz_(j);
    if (cakupan_(list, r[0], r[1]) === r[1] - r[0] + 1) juzPenuh.push(j);
  }
  const bagian = [];
  let i = 0;
  while (i < juzPenuh.length) {
    let k = i; while (k + 1 < juzPenuh.length && juzPenuh[k + 1] === juzPenuh[k] + 1) k++;
    bagian.push(i === k ? 'Juz ' + juzPenuh[i] : 'Juz ' + juzPenuh[i] + '–' + juzPenuh[k]);
    i = k + 1;
  }
  const n = cakupan_(list, 1, Q_().total);
  const nPenuh = juzPenuh.reduce(function (t, j) { const r = rentangJuz_(j); return t + r[1] - r[0] + 1; }, 0);
  if (n > nPenuh) sisa.push('+' + (n - nPenuh) + ' ayat');
  return bagian.concat(sisa).join(', ') || '-';
}

g.QURAN = { surah: DATA_SURAH, juzAwal: DATA_JUZ, nama: namaSurah_, ayat: jumlahAyat_, juzOf: juzOf_, halaman: halaman_, labelJuz: labelJuz_, cekAyat: cekAyat_, rentangJuz: rentangJuz_ };
})(window);
