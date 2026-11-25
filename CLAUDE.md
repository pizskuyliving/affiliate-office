# Affiliate Office

Pipeline video affiliate fashion TikTok (bahasa Indonesia) dari foto produk: storyboard + prompt Google Flow otomatis,
klip dibuat pemilik di Flow, lalu diedit otomatis jadi 3 varian siap posting.
Pemilik: Pizskuy. Kode, komentar, dan pesan commit memakai Bahasa Indonesia.

## Alur kerja
- Edit di laptop → `npm run cek` → commit → `git push origin main` → di server `sudo affiliate-update`.
- Server: `/opt/affiliate-office`, layanan systemd `affiliate-office`, port 3100 (127.0.0.1), akses lewat Caddy + basic auth.
- Uji lokal tanpa Claude: `npm run dev` (CLAUDE_MODE=contoh, jawaban dari `contoh/*.json`).

## Susunan
- Tanpa dependensi npm saat jalan: Node 22 (`--experimental-strip-types`, `node:sqlite`, `node:http`) + Python 3 (Pillow, numpy) + ffmpeg + Chrome.
- `src/server.ts`: dashboard (form produk, paket Flow, upload klip, unduh video) + orchestrator.
- `src/orchestrator.ts`: satu pekerja, satu proyek dalam satu waktu. Tahap: analisis → sutradara → storyboard → menunggu-klip (manual) → editor → selesai.
- `src/agen/analisis.ts`: Claude melihat foto → kotak potong bersih + kartu produk. `render/rapikan.py` memotong.
- `src/agen/sutradara.ts`: Claude memilih template, mengisi 6 panel, 3 hook, kartu, CTA, caption. Prompt Flow disusun di kode (`susunPrompt`).
- `src/template.ts`: template faceless try-on (print_depan, print_belakang, polos), 6 panel 10 detik.
- `render/storyboard.py`: HTML → PNG lewat Chrome. `render/outfit.py`: editor gaya clean (teks per kata, punch-in, kartu produk, CTA, musik sementara).
- `src/claude.ts`: `claude -p` dengan skema JSON (pola office lama), pemeriksa kecil pengganti zod.

## Aturan pemilik (wajib)
- **Klaim produk:** hanya dari foto/label/info penjual. Tanpa pengalaman pribadi palsu. Visual realistis.
- **Format video:** 9:16, faceless (frame mulai dari leher), sepatu tanpa logo merek, maksimal 2 tangan, tanpa teks buatan AI.
- **Zona aman TikTok:** teks di y 300–1240 (dari 1920), x ≥ 80 dan tidak di 150 px kanan. Zoom klip ≤ 6% (pelajaran posting pertama 25 Nov 2026: teks tertutup tombol "Lihat Produk", print menempel bar pencarian).
- **Label AI:** setiap posting ditandai konten AI. **Bos:** pemilik menyetujui sebelum posting.
- **Kunci dan rahasia:** jangan pernah meminta atau menulis rahasia (.env, password Caddy, token). Pemilik mengetiknya sendiri di server.
- **Repo publik:** jangan commit `data/`, foto produk, klip, atau video.
- **Commit:** author `Pizskuy <pizskuyliving@gmail.com>`. Jangan menulis nama atau versi model di file repo.

## Status
- 25 Nov 2026: Fase 1 jalan (uji lokal mode contoh dengan produk SHIFT: storyboard, prompt, 3 varian video ±15 dtk). Belum dites di VPS dengan `claude -p` sungguhan.
- Fase 2: QC klip otomatis (Claude vision), paket posting + saran sound mingguan. Fase 3: analis performa.
- Riwayat keputusan: `docs/catatan-proyek.md`.
