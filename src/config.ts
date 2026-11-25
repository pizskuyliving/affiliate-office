import { existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Semua pengaturan lewat variabel lingkungan (.env dimuat systemd). Nilai bawaan cukup untuk laptop.
export const AKAR = resolve(import.meta.dirname, '..')
export const DATA = resolve(process.env.DATA_DIR || join(AKAR, 'data'))
export const PORT = Number(process.env.PORT || 3100)
export const BIND = process.env.BIND || '127.0.0.1'
export const PYTHON = process.env.PYTHON || 'python3'
export const FFMPEG = process.env.FFMPEG || 'ffmpeg'
export const FONT_DIR = process.env.FONT_DIR || '/usr/share/fonts/opentype/inter'
/** cli = `claude -p` (login Pro/Max), contoh = jawaban contoh dari CONTOH_DIR untuk uji tanpa Claude. */
export const CLAUDE_MODE = process.env.CLAUDE_MODE || 'cli'
export const CONTOH_DIR = process.env.CONTOH_DIR || join(AKAR, 'contoh')
export const BATAS_UPLOAD = Number(process.env.BATAS_UPLOAD_MB || 300) * 1024 * 1024

/** Chrome untuk merender storyboard. Di VPS bisa memakai chrome-headless-shell milik Remotion office lama. */
export function cariChrome(): string {
  const calon = [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/opt/ai-virtual-office/node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell',
  ].filter(Boolean) as string[]
  const ada = calon.find((c) => existsSync(c))
  if (!ada) throw new Error('Chrome tidak ditemukan. Isi CHROME_BIN di .env dengan path chrome/chromium.')
  return ada
}

export const folderProyek = (id: number) => {
  const f = join(DATA, 'proyek', String(id))
  mkdirSync(join(f, 'foto'), { recursive: true })
  return f
}
mkdirSync(DATA, { recursive: true })
