# Affiliate Office

Pipeline video affiliate TikTok/Shopee (bahasa Indonesia) dari foto produk.
Pemilik: Pizskuy. Kode, komentar, dan pesan commit memakai Bahasa Indonesia.
Kerangka meniru `pizskuyliving/ai-virtual-office` (orchestrator antrean SQLite, `tanyaClaude`, dashboard kantor, satpam, skrip deploy).

## Pembagian kerja
- Claude (`claude -p`, login Pro): analisis produk, naskah, prompt Google Flow, caption, QC klip (melihat grid frame), arahan edit.
- Pemilik di Google Flow: membuat gambar dan klip dari prompt. Tahap ini **manual** (status tunggu di dashboard).
  Jangan mengotomatiskan browser atau memakai API tidak resmi untuk Flow.
- Kokoro (Docker di VPS, `127.0.0.1:8880`): voiceover. Kokoro belum punya suara bahasa Indonesia, jadi teks diubah ejaannya
  (`src/suara/ejaan.ts`) dan dibacakan suara Spanyol/Italia. Pilihan suara menunggu hasil `skrip/tes-suara-id.ts`.
- Remotion: merakit video 1080x1920.

## Rencana tahap
produk → analis-produk → naskah → prompt-flow → menunggu-flow (manual) → qc-klip → suara → editor → varian → bos (manual) → posting

## Aturan pemilik (wajib)
- **Klaim produk:** hanya dari label atau deskripsi resmi produk. Visual hasil harus realistis, tidak melebih-lebihkan.
- **QC klip:** bentuk, warna, dan logo produk sama dengan foto asli; maksimal dua tangan per orang; tidak ada kepulan/belepotan produk.
- **Format:** vertikal 9:16, durasi 13–30 detik. Audio asli klip dimatikan (diganti voiceover).
- **Label AI:** setiap posting ditandai sebagai konten AI.
- **Bos:** setiap video disetujui di dashboard sebelum diposting.
- **Kunci dan rahasia:** jangan pernah meminta atau menulis rahasia (.env, `rahasia/`, token, kunci SSH). Pemilik mengetiknya sendiri di server.
- **Repo publik:** jangan commit data produk pribadi, rekaman suara, atau isi `data/`/`out/`.
- **Commit:** author `Pizskuy <pizskuyliving@gmail.com>`. Jangan menulis nama atau versi model di file repo.
- Cek tipe sebelum commit: `npx tsc --noEmit -p .`

## Status
- 23 Nov 2026: fondasi + uji dengar suara Kokoro untuk bahasa Indonesia. Pipeline belum dibangun.
- Riwayat keputusan: `docs/catatan-proyek.md`.
