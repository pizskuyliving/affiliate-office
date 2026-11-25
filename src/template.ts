// Template video outfit "faceless try-on". Struktur 6 panel tetap (sudah teruji di Omni 1.2 Flash, 10 detik);
// Claude hanya mengisi deskripsi dan teks sesuai produk. Pose menentukan sketsa storyboard dan gaya potongan di editor.

export type Pose = 'depan' | 'kerah' | 'ujung' | 'samping' | 'melangkah' | 'belakang' | 'closeup' | 'saku'

export type PanelTemplate = {
  label: string
  mulai: number
  selesai: number
  pose: Pose
  kamera: string
  /** arahan bawaan untuk Claude */
  aksi: string
}

export type Template = {
  kode: 'print_depan' | 'print_belakang' | 'polos'
  nama: string
  kapan: string
  panel: PanelTemplate[]
  /** panel yang potongannya dipakai sebagai hook di detik pertama */
  hook: number
}

const P = (label: string, mulai: number, selesai: number, pose: Pose, kamera: string, aksi: string): PanelTemplate => ({ label, mulai, selesai, pose, kamera, aksi })

export const TEMPLATE: Record<Template['kode'], Template> = {
  print_depan: {
    kode: 'print_depan',
    nama: 'Try-on print depan',
    kapan: 'atasan dengan print/grafis utama di dada',
    hook: 4,
    panel: [
      P('DEPAN', 0, 2, 'depan', 'Kamera diam, full body', 'Berdiri di tengah karpet bundar menghadap kamera, tangan rileks, print di dada terlihat jelas.'),
      P('DETAIL PRINT', 2, 3.5, 'kerah', 'Kamera diam, setengah badan', 'Kedua tangan merapikan kerah dan bahu, print di dada tetap utuh dan tajam.'),
      P('SAMPING', 3.5, 5, 'samping', 'Kamera diam', 'Berputar pelan 90° ke kanan, siluet atasan dan bawahan terlihat.'),
      P('MELANGKAH', 5, 6.5, 'melangkah', 'Kamera diam', 'Kembali menghadap kamera lalu melangkah dua langkah pelan ke depan.'),
      P('DETAIL', 6.5, 8.5, 'closeup', 'Potong ke close-up', 'Close-up print di dada dan tekstur bahan.'),
      P('DEPAN LAGI', 8.5, 10, 'saku', 'Kamera diam, full body', 'Berdiri menghadap depan, satu tangan di saku, pose santai.'),
    ],
  },
  print_belakang: {
    kode: 'print_belakang',
    nama: 'Try-on print belakang',
    kapan: 'atasan dengan print/grafis utama di punggung',
    hook: 3,
    panel: [
      P('DEPAN', 0, 2, 'depan', 'Kamera diam, full body', 'Berdiri di tengah karpet bundar menghadap kamera, tangan rileks.'),
      P('RAPIKAN', 2, 3.5, 'ujung', 'Kamera diam', 'Kedua tangan merapikan ujung bawah atasan, detail depan terlihat.'),
      P('SAMPING', 3.5, 5, 'samping', 'Kamera diam', 'Berputar pelan 90° ke kanan, siluet terlihat.'),
      P('BELAKANG', 5, 7, 'belakang', 'Kamera diam', 'Lanjut berputar membelakangi kamera, print besar di punggung jelas dan utuh.'),
      P('DETAIL', 7, 8.5, 'closeup', 'Potong ke close-up', 'Close-up print punggung dan tekstur bahan.'),
      P('DEPAN LAGI', 8.5, 10, 'saku', 'Kamera diam, full body', 'Kembali menghadap depan, satu tangan di saku, pose santai.'),
    ],
  },
  polos: {
    kode: 'polos',
    nama: 'Try-on detail bahan',
    kapan: 'produk polos/basic, bawahan saja, atau tanpa print menonjol',
    hook: 3,
    panel: [
      P('DEPAN', 0, 2, 'depan', 'Kamera diam, full body', 'Berdiri di tengah karpet bundar menghadap kamera, tangan rileks.'),
      P('SAMPING', 2, 3.5, 'samping', 'Kamera diam', 'Berputar pelan 90° ke kanan, potongan dan jatuhnya kain terlihat.'),
      P('MELANGKAH', 3.5, 5.5, 'melangkah', 'Kamera diam', 'Kembali menghadap kamera lalu melangkah dua langkah pelan ke depan.'),
      P('DETAIL', 5.5, 7.5, 'closeup', 'Potong ke close-up', 'Close-up tekstur bahan dan jahitan.'),
      P('RAPIKAN', 7.5, 8.5, 'ujung', 'Kamera diam', 'Merapikan ujung atasan atau pinggang celana.'),
      P('DEPAN LAGI', 8.5, 10, 'saku', 'Kamera diam, full body', 'Berdiri menghadap depan, satu tangan di saku, pose santai.'),
    ],
  },
}

export const KODE_TEMPLATE = Object.keys(TEMPLATE) as Template['kode'][]
