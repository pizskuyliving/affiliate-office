// Uji dengar: naskah bahasa Indonesia dibacakan beberapa suara Kokoro, dengan ejaan asli dan ejaan yang
// disesuaikan (src/suara/ejaan.ts). Hasilnya mp3 + halaman dengar.html untuk dibandingkan dan dipilih.
//
// Jalankan di tempat yang bisa menjangkau Kokoro (bawaan http://127.0.0.1:8880):
//   npx tsx skrip/tes-suara-id.ts
//   npx tsx skrip/tes-suara-id.ts "kalimat sendiri"            (ganti naskah uji)
//   SUARA=em_alex,im_nicola npx tsx skrip/tes-suara-id.ts      (pilih suara)
//
// Dari laptop, Kokoro di VPS bisa dijangkau lewat terowongan SSH, lalu skrip dijalankan di laptop:
//   ssh -N -L 8880:127.0.0.1:8880 <user>@<vps>

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { bahasaSuara, ejaanKokoro } from '../src/suara/ejaan.ts'

const URL_KOKORO = process.env.KOKORO_URL || 'http://127.0.0.1:8880'
const KELUAR = process.env.KELUAR || 'out/tes-suara'

// Pria dan wanita per bahasa. Suara Inggris hanya pembanding.
const SUARA_BAWAAN = ['em_alex', 'ef_dora', 'im_nicola', 'if_sara', 'pm_alex', 'pf_dora', 'am_fenrir']

const NASKAH_BAWAAN =
  'Rambut lepek tiap siang? Sama, gue juga dulu gitu. ' +
  'Sekarang tinggal tabur dikit hair powder di jari, usek ke akar rambut, langsung ngangkat. ' +
  'Volume dapet, matte, nggak lengket. Cek keranjang kuning, mumpung harganya lagi murah!'

const KODE_BAHASA: Record<string, string> = { a: 'a', b: 'b', e: 'e', f: 'f', h: 'h', i: 'i', j: 'j', p: 'p', z: 'z' }

/** Daftar suara Kokoro. null = daftar tidak terbaca (tetap dicoba semua). Lempar error kalau Kokoro tidak terjangkau. */
async function daftarSuara(): Promise<Set<string> | null> {
  let r: Response
  try {
    r = await fetch(`${URL_KOKORO}/v1/audio/voices`, { signal: AbortSignal.timeout(15_000) })
  } catch (e) {
    const sebab = e instanceof Error ? ((e.cause as Error | undefined)?.message ?? e.message) : String(e)
    throw new Error(
      `Kokoro tidak terjangkau di ${URL_KOKORO} (${sebab}).\n` +
        '- Pastikan jendela PowerShell dengan perintah "ssh -N -L 8880:127.0.0.1:8880 ..." masih terbuka.\n' +
        '- Kalau masih terbuka, cek container di VPS: sudo docker ps (harus ada "kokoro").',
    )
  }
  const teks = await r.text()
  if (!r.ok) {
    console.warn(`Daftar suara tidak bisa diambil (HTTP ${r.status}): ${teks.slice(0, 200)}. Semua suara tetap dicoba.`)
    return null
  }
  try {
    const j = JSON.parse(teks) as { voices?: unknown } | unknown[]
    const daftar = Array.isArray(j) ? j : j.voices
    if (Array.isArray(daftar)) return new Set(daftar.map((v) => (typeof v === 'string' ? v : String((v as { name?: unknown }).name ?? v))))
  } catch {
    // format tidak dikenal, lanjut di bawah
  }
  console.warn(`Format daftar suara tidak dikenal: ${teks.slice(0, 200)}. Semua suara tetap dicoba.`)
  return null
}

async function bacakan(suara: string, teks: string): Promise<Buffer> {
  const r = await fetch(`${URL_KOKORO}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'kokoro',
      input: teks,
      voice: suara,
      response_format: 'mp3',
      speed: Number(process.env.KECEPATAN || 1),
      lang_code: KODE_BAHASA[suara[0]],
      stream: false,
    }),
    signal: AbortSignal.timeout(180_000),
  })
  if (!r.ok) throw new Error(`Kokoro ${r.status}: ${(await r.text()).slice(0, 300)}`)
  return Buffer.from(await r.arrayBuffer())
}

const escHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

async function main() {
  const naskah = process.argv[2] || NASKAH_BAWAAN
  const diminta = (process.env.SUARA || SUARA_BAWAAN.join(',')).split(',').map((s) => s.trim()).filter(Boolean)

  let ada: Set<string> | null
  try {
    ada = await daftarSuara()
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  }
  const suara = ada ? diminta.filter((s) => ada.has(s)) : diminta
  const hilang = ada ? diminta.filter((s) => !ada.has(s)) : []
  if (hilang.length) console.warn(`Dilewati, tidak ada di Kokoro: ${hilang.join(', ')}`)

  mkdirSync(KELUAR, { recursive: true })
  const baris: string[] = []
  let no = 0
  for (const s of suara) {
    const bahasa = bahasaSuara(s)
    const versi: [string, string][] = [['asli', naskah]]
    if (bahasa !== 'polos') versi.push(['ejaan', ejaanKokoro(naskah, bahasa)])
    for (const [mode, teks] of versi) {
      no++
      const nama = `${String(no).padStart(2, '0')}-${s}-${mode}.mp3`
      try {
        writeFileSync(join(KELUAR, nama), await bacakan(s, teks))
        console.log(`✓ ${nama}`)
        baris.push(`<tr><td>${no}</td><td>${s}</td><td>${mode}</td><td><audio controls preload="none" src="${nama}"></audio></td><td><small>${escHtml(teks)}</small></td></tr>`)
      } catch (e) {
        console.error(`✗ ${nama}: ${e instanceof Error ? e.message : e}`)
      }
    }
  }

  const html = `<!doctype html><meta charset="utf-8"><title>Uji suara Kokoro (Indonesia)</title>
<style>body{font-family:system-ui;margin:24px;background:#111;color:#eee}td{padding:6px 10px;border-bottom:1px solid #333;vertical-align:middle}small{color:#aaa}</style>
<h2>Uji suara Kokoro untuk naskah Indonesia</h2><p>Dengarkan, lalu catat nomor yang paling natural.</p>
<table><tr><th>#</th><th>Suara</th><th>Ejaan</th><th>Dengar</th><th>Teks yang dikirim</th></tr>${baris.join('\n')}</table>`
  writeFileSync(join(KELUAR, 'dengar.html'), html)
  console.log(`\nSelesai. Buka ${join(KELUAR, 'dengar.html')} di browser.`)
}

main()
