import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { folderProyek } from '../config.ts'
import type { Proyek } from '../db.ts'
import { jalankanPython } from '../proses.ts'
import { TEMPLATE } from '../template.ts'
import { susunPrompt, type HasilSutradara } from './sutradara.ts'

const jam = (d: number) => `0:${String(Math.floor(d)).padStart(2, '0')}${d % 1 ? `.${Math.round((d % 1) * 10)}` : ''}`

/** Render storyboard.png dan tulis prompt Flow (langkah 1 & 2) ke prompt.txt. */
export async function storyboard(p: Proyek) {
  const f = folderProyek(p.id)
  const s = p.data.sutradara as HasilSutradara
  const kartu = p.data.analisis.produk
  const foto: { file: string; isi: string }[] = p.data.analisis.foto
  // atasan dulu (paling penting untuk print), lalu bawahan
  const urut = [...foto].sort((a, b) => (a.isi === 'atasan' ? -1 : 0) - (b.isi === 'atasan' ? -1 : 0))
  const t = TEMPLATE[s.template]
  const aturan = [
    'frame mulai dari leher, mulut & dagu tidak terlihat',
    s.subjek.atasan && `atasan: ${s.subjek.atasan}`,
    s.subjek.bawahan && `bawahan: ${s.subjek.bawahan}`,
    `sepatu: ${s.subjek.sepatu}, tanpa logo merek`,
    'kamera diam · maksimal 2 tangan · tanpa teks tambahan · sketsa hanya penanda posisi, buat orang realistis',
  ].filter(Boolean).join(' · ')
  await jalankanPython('storyboard.py', {
    judul: `Storyboard · ${t.nama}`,
    sub: `${kartu.nama_pendek} · 10 detik · 9:16`,
    foto: urut.slice(0, 3).map((x) => join(f, 'foto', x.file)),
    atas: { hex: kartu.atasan?.warna_hex, print: kartu.atasan?.print_posisi, ada: !!kartu.atasan },
    bawah: { hex: kartu.bawahan?.warna_hex, ada: !!kartu.bawahan },
    panel: t.panel.map((pt, i) => ({ no: i + 1, waktu: `${jam(pt.mulai)} – ${jam(pt.selesai)}`, label: pt.label, deskripsi: s.panel[i].deskripsi, kamera: pt.kamera, pose: pt.pose })),
    aturan,
    keluar: join(f, 'storyboard.png'),
  })
  const prompt = susunPrompt(s, urut.map((x) => x.file))
  writeFileSync(join(f, 'prompt.txt'), `=== PENGATURAN ===\n${prompt.pengaturan}\n\n=== LANGKAH 1 (gratis): gambar frame awal di Nano Banana ===\n${prompt.langkah1}\n\n=== LANGKAH 2: video ===\n${prompt.langkah2}\n`)
  return { file: 'storyboard.png', prompt, fotoUrut: urut.map((x) => x.file) }
}
