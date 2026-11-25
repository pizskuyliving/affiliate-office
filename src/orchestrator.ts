import { analisis } from './agen/analisis.ts'
import { editor } from './agen/editor.ts'
import { storyboard } from './agen/storyboard.ts'
import { sutradara } from './agen/sutradara.ts'
import { TAHAP, berikutnya, pulihkan, simpan, type Proyek, type Tahap } from './db.ts'

// Satu pekerja, satu proyek dalam satu waktu: VPS kecil (2 vCPU / 4 GB) juga menjalankan office lama.
// Tahap 'menunggu-klip' menunggu pemilik mengupload klip dari Google Flow lewat dashboard.

const AGEN: Partial<Record<Tahap, (p: Proyek) => Promise<unknown>>> = { analisis, sutradara, storyboard, editor }
const MAKS_COBA = 3
let jalan = false

export function mulaiOrchestrator() {
  pulihkan()
  setInterval(() => void putar(), 3000)
}

async function putar() {
  if (jalan) return
  const p = berikutnya()
  if (!p) return
  const agen = AGEN[p.tahap]
  if (!agen) return
  jalan = true
  simpan({ id: p.id, status: 'proses' })
  const mulai = Date.now()
  try {
    const hasil = await agen(p)
    const lanjut = TAHAP[TAHAP.indexOf(p.tahap) + 1]
    simpan({
      id: p.id,
      tahap: lanjut,
      status: lanjut === 'menunggu-klip' ? 'tunggu' : lanjut === 'selesai' ? 'selesai' : 'antre',
      percobaan: 0,
      galat: '',
      data: { ...p.data, [p.tahap]: hasil },
    })
    console.log(`[proyek ${p.id}] ${p.tahap} selesai dalam ${Math.round((Date.now() - mulai) / 1000)} dtk`)
  } catch (e) {
    const pesan = e instanceof Error ? e.message : String(e)
    const percobaan = p.percobaan + 1
    simpan({ id: p.id, status: percobaan >= MAKS_COBA ? 'gagal' : 'antre', percobaan, galat: pesan.slice(0, 2000) })
    console.error(`[proyek ${p.id}] ${p.tahap} gagal (${percobaan}/${MAKS_COBA}): ${pesan}`)
  } finally {
    jalan = false
  }
}
