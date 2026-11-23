# Affiliate Office

Kantor AI untuk membuat video affiliate TikTok/Shopee dari foto produk: naskah dan prompt oleh Claude,
klip dibuat di Google Flow, voiceover Kokoro, dirakit dengan Remotion.

## Uji suara (langkah pertama)

Kokoro harus bisa dijangkau di `http://127.0.0.1:8880` (container `kokoro` di VPS).

```bash
npm install
npm run tes-suara
# atau naskah sendiri:
npx tsx skrip/tes-suara-id.ts "Rambut lepek? Tabur dikit, langsung ngangkat."
```

Hasil: `out/tes-suara/*.mp3` dan `out/tes-suara/dengar.html`.

Menjalankan dari laptop dengan Kokoro di VPS:

```bash
ssh -N -L 8880:127.0.0.1:8880 <user>@<vps>   # biarkan terbuka di terminal lain
npm run tes-suara
```

Lihat `CLAUDE.md` untuk aturan dan rencana tahap, `docs/catatan-proyek.md` untuk riwayat keputusan.
