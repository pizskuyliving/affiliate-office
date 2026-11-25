import { spawn } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import { CLAUDE_MODE, CONTOH_DIR } from './config.ts'

// Pola sama dengan ai-virtual-office: `claude -p` dengan login Pro/Max, output JSON sesuai skema.
// Mode 'contoh' membaca jawaban dari CONTOH_DIR/<nama>.json supaya alur bisa diuji tanpa memanggil Claude.

type Tanya = {
  nama: string
  sistem: string
  pesan: string
  skema: Record<string, unknown>
  gambar?: string[]
  effort?: 'low' | 'medium' | 'high'
}

const namaGambar = (f: string, i: number) => `g${i + 1}${extname(f).toLowerCase() || '.jpg'}`

export async function tanyaClaude<T>(t: Tanya, periksa: (x: any) => T): Promise<T> {
  const mentah = CLAUDE_MODE === 'contoh' ? JSON.parse(readFileSync(join(CONTOH_DIR, `${t.nama}.json`), 'utf8')) : await lewatCli(t)
  return periksa(mentah)
}

async function lewatCli(t: Tanya): Promise<unknown> {
  const folder = mkdtempSync(join(tmpdir(), 'affiliate-'))
  const alat = t.gambar?.length ? ['Read'] : []
  const args = ['-p', '--output-format', 'json', '--json-schema', JSON.stringify(t.skema),
    '--system-prompt', `${t.sistem}\n\nJawaban akhir harus sesuai skema JSON yang diminta.`, '--tools', alat.join(','), '--strict-mcp-config']
  if (process.env.CLAUDE_CLI_MODEL) args.push('--model', process.env.CLAUDE_CLI_MODEL)
  if (alat.length) args.push('--allowedTools', ...alat)
  if (t.effort) args.push('--effort', t.effort)
  t.gambar?.forEach((f, i) => copyFileSync(f, join(folder, namaGambar(f, i))))
  const pesan = t.gambar?.length ? `Baca dan lihat dulu semua gambar ini dengan alat Read: ${t.gambar.map(namaGambar).join(', ')}.\n\n${t.pesan}` : t.pesan
  const keluaran = await new Promise<string>((selesai, gagal) => {
    const p = spawn(process.env.CLAUDE_BIN || 'claude', args, { cwd: folder, shell: false, timeout: 15 * 60_000 })
    let out = ''
    let err = ''
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (err += d))
    p.on('error', gagal)
    p.on('close', (kode, sinyal) => (kode === 0 ? selesai(out) : gagal(new Error(`claude keluar dengan kode ${kode ?? sinyal}: ${(err.trim() || out.trim()).slice(-500)}`))))
    p.stdin.end(pesan)
  }).finally(() => rmSync(folder, { recursive: true, force: true }))
  const hasil = JSON.parse(keluaran)
  if (hasil.is_error) throw new Error(`claude -p gagal: ${String(hasil.result).slice(0, 500)}`)
  if (hasil.structured_output) return hasil.structured_output
  const m = String(hasil.result).match(/\{[\s\S]*\}/)
  if (!m) throw new Error('jawaban Claude tidak berisi JSON')
  return JSON.parse(m[0])
}

// ---------- pemeriksa kecil (pengganti zod, supaya tanpa dependensi) ----------
export function teks(x: unknown, nama: string, maks = 400): string {
  if (typeof x !== 'string' || !x.trim()) throw new Error(`${nama} harus teks`)
  return x.trim().slice(0, maks)
}
export function pilihan<T extends string>(x: unknown, nama: string, opsi: readonly T[]): T {
  if (!opsi.includes(x as T)) throw new Error(`${nama} harus salah satu dari ${opsi.join(', ')}`)
  return x as T
}
export function daftar<T>(x: unknown, nama: string, min: number, maks: number, f: (v: unknown, i: number) => T): T[] {
  if (!Array.isArray(x) || x.length < min) throw new Error(`${nama} minimal ${min} item`)
  return x.slice(0, maks).map(f)
}
export function angka01(x: unknown, nama: string): number {
  const n = Number(x)
  if (!Number.isFinite(n)) throw new Error(`${nama} harus angka`)
  return Math.min(1, Math.max(0, n))
}
export function hex(x: unknown, cadangan: string): string {
  return typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x) ? x : cadangan
}
