import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { basename, extname, join } from 'node:path'
import { BATAS_UPLOAD, BIND, PORT, folderProyek } from './config.ts'
import { TAHAP, ambil, buatProyek, semua, simpan, type Tahap } from './db.ts'
import { halamanDaftar, halamanProyek } from './halaman.ts'
import { mulaiOrchestrator } from './orchestrator.ts'

// Dashboard tanpa dependensi (node:http). Server hanya mendengarkan 127.0.0.1; akses luar lewat Caddy + basic auth.

const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8' }

async function formulir(req: IncomingMessage): Promise<FormData> {
  const panjang = Number(req.headers['content-length'] || 0)
  if (panjang > BATAS_UPLOAD) throw new Error(`file terlalu besar (maks ${BATAS_UPLOAD / 1048576} MB)`)
  const r = new Request('http://lokal/', { method: 'POST', headers: req.headers as Record<string, string>, body: Readable.toWeb(req) as ReadableStream, duplex: 'half' } as RequestInit)
  return r.formData()
}

function kirim(res: ServerResponse, kode: number, isi: string, jenis = 'text/html; charset=utf-8') {
  res.writeHead(kode, { 'content-type': jenis, 'cache-control': 'no-store' })
  res.end(isi)
}
const alihkan = (res: ServerResponse, ke: string) => {
  res.writeHead(303, { location: ke })
  res.end()
}

function namaAman(n: string, cadangan: string) {
  const e = extname(n).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov'].includes(e) ? e : cadangan
}

async function tangani(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://lokal')
  const bagian = url.pathname.split('/').filter(Boolean)

  if (req.method === 'GET' && url.pathname === '/') return kirim(res, 200, halamanDaftar(semua()))

  if (req.method === 'POST' && url.pathname === '/baru') {
    const fd = await formulir(req)
    const file = fd.getAll('foto').filter((x): x is File => x instanceof File && x.size > 0)
    if (!file.length) return kirim(res, 400, 'Minimal satu foto produk.')
    const nama = String(fd.get('nama') || '').trim() || 'Produk tanpa nama'
    const id = buatProyek({ nama, harga: String(fd.get('harga') || ''), link: String(fd.get('link') || ''), info: String(fd.get('info') || ''), foto: [] })
    const f = folderProyek(id)
    const foto: string[] = []
    for (const [i, x] of file.slice(0, 8).entries()) {
      const n = `asli-${i + 1}${namaAman(x.name, '.jpg')}`
      writeFileSync(join(f, 'foto', n), Buffer.from(await x.arrayBuffer()))
      foto.push(n)
    }
    const p = ambil(id)!
    simpan({ id, input: { ...p.input, foto } })
    return alihkan(res, `/p/${id}`)
  }

  if (bagian[0] === 'p' && bagian[1]) {
    const id = Number(bagian[1])
    const p = ambil(id)
    if (!p) return kirim(res, 404, 'Proyek tidak ditemukan')
    if (req.method === 'GET' && bagian.length === 2) return kirim(res, 200, halamanProyek(p))

    if (req.method === 'POST' && bagian[2] === 'klip') {
      const fd = await formulir(req)
      const x = fd.get('klip')
      if (!(x instanceof File) || !x.size) return kirim(res, 400, 'Pilih file klip dari Google Flow.')
      const n = `klip${namaAman(x.name, '.mp4')}`
      writeFileSync(join(folderProyek(id), n), Buffer.from(await x.arrayBuffer()))
      simpan({ id, tahap: 'editor', status: 'antre', percobaan: 0, galat: '', data: { ...p.data, klip: { file: n, waktu: new Date().toISOString() } } })
      return alihkan(res, `/p/${id}`)
    }

    if (req.method === 'POST' && bagian[2] === 'ulang') {
      const fd = await formulir(req)
      const dari = String(fd.get('dari') || p.tahap) as Tahap
      if (!TAHAP.includes(dari) || dari === 'selesai') return kirim(res, 400, 'Tahap tidak dikenal')
      if (dari === 'editor' && !p.data.klip) return kirim(res, 400, 'Klip belum diupload')
      simpan({ id, tahap: dari, status: dari === 'menunggu-klip' ? 'tunggu' : 'antre', percobaan: 0, galat: '' })
      return alihkan(res, `/p/${id}`)
    }

    if (req.method === 'GET' && bagian[2] === 'f' && bagian[3]) {
      const sub = bagian[3] === 'foto' && bagian[4] ? join('foto', basename(bagian[4])) : basename(bagian[3])
      const file = join(folderProyek(id), sub)
      if (!existsSync(file)) return kirim(res, 404, 'File tidak ada')
      const unduh = url.searchParams.has('unduh')
      res.writeHead(200, {
        'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
        'content-length': statSync(file).size,
        ...(unduh ? { 'content-disposition': `attachment; filename="proyek${id}-${basename(file)}"` } : {}),
      })
      return createReadStream(file).pipe(res)
    }
  }
  kirim(res, 404, 'Halaman tidak ada')
}

createServer((req, res) => {
  tangani(req, res).catch((e) => {
    console.error(e)
    if (!res.headersSent) kirim(res, 500, `Terjadi kesalahan: ${e instanceof Error ? e.message : e}`)
  })
}).listen(PORT, BIND, () => console.log(`Affiliate Office di http://${BIND}:${PORT}`))

mulaiOrchestrator()
