# Affiliate Office

Kantor AI untuk video affiliate fashion TikTok: upload foto produk → storyboard + prompt Google Flow → upload klip Flow → 3 varian video siap posting.

## Coba di laptop (tanpa Claude)

Butuh Node 22.13+, Python 3 dengan Pillow dan numpy, ffmpeg, dan Chrome.

```bash
npm run dev          # mode contoh: jawaban Claude dari contoh/*.json
# buka http://127.0.0.1:3100
```

## Pasang di VPS

```bash
sudo git clone https://github.com/pizskuyliving/affiliate-office /opt/affiliate-office
sudo bash /opt/affiliate-office/deploy/pasang.sh <user-yang-sudah-login-claude>
sudo nano /opt/affiliate-office/.env      # cek CLAUDE_BIN dan CHROME_BIN
sudo systemctl restart affiliate-office
```

Lalu tambahkan blok di `deploy/Caddyfile.contoh` ke Caddy (buat hash password sendiri dengan `caddy hash-password`).
Update berikutnya: `sudo affiliate-update`.

## Cara pakai

1. **Produk baru**: upload foto/screenshot produk (boleh beberapa), isi nama, harga, info ukuran/bahan.
2. Tunggu ±1–3 menit: muncul **foto rapi, storyboard, dan prompt** langkah 1 & 2.
3. Di Google Flow: langkah 1 (gambar, gratis), langkah 2 (video Omni 1.2 Flash, 10 detik, ±30 kredit).
4. **Upload klip** di halaman proyek. Office mengedit 3 varian hook.
5. Unduh video, ganti musik dengan sound TikTok, tautkan keranjang kuning, aktifkan label konten AI, posting.

Lihat `CLAUDE.md` untuk susunan kode dan aturan, `docs/catatan-proyek.md` untuk riwayat keputusan.
