import { TAHAP, type Proyek } from './db.ts'
import { TEMPLATE } from './template.ts'

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const GAYA = `*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:#f4f1ec;color:#1d1b19}
main{max-width:860px;margin:0 auto;padding:18px}h1{font-size:26px;margin:6px 0 16px}h2{font-size:19px;margin:0 0 10px}
.kotak{background:#fff;border-radius:16px;padding:18px;margin-bottom:16px;box-shadow:0 1px 6px rgba(0,0,0,.06)}
label{display:block;font-weight:600;font-size:14px;margin:10px 0 4px}input,textarea{width:100%;padding:11px;border:1px solid #d8d3cc;border-radius:10px;font:inherit;background:#fff}
textarea{min-height:70px}button,.tombol{display:inline-block;background:#1d1b19;color:#fff;border:0;border-radius:10px;padding:11px 16px;font:600 15px Inter,system-ui;cursor:pointer;text-decoration:none;margin:4px 6px 4px 0}
.tombol.oranye,button.oranye{background:#e8742c}.tombol.terang{background:#ece7e0;color:#1d1b19}
.baris{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eee;gap:10px}.baris:last-child{border:0}
.lencana{font-size:12px;font-weight:700;padding:4px 9px;border-radius:20px;background:#ece7e0;white-space:nowrap}
.antre,.proses{background:#fff1d6;color:#8a5a00}.tunggu{background:#ffe3d1;color:#a14b10}.gagal{background:#ffd9d9;color:#a11}.selesai{background:#dff3e1;color:#226b2c}
.langkah{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px}.langkah span{font-size:12px;padding:4px 8px;border-radius:8px;background:#ece7e0;color:#8a8279}
.langkah span.ok{background:#1d1b19;color:#fff}.langkah span.ini{background:#e8742c;color:#fff}
pre{white-space:pre-wrap;background:#f7f4ef;border-radius:10px;padding:12px;font-size:13px;max-height:260px;overflow:auto;margin:6px 0}
.galeri{display:flex;gap:10px;flex-wrap:wrap}.galeri img{height:150px;border-radius:10px;border:1px solid #ddd;background:#fff}
.sb{width:100%;max-width:420px;border-radius:12px;border:1px solid #ddd}video{width:100%;max-width:340px;border-radius:12px;background:#000}
.vid{display:flex;gap:16px;flex-wrap:wrap}.vid>div{flex:1;min-width:240px}.kecil{font-size:13px;color:#8a8279}.galat{color:#a11;font-size:14px;white-space:pre-wrap}
ul.cek{padding-left:20px;margin:6px 0}ul.cek li{margin:4px 0}`

const kerangka = (judul: string, isi: string, segarkan = false) => `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">${segarkan ? '<meta http-equiv="refresh" content="8">' : ''}
<title>${esc(judul)} · Affiliate Office</title><style>${GAYA}</style></head><body><main>${isi}</main>
<script>document.querySelectorAll('[data-salin]').forEach(b=>b.onclick=()=>{navigator.clipboard.writeText(document.getElementById(b.dataset.salin).innerText).then(()=>{const t=b.innerText;b.innerText='Tersalin ✓';setTimeout(()=>b.innerText=t,1500)})})</script>
</body></html>`

const NAMA_TAHAP: Record<string, string> = { analisis: 'Analisis', sutradara: 'Naskah', storyboard: 'Storyboard', 'menunggu-klip': 'Klip Flow', editor: 'Edit', selesai: 'Selesai' }
const KET_STATUS: Record<string, string> = { antre: 'antre', proses: 'diproses', tunggu: 'menunggu klip', gagal: 'gagal', selesai: 'selesai' }

const langkah = (p: Proyek) =>
  `<div class="langkah">${TAHAP.map((t, i) => {
    const k = TAHAP.indexOf(p.tahap)
    return `<span class="${i < k || p.tahap === 'selesai' ? 'ok' : i === k ? 'ini' : ''}">${NAMA_TAHAP[t]}</span>`
  }).join('')}</div>`

