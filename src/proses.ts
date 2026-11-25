import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AKAR, FFMPEG, FONT_DIR, PYTHON, cariChrome } from './config.ts'

/** Jalankan render/<skrip>.py dengan argumen JSON (lewat file sementara). */
export async function jalankanPython(skrip: string, argumen: unknown, batasMenit = 20): Promise<string> {
  const tmp = mkdtempSync(join(tmpdir(), 'aff-py-'))
  const file = join(tmp, 'arg.json')
  writeFileSync(file, JSON.stringify(argumen))
  let chrome = ''
  try {
    chrome = cariChrome()
  } catch {
    // hanya storyboard yang butuh Chrome; skrip itu akan memberi pesan sendiri
  }
  try {
    return await new Promise<string>((selesai, gagal) => {
      const p = spawn(PYTHON, ['-I', join(AKAR, 'render', skrip), file], {
        env: { ...process.env, FFMPEG, FONT_DIR, CHROME_BIN: chrome, PYTHONPATH: join(AKAR, 'render') },
        timeout: batasMenit * 60_000,
      })
      let out = ''
      let err = ''
      p.stdout.on('data', (d) => (out += d))
      p.stderr.on('data', (d) => (err += d))
      p.on('error', gagal)
      p.on('close', (kode) => (kode === 0 ? selesai(out) : gagal(new Error(`${skrip} gagal (${kode}): ${err.trim().slice(-800)}`))))
    })
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}
