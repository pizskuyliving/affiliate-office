import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { DATA } from './config.ts'

// Satu proyek = satu produk outfit (atasan, bawahan, atau set) yang dijadikan video.
export const TAHAP = ['analisis', 'sutradara', 'storyboard', 'menunggu-klip', 'editor', 'selesai'] as const
export type Tahap = (typeof TAHAP)[number]
export type Status = 'antre' | 'proses' | 'tunggu' | 'gagal' | 'selesai'

export type Input = { nama: string; harga: string; link: string; info: string; foto: string[] }
export type Proyek = {
  id: number
  tahap: Tahap
  status: Status
  percobaan: number
  galat: string
  input: Input
  /** hasil tiap tahap, kuncinya nama tahap */
  data: Record<string, any>
  dibuat: string
  diubah: string
}

const db = new DatabaseSync(join(DATA, 'office.db'))
db.exec(`PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS proyek (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tahap TEXT NOT NULL,
  status TEXT NOT NULL,
  percobaan INTEGER NOT NULL DEFAULT 0,
  galat TEXT NOT NULL DEFAULT '',
  input TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  dibuat TEXT NOT NULL DEFAULT (datetime('now')),
  diubah TEXT NOT NULL DEFAULT (datetime('now'))
)`)

const baca = (r: any): Proyek => ({ ...r, input: JSON.parse(r.input), data: JSON.parse(r.data) })

export function buatProyek(input: Input): number {
  const r = db.prepare(`INSERT INTO proyek (tahap, status, input) VALUES ('analisis', 'antre', ?)`).run(JSON.stringify(input))
  return Number(r.lastInsertRowid)
}

export function ambil(id: number): Proyek | undefined {
  const r = db.prepare('SELECT * FROM proyek WHERE id = ?').get(id)
  return r ? baca(r) : undefined
}

export function semua(): Proyek[] {
  return db.prepare('SELECT * FROM proyek ORDER BY id DESC LIMIT 200').all().map(baca)
}

export function berikutnya(): Proyek | undefined {
  const r = db.prepare(`SELECT * FROM proyek WHERE status = 'antre' ORDER BY diubah, id LIMIT 1`).get()
  return r ? baca(r) : undefined
}

export function simpan(p: Pick<Proyek, 'id'> & Partial<Proyek>) {
  const lama = ambil(p.id)
  if (!lama) throw new Error(`proyek ${p.id} tidak ada`)
  const b = { ...lama, ...p }
  db.prepare(`UPDATE proyek SET tahap = ?, status = ?, percobaan = ?, galat = ?, input = ?, data = ?, diubah = datetime('now') WHERE id = ?`).run(
    b.tahap, b.status, b.percobaan, b.galat, JSON.stringify(b.input), JSON.stringify(b.data), b.id,
  )
}

/** Proyek yang tertinggal di status 'proses' (server mati di tengah jalan) dikembalikan ke antrean. */
export function pulihkan() {
  db.prepare(`UPDATE proyek SET status = 'antre' WHERE status = 'proses'`).run()
}