export function halamanDaftar(daftar: Proyek[]) {
  const isi = `<h1>Affiliate Office</h1>
<form class="kotak" method="post" action="/baru" enctype="multipart/form-data">
<h2>Produk baru</h2>
<label>Foto / screenshot produk (boleh beberapa: depan, belakang, celana)</label><input type="file" name="foto" accept="image/*" multiple required>
<label>Nama produk</label><input name="nama" placeholder="mis. Graphic Boxy Tshirt SHIFT + Jeans Wide Leg" required>
<label>Harga (opsional)</label><input name="harga" placeholder="mis. Rp89.000">
<label>Link produk (opsional)</label><input name="link" placeholder="https://...">
<label>Info ukuran / bahan dari halaman produk (opsional)</label><textarea name="info" placeholder="mis. Cotton combed 16s, ukuran M-XXL, lingkar dada 112 cm"></textarea>
<p><button class="oranye">Buat storyboard</button></p></form>
<div class="kotak"><h2>Proyek</h2>${
    daftar.length
      ? daftar.map((p) => `<div class="baris"><div><a href="/p/${p.id}"><b>#${p.id} ${esc(p.input.nama)}</b></a>${langkah(p)}</div><span class="lencana ${p.status}">${KET_STATUS[p.status]}</span></div>`).join('')
      : '<p class="kecil">Belum ada proyek.</p>'
  }</div>`
  return kerangka('Proyek', isi, daftar.some((p) => p.status === 'antre' || p.status === 'proses'))
}

export function halamanProyek(p: Proyek) {
  const d = p.data
  const f = (n: string) => `/p/${p.id}/f/${n}`
  const bag: string[] = [`<p><a href="/">← Semua proyek</a></p><h1>#${p.id} ${esc(p.input.nama)}</h1>`]
  bag.push(`<div class="kotak">${langkah(p)}<p>Status: <span class="lencana ${p.status}">${KET_STATUS[p.status]}</span>
${p.status === 'proses' || p.status === 'antre' ? ' <span class="kecil">halaman ini menyegarkan sendiri</span>' : ''}</p>
${p.galat ? `<p class="galat">${esc(p.galat)}</p>` : ''}
${p.status === 'gagal' ? `<form method="post" action="/p/${p.id}/ulang" enctype="multipart/form-data"><input type="hidden" name="dari" value="${p.tahap}"><button>Coba lagi</button></form>` : ''}</div>`)

  if (d.analisis) {
    const k = d.analisis.produk
    bag.push(`<div class="kotak"><h2>Foto produk (sudah dirapikan)</h2><div class="galeri">${d.analisis.foto.map((x: any) => `<a href="${f('foto/' + x.file)}?unduh"><img src="${f('foto/' + x.file)}"></a>`).join('')}</div>
<p class="kecil">Ketuk foto untuk mengunduh, lalu upload ke Google Flow.</p>
<p><b>${esc(k.nama_pendek)}</b>: ${esc([k.atasan?.deskripsi, k.bawahan?.deskripsi].filter(Boolean).join(' · '))}</p>
${k.risiko?.length ? `<p class="kecil">Perlu dijaga: ${esc(k.risiko.join('; '))}</p>` : ''}</div>`)
  }

  if (d.storyboard) {
    const s = d.sutradara
    const pr = d.storyboard.prompt
    bag.push(`<div class="kotak"><h2>Paket Google Flow</h2>
<p class="kecil">Template: ${esc(TEMPLATE[s.template as keyof typeof TEMPLATE].nama)} · ${esc(pr.pengaturan)}</p>
<a href="${f('storyboard.png')}"><img class="sb" src="${f('storyboard.png')}"></a>
<p><a class="tombol" href="${f('storyboard.png')}?unduh">Unduh storyboard</a><a class="tombol terang" href="${f('prompt.txt')}?unduh">Unduh semua prompt</a></p>
<ol><li>Buat <b>project baru</b> di Flow untuk produk ini.</li><li><b>Langkah 1 (gratis):</b> upload foto produk, lampirkan, tempel prompt di bawah, pilih gambar terbaik (wajah tidak terlihat, print benar, sepatu tanpa logo).</li>
<li><b>Langkah 2:</b> lampirkan storyboard + gambar terbaik + foto atasan, tempel prompt, pastikan Omni 1.2 Flash · 10 detik · ±30 kredit, lalu Setujui.</li><li>Unduh klipnya dan upload di bawah.</li></ol>
<label>Prompt langkah 1 <button type="button" class="terang tombol" data-salin="l1">Salin</button></label><pre id="l1">${esc(pr.langkah1)}</pre>
<label>Prompt langkah 2 <button type="button" class="terang tombol" data-salin="l2">Salin</button></label><pre id="l2">${esc(pr.langkah2)}</pre></div>`)
  }

  if (TAHAP.indexOf(p.tahap) >= TAHAP.indexOf('menunggu-klip')) {
    bag.push(`<form class="kotak" method="post" action="/p/${p.id}/klip" enctype="multipart/form-data"><h2>${d.klip ? 'Ganti klip' : 'Upload klip dari Google Flow'}</h2>
<input type="file" name="klip" accept="video/*" required><p><button class="oranye">Upload & edit</button></p>
${d.klip ? '<p class="kecil">Upload ulang kalau klip perlu diganti; video akan diedit ulang.</p>' : ''}</form>`)
  }

  if (d.editor) {
    const e = d.editor
    const caption = `${e.caption}\n\n${e.hashtag.map((h: string) => '#' + h).join(' ')}`
    bag.push(`<div class="kotak"><h2>Video siap posting</h2><div class="vid">${e.video
      .map((v: any, i: number) => `<div><video src="${f(v.file)}" controls playsinline poster="${f(v.sampul)}"></video>
<p><b>Varian ${i + 1}</b>: ${esc(v.hook.join(' '))}</p><a class="tombol oranye" href="${f(v.file)}?unduh">Unduh video ${i + 1}</a></div>`)
      .join('')}</div>
<label>Caption <button type="button" class="terang tombol" data-salin="cap">Salin</button></label><pre id="cap">${esc(caption)}</pre>
<h2>Sebelum posting</h2><ul class="cek"><li>Ganti musik latar dengan <b>sound TikTok</b> (yang ada di video hanya contoh).</li>
<li>Tautkan produk ke <b>keranjang kuning</b>.</li><li>Aktifkan label <b>konten AI</b>.</li><li>Posting varian lain di jam berbeda untuk menguji hook.</li></ul>
<form method="post" action="/p/${p.id}/ulang" enctype="multipart/form-data"><input type="hidden" name="dari" value="editor"><button class="terang">Edit ulang</button></form></div>`)
  }

  if (d.analisis && p.status !== 'proses') {
    bag.push(`<div class="kotak"><h2>Ulangi dari tahap</h2><form method="post" action="/p/${p.id}/ulang" enctype="multipart/form-data">
${['analisis', 'sutradara', 'storyboard'].map((t) => `<button name="dari" value="${t}" class="terang">${NAMA_TAHAP[t]}</button>`).join('')}</form>
<p class="kecil">Analisis ulang memakai kuota Claude lagi; storyboard ulang hanya merender ulang gambar.</p></div>`)
  }
  return kerangka(p.input.nama, bag.join('\n'), p.status === 'antre' || p.status === 'proses')
}
