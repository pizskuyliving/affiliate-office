# Catatan proyek

## 23 Nov 2026: keputusan awal
- **Video dibuat di Google Flow** (Google AI Plus, rencana naik ke Pro ±Rp309–320 rb/bulan). Uji Kahf Hair Powder:
  gambar frame awal di Nano Banana (gratis) lalu Frames to Video. Satu video ±13 detik ≈ 20–30 kredit.
- **Model video:** Veo 3.1 Lite untuk tes, Omni 1.2 Flash untuk final. Veo 3.1 Fast/Quality dan Omni 1.1 Flash dihentikan 5 Des 2026.
- **Dreamina tidak dipakai:** akun gratis hanya dapat satu video; paket mahal setelah promo, unlimited video hanya 7 hari.
- **Budget:** ≤Rp500 rb/bulan. Gemini API untuk video otomatis penuh (±Rp15–20 rb per video) belum masuk budget,
  jadi tahap pembuatan klip tetap manual.
- **Repo terpisah** dari ai-virtual-office: aturan di sana (tanpa image/video generation, 60–90 detik, bahasa Inggris)
  bertentangan dengan affiliate, dan pipeline Brain Bites Facts sedang berjalan baik.

## Pelajaran dari uji Kahf (dipakai untuk prompt dan QC)
- Buat gambar dulu, perbaiki sampai wajah menghadap kamera dan logo terbaca, baru jadikan video.
- Sebutkan bentuk produk secara eksplisit dan larang yang tidak ada (nozzle, pompa, spray); kalau tidak, botol berubah bentuk.
- Kalau kedua tangan dipakai, produk harus diletakkan dulu. Tanpa aturan ini muncul tangan ketiga.
- Minta produk dipakai sedikit; kalau tidak, muncul kepulan bubuk dan wajah/baju belepotan.
- Ekspresi "tersenyum" sering diabaikan di klip panjang; lebih andal dibuat sebagai klip penutup tersendiri (4–5 detik).
- Klip Flow berisi suara/gerak mulut: audio asli selalu dimatikan.

## Belum dites
- Kualitas suara Kokoro untuk naskah Indonesia (Spanyol/Italia + ejaan). Jalankan `npm run tes-suara` lalu pilih nomor terbaik.
- `lang_code` di permintaan `/v1/audio/speech` Kokoro-FastAPI: kalau ditolak, hapus field itu (bahasa ikut huruf awal nama suara).
