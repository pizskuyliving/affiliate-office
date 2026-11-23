// Kokoro belum punya suara bahasa Indonesia. Akalnya: teks Indonesia dibacakan suara bahasa lain yang
// vokalnya mirip (Spanyol, Italia), setelah ejaannya diubah supaya dibaca seperti orang Indonesia.
// Contoh untuk suara Spanyol: "cek" → "chek", "jari" → "yari", "nyaman" → "ñaman", "khusus" → "jusus".
//
// Ini eksperimen. Hasilnya harus didengar dulu (skrip/tes-suara-id.ts) sebelum dipakai di pipeline.
// Teks hasil fungsi ini hanya dikirim ke Kokoro, tidak pernah dipakai untuk subtitle.

export type Bahasa = 'spanyol' | 'italia' | 'polos'

type Aturan = [RegExp, string]

const VOKAL = 'aiueoéè'

// Urutan penting: setiap aturan bekerja pada hasil aturan sebelumnya.
const SPANYOL: Aturan[] = [
  [/gu(?=[ei])/g, 'gü'], // gue → güe (tanpa ü, u-nya diam)
  [/g(?=[ei])/g, 'gu'], // gitu → guitu (g Spanyol sebelum e/i dibaca "kh")
  [/sy/g, 's'], // syarat → sarat (bahasa Spanyol tidak punya bunyi "sy")
  [/ny/g, 'ñ'], // nyaman → ñaman
  [/c/g, 'ch'], // cek → chek
  [/j/g, 'y'], // jari → yari (y Spanyol mendekati j Indonesia)
  [/kh/g, 'j'], // khusus → jusus (j Spanyol = bunyi kh)
  [new RegExp(`(^|[^a-zñ])h(?=[${VOKAL}])`, 'g'), '$1j'], // hari → jari (h di awal kata tidak boleh diam)
  [new RegExp(`([${VOKAL}])h(?=[${VOKAL}])`, 'g'), '$1j'], // tahu → taju
  [new RegExp(`w(?=[${VOKAL}])`, 'g'), 'u'], // wajah → uayah
  [/z/g, 's'],
  [/v/g, 'f'],
  [/q/g, 'k'],
  [/x/g, 'ks'],
]

const ITALIA: Aturan[] = [
  [/g(?=[ei])/g, 'gh'], // gigi → ghighi (supaya tetap "g" keras); harus sebelum aturan j
  [/sy/g, 'sci'], // syarat → sciarat
  [/ny/g, 'gn'], // nyaman → gnaman
  [/c(?=[aou])/g, 'ci'], // cara → ciara (c Italia sebelum e/i sudah dibaca "c" Indonesia)
  [/j(?=[aou])/g, 'gi'], // jari → giari
  [/j/g, 'g'], // jeli → geli
  [/kh/g, 'k'],
  [/y/g, 'i'],
  [new RegExp(`w(?=[${VOKAL}])`, 'g'), 'u'],
  [/z/g, 's'],
  [/q/g, 'k'],
  [/x/g, 'ks'],
]

const ATURAN: Record<Bahasa, Aturan[]> = { spanyol: SPANYOL, italia: ITALIA, polos: [] }

/** Huruf besar di awal kata dipertahankan supaya intonasi awal kalimat tetap terbaca. */
function ubahKata(kata: string, aturan: Aturan[]): string {
  const besar = kata[0] !== kata[0].toLowerCase()
  let k = kata.toLowerCase()
  for (const [pola, ganti] of aturan) k = k.replace(pola, ganti)
  return besar ? k[0].toUpperCase() + k.slice(1) : k
}

/** Ubah ejaan teks Indonesia untuk dibacakan suara Kokoro bahasa lain. Tanda baca dan spasi tidak diubah. */
export function ejaanKokoro(teks: string, bahasa: Bahasa): string {
  const aturan = ATURAN[bahasa]
  if (!aturan.length) return teks
  return teks.replace(/[A-Za-zÀ-ÿ]+/g, (kata) => ubahKata(kata, aturan))
}

/** Huruf awal nama suara Kokoro menentukan bahasanya: e = Spanyol, i = Italia, p = Portugis, a/b = Inggris. */
export function bahasaSuara(suara: string): Bahasa {
  if (suara.startsWith('e')) return 'spanyol'
  if (suara.startsWith('i')) return 'italia'
  return 'polos'
}
