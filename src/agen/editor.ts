import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { folderProyek } from '../config.ts'
import type { Proyek } from '../db.ts'
import { jalankanPython } from '../proses.ts'
import { TEMPLATE, type Pose } from '../template.ts'
import type { HasilSutradara } from './sutradara.ts'

const JUMLAH_VARIAN = Math.max(1, Math.min(3, Number(process.env.JUMLAH_VARIAN || 3)))

// Gaya potongan per pose: durasi di video jadi, zoom, dan perlambatan. Zoom kecil (≤6%) supaya outfit tetap utuh
// dan print tidak menempel ke bar pencarian TikTok (pelajaran posting pertama, 25 Nov 2026).
const GAYA: Record<Pose, { durasi: number; zoom: number; akhir: number; cy: number; ramp?: boolean }> = {
  depan: { durasi: 1.5, zoom: 1.02, akhir: 1.05, cy: 0.5 },
  kerah: { durasi: 1.5, zoom: 1.06, akhir: 1.06, cy: 0.45 },
  ujung: { durasi: 1.5, zoom: 1.04, akhir: 1.06, cy: 0.5 },
  samping: { durasi: 1.5, zoom: 1.02, akhir: 1.02, cy: 0.5 },
  melangkah: { durasi: 2.0, zoom: 1.02, akhir: 1.06, cy: 0.5, ramp: true },
  belakang: { durasi: 2.0, zoom: 1.02, akhir: 1.06, cy: 0.5 },
  closeup: { durasi: 1.5, zoom: 1.0, akhir: 1.06, cy: 0.5 },
  saku: { durasi: 1.5, zoom: 1.02, akhir: 1.05, cy: 0.5 },
}

export function rencanaEdit(s: HasilSutradara, fotoKartu: string[], varian: number) {
  const t = TEMPLATE[s.template]
  const isi = t.panel.slice(0, 5)
  const segmen = isi.map((pt, i) => {
    const g = GAYA[pt.pose]
    const panjang = pt.selesai - pt.mulai - 0.1
    return {
      mulai: pt.mulai + 0.05,
      rate: Math.min(pt.pose === 'closeup' ? 0.85 : 1, panjang / g.durasi),
      durasi: g.durasi,
      zoom: g.zoom,
      zoom_akhir: g.akhir,
      cy: g.cy,
      ramp: !!g.ramp,
      kicker: s.panel[i].kicker,
      judul: s.panel[i].judul,
      posisi: 'bawah',
    }
  })
  const hp = t.panel[t.hook]
  const close = t.panel.find((x) => x.pose === 'closeup') ?? hp
  const akhir = t.panel[5]
  const hook = s.hook[(varian - 1) % s.hook.length]
  return {
    hook: { mulai: hp.mulai + 0.05, rate: 0.45, durasi: 1.5, zoom0: 1.2, zoom1: 1.08, cy: 0.42, baris: hook },
    segmen,
    kartu: { durasi: s.kartu.chips.length > 2 ? 2.5 : 2.0, bg_mulai: close.mulai, foto: fotoKartu, nama: s.kartu.nama, sub: s.kartu.sub, chips: s.kartu.chips, kicker: 'SET OUTFIT' },
    cta: { mulai: akhir.mulai + 0.1, rate: 0.5, durasi: 3.0, baris: s.cta, kicker: 'TERSEDIA SEKARANG' },
  }
}

export async function editor(p: Proyek) {
  const f = folderProyek(p.id)
  const klip = join(f, p.data.klip?.file ?? 'klip.mp4')
  if (!existsSync(klip)) throw new Error('klip belum diupload')
  const s = p.data.sutradara as HasilSutradara
  const fotoKartu = (p.data.storyboard.fotoUrut as string[]).slice(0, 2).map((x) => join(f, 'foto', x))
  const video: { file: string; hook: string[]; sampul: string; durasi: number }[] = []
  const jumlah = Math.min(JUMLAH_VARIAN, s.hook.length)
  for (let v = 1; v <= jumlah; v++) {
    const rencana = rencanaEdit(s, fotoKartu, v)
    const file = `video-${v}.mp4`
    const sampul = `sampul-${v}.jpg`
    const out = await jalankanPython('outfit.py', { klip, keluar: join(f, file), sampul: join(f, sampul), ...rencana }, 30)
    const durasi = Number(JSON.parse(out.trim().split('\n').pop() || '{}').durasi || 0)
    video.push({ file, hook: rencana.hook.baris, sampul, durasi })
  }
  return { video, caption: s.caption, hashtag: s.hashtag }
}
