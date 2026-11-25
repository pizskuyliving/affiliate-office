import { daftar, pilihan, tanyaClaude, teks } from '../claude.ts'
import type { Proyek } from '../db.ts'
import { KODE_TEMPLATE, TEMPLATE, type Template } from '../template.ts'

// Sutradara: memilih template, mengisi 6 panel storyboard, hook, teks layar, kartu produk, caption.
// Prompt Google Flow disusun di kode (aturan yang sudah teruji), bukan ditulis bebas oleh Claude.

const baris = { type: 'array', items: { type: 'string' } }
const SKEMA = {
  type: 'object',
  properties: {
    template: { type: 'string', enum: KODE_TEMPLATE },
    panel: {
      type: 'array',
      items: { type: 'object', properties: { deskripsi: { type: 'string' }, kicker: { type: 'string' }, judul: baris }, required: ['deskripsi', 'kicker', 'judul'] },
    },
    hook: { type: 'array', items: baris },
    kartu: { type: 'object', properties: { nama: { type: 'string' }, sub: { type: 'string' }, chips: baris }, required: ['nama', 'sub', 'chips'] },
    cta: baris,
    caption: { type: 'string' },
    hashtag: baris,
    subjek: {
      type: 'object',
      properties: { atasan: { type: 'string' }, bawahan: { type: 'string' }, sepatu: { type: 'string' } },
      required: ['atasan', 'bawahan', 'sepatu'],
    },
  },
  required: ['template', 'panel', 'hook', 'kartu', 'cta', 'caption', 'hashtag', 'subjek'],
}

const daftarTemplate = KODE_TEMPLATE.map((k) => {
  const t = TEMPLATE[k]
  return `- ${k} (${t.kapan}). Panel: ${t.panel.map((p, i) => `${i + 1}. ${p.label} (${p.mulai}-${p.selesai} dtk): ${p.aksi}`).join(' ')}`
}).join('\n')

const SISTEM = `Kamu sutradara video affiliate fashion TikTok (bahasa Indonesia santai, akun kebutuhan sehari-hari & outfit cowok).
Format video: "faceless try-on" 10 detik dari Google Flow, frame mulai dari leher (wajah tidak terlihat), kamera diam, karpet bundar di studio polos.
Pilih SATU template:
${daftarTemplate}

Isi tepat 6 panel sesuai urutan template:
- deskripsi: arahan adegan untuk AI video, sebut warna/print produk secara spesifik (mis. "print SHIFT merah di dada").
- kicker: label kecil HURUF BESAR 1-3 kata (mis. "OUTFIT CHECK", "DETAIL", "SIDE VIEW").
- judul: 1-2 baris teks layar, maks 20 karakter per baris, santai, rapi, tanpa emoji.
Teks panel terakhir (DEPAN LAGI) tidak ditampilkan (diganti CTA), boleh diisi apa saja.
hook: 3 varian, masing-masing 2-3 baris maks 18 karakter per baris. Hook memancing rasa penasaran atau relate, bukan klaim kualitas.
kartu: nama produk singkat (maks 22 karakter), sub (maks 26 karakter), 3 chips fakta pendek (maks 24 karakter) HANYA dari kartu produk/info penjual.
cta: 2 baris, ajak cek ukuran & harga di keranjang kuning.
caption: 2-3 baris santai + ajakan cek keranjang kuning. hashtag: 5-8 tanpa tanda #.
subjek: deskripsi pakaian untuk prompt AI, sangat spesifik dan setia pada foto (warna, potongan, print dan posisinya).
Isi atasan/bawahan dengan "" jika tidak ada. sepatu: sneakers polos tanpa logo merek yang serasi dengan outfit.
Aturan jujur: jangan menulis pengalaman pribadi ("aku udah pakai"), jangan klaim bahan/ukuran/kualitas yang tidak ada di data, jangan menyebut merek lain.`

export async function sutradara(p: Proyek) {
  const kartu = p.data.analisis.produk
  return tanyaClaude(
    {
      nama: 'sutradara',
      sistem: SISTEM,
      pesan: `Kartu produk:\n${JSON.stringify(kartu, null, 2)}\n\nNama dari penjual: ${p.input.nama}\nHarga: ${p.input.harga || '-'}\nInfo tambahan dari pemilik: ${p.input.info || '-'}`,
      skema: SKEMA,
      effort: 'medium',
    },
    periksa,
  )
}

const pendek = (maks: number) => (v: unknown, i: number) => teks(v, `baris ${i + 1}`, maks)

