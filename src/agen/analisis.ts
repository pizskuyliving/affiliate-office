import { join } from 'node:path'
import { angka01, daftar, hex, pilihan, tanyaClaude, teks } from '../claude.ts'
import { folderProyek } from '../config.ts'
import type { Proyek } from '../db.ts'
import { jalankanPython } from '../proses.ts'

// Analis: melihat foto/screenshot produk, menentukan area produk yang bersih (tanpa status bar HP, label
// marketplace, watermark toko, sepatu bermerek), lalu menulis kartu produk. Foto dipotong dengan render/rapikan.py.

const JENIS = ['atasan', 'bawahan', 'set', 'lain'] as const
const PRINT = ['depan', 'belakang', 'depan_belakang', 'polos'] as const

const kotakSkema = { type: 'object', properties: { x0: { type: 'number' }, y0: { type: 'number' }, x1: { type: 'number' }, y1: { type: 'number' } }, required: ['x0', 'y0', 'x1', 'y1'] }
const pakaianSkema = {
  type: ['object', 'null'],
  properties: {
    deskripsi: { type: 'string' }, warna: { type: 'string' }, warna_hex: { type: 'string' }, potongan: { type: 'string' },
    print_posisi: { type: 'string', enum: PRINT }, print_deskripsi: { type: 'string' },
  },
  required: ['deskripsi', 'warna', 'warna_hex', 'potongan', 'print_posisi', 'print_deskripsi'],
}
const SKEMA = {
  type: 'object',
  properties: {
    foto: {
      type: 'array',
      items: {
        type: 'object',
        properties: { indeks: { type: 'integer' }, isi: { type: 'string', enum: JENIS }, kotak: kotakSkema, pakai: { type: 'boolean' }, catatan: { type: 'string' } },
        required: ['indeks', 'isi', 'kotak', 'pakai', 'catatan'],
      },
    },
    produk: {
      type: 'object',
      properties: {
        nama_pendek: { type: 'string' },
        jenis: { type: 'string', enum: ['atasan', 'bawahan', 'set'] },
        atasan: pakaianSkema,
        bawahan: pakaianSkema,
        bahan_tertulis: { type: 'array', items: { type: 'string' } },
        risiko: { type: 'array', items: { type: 'string' } },
      },
      required: ['nama_pendek', 'jenis', 'atasan', 'bawahan', 'bahan_tertulis', 'risiko'],
    },
  },
  required: ['foto', 'produk'],
}

const SISTEM = `Kamu analis produk fashion untuk video affiliate TikTok. Kamu melihat foto atau screenshot produk dari marketplace.
Tugas 1: untuk setiap gambar, tentukan kotak area produk yang bersih dalam pecahan 0..1 (x0,y0 kiri-atas; x1,y1 kanan-bawah).
Kotak harus MEMBUANG: status bar HP, tombol aplikasi, latar hitam di luar foto, label/stiker marketplace ("Bayar di tempat", "Free ongkir", logo toko, watermark), teks promosi.
Untuk celana/bawahan yang dipakai model dengan sepatu bermerek: potong di atas sepatu (pergelangan kaki).
Boleh tetap memuat nama produk yang tercetak di pakaiannya. Set pakai=false untuk gambar yang tidak berguna (tabel ukuran, duplikat).
Tugas 2: tulis kartu produk HANYA dari yang terlihat di gambar atau info penjual. Jangan mengarang bahan, ukuran, atau klaim.
print_deskripsi: jelaskan isi print persis (tulisan, warna, gambar), atau "polos". warna_hex: perkiraan warna utama kain.
risiko: hal yang perlu dijaga di video AI, misalnya logo merek lain di sepatu, tulisan kecil di print, detail jahitan.
Isi atasan/bawahan dengan null jika produk tidak punya bagian itu.`

export async function analisis(p: Proyek) {
  const f = folderProyek(p.id)
  const foto = p.input.foto.map((n) => join(f, 'foto', n))
  const hasil = await tanyaClaude(
    {
      nama: 'analisis',
      sistem: SISTEM,
      pesan: `Gambar produk: ${foto.map((_, i) => `g${i + 1}`).join(', ')}.\nNama dari penjual: ${p.input.nama}\nHarga: ${p.input.harga || '-'}\nInfo tambahan dari pemilik: ${p.input.info || '-'}\nIndeks gambar dimulai dari 0 (g1 = indeks 0).`,
      skema: SKEMA,
      gambar: foto,
      effort: 'medium',
    },
    periksa,
  )
  const potong = hasil.foto.filter((x) => x.pakai && x.indeks < foto.length)
  if (!potong.length) throw new Error('tidak ada foto produk yang bisa dipakai')
  const keluar = potong.map((x, i) => ({ masuk: foto[x.indeks], keluar: join(f, 'foto', `rapi-${i + 1}.jpg`), kotak: x.kotak, isi: x.isi }))
  await jalankanPython('rapikan.py', { foto: keluar })
  return { produk: hasil.produk, foto: keluar.map((k) => ({ file: k.keluar.split('/').pop()!, isi: k.isi })) }
}

function periksaPakaian(x: any, nama: string) {
  if (x == null) return null
  return {
    deskripsi: teks(x.deskripsi, `${nama}.deskripsi`, 600),
    warna: teks(x.warna, `${nama}.warna`, 80),
    warna_hex: hex(x.warna_hex, '#444444'),
    potongan: teks(x.potongan, `${nama}.potongan`, 120),
    print_posisi: pilihan(x.print_posisi, `${nama}.print_posisi`, PRINT),
    print_deskripsi: teks(x.print_deskripsi || 'polos', `${nama}.print_deskripsi`, 400),
  }
}

export function periksa(x: any) {
  const foto = daftar(x?.foto, 'foto', 1, 12, (v: any) => {
    const k = v?.kotak ?? {}
    let [x0, y0, x1, y1] = [angka01(k.x0, 'x0'), angka01(k.y0, 'y0'), angka01(k.x1, 'x1'), angka01(k.y1, 'y1')]
    if (x1 - x0 < 0.1 || y1 - y0 < 0.1) [x0, y0, x1, y1] = [0, 0, 1, 1]
    return { indeks: Number(v.indeks) | 0, isi: pilihan(v.isi, 'isi', JENIS), kotak: { x0, y0, x1, y1 }, pakai: v.pakai !== false, catatan: String(v.catatan ?? '') }
  })
  const pr = x?.produk ?? {}
  const produk = {
    nama_pendek: teks(pr.nama_pendek, 'nama_pendek', 60),
    jenis: pilihan(pr.jenis, 'jenis', ['atasan', 'bawahan', 'set'] as const),
    atasan: periksaPakaian(pr.atasan, 'atasan'),
    bawahan: periksaPakaian(pr.bawahan, 'bawahan'),
    bahan_tertulis: Array.isArray(pr.bahan_tertulis) ? pr.bahan_tertulis.map(String).slice(0, 6) : [],
    risiko: Array.isArray(pr.risiko) ? pr.risiko.map(String).slice(0, 8) : [],
  }
  if (!produk.atasan && !produk.bawahan) throw new Error('kartu produk kosong: atasan dan bawahan null')
  return { foto, produk }
}