export function periksa(x: any) {
  const template = pilihan(x?.template, 'template', KODE_TEMPLATE) as Template['kode']
  const panel = daftar(x?.panel, 'panel', 6, 6, (v: any, i) => ({
    deskripsi: teks(v?.deskripsi, `panel ${i + 1}.deskripsi`, 500),
    kicker: teks(v?.kicker || 'DETAIL', `panel ${i + 1}.kicker`, 24).toUpperCase(),
    judul: daftar(v?.judul, `panel ${i + 1}.judul`, 1, 2, pendek(26)),
  }))
  return {
    template,
    panel,
    hook: daftar(x?.hook, 'hook', 1, 3, (v) => daftar(v, 'hook', 1, 3, pendek(22))),
    kartu: {
      nama: teks(x?.kartu?.nama, 'kartu.nama', 26),
      sub: teks(x?.kartu?.sub || ' ', 'kartu.sub', 32),
      chips: daftar(x?.kartu?.chips, 'kartu.chips', 1, 3, pendek(28)),
    },
    cta: daftar(x?.cta, 'cta', 1, 2, pendek(26)),
    caption: teks(x?.caption, 'caption', 600),
    hashtag: daftar(x?.hashtag, 'hashtag', 1, 8, (v) => teks(v, 'hashtag', 40).replace(/^#/, '').replace(/\s+/g, '')),
    subjek: {
      atasan: String(x?.subjek?.atasan ?? '').slice(0, 600),
      bawahan: String(x?.subjek?.bawahan ?? '').slice(0, 600),
      sepatu: teks(x?.subjek?.sepatu || 'sneakers polos tanpa logo merek', 'subjek.sepatu', 200),
    },
  }
}

export type HasilSutradara = ReturnType<typeof periksa>

/** Prompt Google Flow: langkah 1 (gambar frame awal, Nano Banana) dan langkah 2 (video, Omni 1.2 Flash 10 detik). */
export function susunPrompt(s: HasilSutradara, foto: string[]) {
  const t = TEMPLATE[s.template]
  const pakaian = [s.subjek.atasan && `Atasan: ${s.subjek.atasan}`, s.subjek.bawahan && `Bawahan: ${s.subjek.bawahan}`, `Sepatu: ${s.subjek.sepatu}, sama di semua adegan.`]
    .filter(Boolean)
    .join('\n')
  const langkah1 = `Lampirkan: ${foto.join(', ')}

Buat foto realistis vertikal 9:16 seorang pria muda berpostur sedang berdiri tegak menghadap kamera di tengah karpet bundar hitam bergaris tepi putih, di studio minimalis berdinding abu-abu terang dengan rak baju polos di belakang (tanpa logo, tanpa nama toko, tanpa tulisan).
Frame dimulai dari LEHER sampai kaki: wajah, mulut, dan dagu TIDAK terlihat sama sekali.
Pakaian harus SAMA PERSIS dengan foto referensi:
${pakaian}
Pencahayaan lembut dan rata. Tanpa teks tambahan, watermark, atau label marketplace.`

  const adegan = t.panel.map((p, i) => `${i + 1}. (${p.mulai}–${p.selesai} dtk) ${s.panel[i].deskripsi}`).join('\n')
  const langkah2 = `Lampirkan: storyboard.png + gambar terbaik dari langkah 1 + ${foto[0]}

Gunakan storyboard terlampir sebagai rencana adegan, gambar frame awal sebagai awal video, dan foto produk sebagai referensi utama pakaian. Sketsa orang di storyboard hanya penanda posisi: buat orang yang REALISTIS.

Buat video affiliate fashion 10 detik, vertikal 9:16, gaya "outfit try-on" yang rapi dan realistis. Kamera DIAM (tripod), kecuali adegan close-up. Frame selalu dimulai dari leher: wajah, mulut, dan dagu TIDAK PERNAH terlihat.
${adegan}

Aturan wajib:
${pakaian}
- Jangan ubah tulisan, warna, bentuk, atau posisi print. Pakaian tidak berganti atau berubah selama video.
- Sepatu polos tanpa logo merek apa pun.
- Maksimal dua tangan. Tangan dan jari normal.
- JANGAN menampilkan teks tambahan, watermark, label, panah, garis putus-putus, atau anotasi dari storyboard.
- Tanpa suara orang berbicara.`
  return { langkah1, langkah2, pengaturan: 'Google Flow · Video · Omni 1.2 Flash · 9:16 · 10 detik · x1 (±30 kredit)' }
}
