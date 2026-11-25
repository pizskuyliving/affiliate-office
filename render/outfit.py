"""Editor video outfit gaya clean: potongan mengikuti ketukan, teks per kata, punch-in halus, kartu produk, CTA.
Teks selalu di zona aman TikTok (di bawah bar pencarian, di atas tombol produk & caption, kiri dari tombol kanan).
Argumen JSON lihat src/agen/editor.ts."""
import glob, json, math, os, subprocess, sys, tempfile, wave
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from umum import W, H, FPS, MX, ACCENT, eo, text_img, soft_shadow, kicker, place, scrim

Y_ATAS, Y_BAWAH = 300, 1020
BEAT = 0.5


class Klip:
    def __init__(self, path, kerja):
        self.dir = os.path.join(kerja, 'frame')
        os.makedirs(self.dir, exist_ok=True)
        subprocess.run([os.environ.get('FFMPEG', 'ffmpeg'), '-v', 'error', '-y', '-i', path, '-vf',
                        f'fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}', '-q:v', '3',
                        os.path.join(self.dir, '%04d.jpg')], check=True)
        self.n = len(glob.glob(os.path.join(self.dir, '*.jpg')))
        if self.n == 0:
            raise SystemExit('klip tidak bisa dibaca')
        self.cache = {}

    def at(self, t):
        i = max(1, min(self.n, int(round(t * FPS)) + 1))
        if i not in self.cache:
            if len(self.cache) > 90:
                self.cache.clear()
            self.cache[i] = Image.open(os.path.join(self.dir, f'{i:04d}.jpg')).convert('RGB')
        return self.cache[i]


def zoom(img, z, cx=0.5, cy=0.5):
    w, h = img.size
    cw, ch = w / z, h / z
    x0 = min(max(cx * w - cw / 2, 0), w - cw)
    y0 = min(max(cy * h - ch / 2, 0), h - ch)
    return img.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))


class Judul:
    """Teks yang muncul per kata (fade + naik), dengan kicker opsional di atasnya."""

    def __init__(self, baris, ukuran=(80, 80, 80), kick=None):
        self.kick = soft_shadow(kicker(kick)) if kick else None
        self.baris = []
        for i, b in enumerate(baris):
            sz = ukuran[min(i, len(ukuran) - 1)]
            ws = [text_img(w, sz, 'ExtraBold') for w in b.split(' ') if w]
            self.baris.append((ws, [soft_shadow(w, 9, 0.45) for w in ws], int(sz * 0.26)))

    def draw(self, f, t, t0, x, y, t_out=None):
        if t < t0:
            return
        a_out = max(0, 1 - (t - t_out) / 0.18) if t_out is not None and t > t_out else 1.0
        yy = y
        if self.kick:
            k = eo((t - t0) / 0.3)
            place(f, self.kick, x - 30 * (1 - k), yy, k * a_out)
            yy += self.kick.height - 2 * self.kick.info['pad'] + 14
        idx = 0
        for ws, sh, gap in self.baris:
            xx = x
            for w, s in zip(ws, sh):
                k = eo((t - (t0 + 0.08 + idx * 0.065)) / 0.26)
                if k > 0:
                    place(f, s, xx, yy + 26 * (1 - k), k * a_out)
                xx += w.width + gap
                idx += 1
            yy += max(w.height for w in ws) + 4


def ukuran_untuk(baris, maks=92, lebar=860):
    """Perkecil huruf bila baris terpanjang melebihi lebar aman."""
    sz = maks
    while sz > 48:
        if all(text_img(b, sz, 'ExtraBold').width <= lebar for b in baris):
            break
        sz -= 4
    return sz


def chip(s):
    t = text_img(s, 34, 'SemiBold')
    im = Image.new('RGBA', (t.width + 40, t.height + 16), (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=im.height // 2,
                                         fill=(255, 255, 255, 40), outline=(255, 255, 255, 120), width=2)
    im.alpha_composite(t, (20, 8))
    return soft_shadow(im, 8, 0.3)


def kartu_foto(path, maks_w, maks_h):
    im = Image.open(path).convert('RGB')
    r = min(maks_w / im.width, maks_h / im.height)
    im = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
    bg = Image.new('RGB', (im.width + 24, im.height + 24), (255, 255, 255))
    bg.paste(im, (12, 12))
    m = Image.new('L', bg.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, bg.width - 1, bg.height - 1), radius=28, fill=255)
    out = Image.new('RGBA', bg.size)
    out.paste(bg, (0, 0), m)
    return soft_shadow(out, 22, 0.5)


def tombol():
    bt = text_img('Ketuk keranjang kuning', 40, 'SemiBold', (20, 20, 20))
    btn = Image.new('RGBA', (bt.width + 150, 104), (0, 0, 0, 0))
    d = ImageDraw.Draw(btn)
    d.rounded_rectangle((0, 0, btn.width - 1, 103), radius=52, fill=(255, 255, 255, 245))
    btn.alpha_composite(bt, (44, (104 - bt.height) // 2 + 2))
    ax = btn.width - 62
    d.line((ax - 14, 40, ax, 54, ax + 14, 40), fill=(20, 20, 20), width=5, joint='curve')
    return soft_shadow(btn, 14, 0.4)


def waktu_sumber(s, u):
    if not s.get('ramp'):
        return s['mulai'] + u * s['rate']
    # speed ramp: kecepatan turun halus dari rate ke rate*0.45
    d = s['durasi']
    k = min(max(u / d, 0), 1)
    r0, r1 = s['rate'], s['rate'] * 0.45
    return s['mulai'] + d * (r0 * k + (r1 - r0) * k * k / 2)


def main(arg):
    a = json.load(open(arg))
    with tempfile.TemporaryDirectory() as kerja:
        klip = Klip(a['klip'], kerja)
        segs = []  # (mulai, selesai, jenis, data)
        t = 0.0
        hk = a['hook']
        segs.append((t, t + hk['durasi'], 'hook', hk)); t += hk['durasi']
        for s in a['segmen']:
            segs.append((t, t + s['durasi'], 'seg', s)); t += s['durasi']
        kt = a['kartu']
        segs.append((t, t + kt['durasi'], 'kartu', kt)); t += kt['durasi']
        ct = a['cta']
        segs.append((t, t + ct['durasi'], 'cta', ct)); t += ct['durasi']
        T = t
        cuts = [s[0] for s in segs[1:]]

        # aset teks
        hook_txt = Judul(hk['baris'], (ukuran_untuk(hk['baris']),))
        for _, _, j, s in segs:
            if j == 'seg':
                s['_j'] = Judul(s['judul'], (ukuran_untuk(s['judul'], 80),), s.get('kicker'))
        kfoto = [kartu_foto(p, 420 if len(kt['foto']) > 1 else 560, 520) for p in kt['foto'][:2]]
        nama = Judul([kt['nama']] + ([kt['sub']] if kt.get('sub', '').strip() else []), (ukuran_untuk([kt['nama']], 70), 52), kt.get('kicker', 'SET OUTFIT'))
        chips = [chip(c) for c in kt['chips'][:3]]
        cta_txt = Judul(ct['baris'], (ukuran_untuk(ct['baris'], 70),), ct.get('kicker', 'TERSEDIA SEKARANG'))
        btn = tombol()

        def base(tt):
            for i, (m, e, j, s) in enumerate(segs):
                if m <= tt < e or i == len(segs) - 1:
                    u = tt - m
                    if j == 'hook':
                        img = zoom(klip.at(s['mulai'] + u * s['rate']), s['zoom0'] + (s['zoom1'] - s['zoom0']) * eo(u / s['durasi']), s.get('cx', 0.5), s.get('cy', 0.5))
                    elif j == 'seg':
                        z = s['zoom'] + (s.get('zoom_akhir', s['zoom']) - s['zoom']) * u / s['durasi']
                        img = zoom(klip.at(waktu_sumber(s, u)), z, s.get('cx', 0.5), s.get('cy', 0.5))
                    elif j == 'kartu':
                        bg = zoom(klip.at(s['bg_mulai'] + u * 0.15), 1.5, 0.45, 0.4).filter(ImageFilter.GaussianBlur(30))
                        img = Image.blend(bg, Image.new('RGB', (W, H), (16, 15, 15)), 0.5)
                    else:
                        img = zoom(klip.at(s['mulai'] + u * s['rate']), 1.02 + 0.04 * eo(u / 2.5), 0.5, 0.5)
                    if i > 0 and u < 0.16:  # transisi punch-in + sedikit motion blur
                        img = zoom(img, 1 + 0.09 * (1 - eo(u / 0.16)))
                        if u < 0.08:
                            sh = int(40 * (1 - u / 0.08))
                            acc = np.asarray(img, dtype=np.float32)
                            img = Image.fromarray(((acc + np.roll(acc, sh, 1) + np.roll(acc, -sh, 1)) / 3).astype(np.uint8))
                    return img, i, m, e, j, s

        def frame(tt):
            img, i, m, e, j, s = base(tt)
            f = img.convert('RGBA')
            if j == 'hook':
                scrim(f, h=900, op=0.6)
                hook_txt.draw(f, tt, m + 0.05, MX, Y_ATAS, e - 0.12)
            elif j == 'seg':
                atas = s.get('posisi') == 'atas'
                scrim(f, top=atas, h=900 if atas else 1100, op=0.6 if atas else 0.55)
                s['_j'].draw(f, tt, m + 0.05, MX, Y_ATAS if atas else Y_BAWAH, e - 0.15)
            elif j == 'kartu':
                u = tt - m
                if len(kfoto) == 2:
                    xs = [70, 1080 - 70 - (kfoto[1].width - 2 * kfoto[1].info['pad'])]
                else:
                    xs = [(1080 - (kfoto[0].width - 2 * kfoto[0].info['pad'])) / 2] if kfoto else []
                for n, (im, x) in enumerate(zip(kfoto, xs)):
                    k = eo((u - 0.12 * n) / 0.5)
                    if k > 0:
                        place(f, im, x + (-300 if n == 0 else 300) * (1 - k), 230, k)
                nama.draw(f, tt, m + 0.2, MX, 840, e - 0.15)
                x, cy = MX, 1080 + (60 if kt.get('sub', '').strip() else 0)
                for n, c in enumerate(chips):
                    k = eo((tt - (m + 0.8 + 0.12 * n)) / 0.3)
                    cw = c.width - 2 * c.info['pad']
                    if x + cw > 920:
                        x, cy = MX, cy + 70
                    if k > 0:
                        a_ = k * (max(0, 1 - (tt - (e - 0.15)) / 0.15) if tt > e - 0.15 else 1)
                        place(f, c, x, cy + 20 * (1 - k), a_)
                    x += cw + 16
            else:
                scrim(f, h=950, op=0.66)
                cta_txt.draw(f, tt, m + 0.05, MX, Y_ATAS)
                if tt > m + 0.8:
                    k = eo((tt - m - 0.8) / 0.35)
                    sc = 1 + 0.025 * math.sin((tt - m - 1.1) * 7) if tt > m + 1.1 else 1
                    b = btn if sc == 1 else btn.resize((int(btn.width * sc), int(btn.height * sc)), Image.BICUBIC)
                    b.info['pad'] = btn.info['pad']
                    yb = Y_ATAS + 300 + 30 * (1 - k)
                    place(f, b, MX, yb, k)
            if tt > T - 0.3:
                f = Image.blend(Image.new('RGBA', (W, H), (0, 0, 0, 255)), f, max(0, (T - tt) / 0.3))
            return f.convert('RGB')

        wav = os.path.join(kerja, 'musik.wav')
        musik(wav, T, cuts, hk['durasi'])
        p = subprocess.Popen([os.environ.get('FFMPEG', 'ffmpeg'), '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                              '-r', str(FPS), '-i', '-', '-i', wav, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
                              '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', a['keluar']],
                             stdin=subprocess.PIPE)
        for n in range(int(T * FPS)):
            p.stdin.write(frame(n / FPS).tobytes())
        p.stdin.close()
        if p.wait() != 0:
            raise SystemExit('ffmpeg gagal menulis video')
        if a.get('sampul'):
            frame(hk['durasi'] + 0.6).save(a['sampul'], quality=90)
    print(json.dumps({'durasi': round(T, 2)}))


def musik(path, T, cuts, hook_dur):
    """Musik latar sementara (120 BPM) supaya potongan terasa pas. Saat posting diganti sound TikTok."""
    sr = 44100
    n = int(T * sr)
    out = np.zeros(n)
    rng = np.random.default_rng(7)

    def add(sig, t0, g):
        i = int(t0 * sr)
        if i >= n:
            return
        j = min(n, i + len(sig))
        out[i:j] += sig[: j - i] * g

    x = np.arange(int(0.3 * sr)) / sr
    kick = np.sin(2 * np.pi * (48 * x + 90 / 22 * (1 - np.exp(-22 * x)))) * np.exp(-x * 11)
    hx = np.arange(int(0.05 * sr)) / sr
    hat = np.diff(rng.standard_normal(len(hx) + 1)) * np.exp(-hx * 90)
    cx = np.arange(int(0.18 * sr)) / sr
    clap = rng.standard_normal(len(cx)) * np.exp(-cx * 28)
    clap = clap - np.convolve(clap, np.ones(8) / 8, 'same')
    bass = [55.0, 55.0, 65.41, 49.0]
    chords = [[220, 261.63, 329.63], [220, 261.63, 329.63], [261.63, 329.63, 392.0], [196.0, 246.94, 293.66]]
    k, t0 = 0, 0.0
    while t0 < T - 0.05:
        bar = int(t0 / 2.0) % 4
        add(kick, t0, 0.35 if t0 < hook_dur else 0.7)
        if k % 2 == 1:
            add(clap, t0, 0.22)
        add(hat, t0 + BEAT / 2, 0.12)
        if t0 >= hook_dur:
            bx = np.arange(int(0.45 * sr)) / sr
            add(np.tanh(2.5 * np.sin(2 * np.pi * bass[bar] * bx)) * np.exp(-bx * 4), t0, 0.18)
        t0 += BEAT
        k += 1
    for b in range(int(T / 2.0) + 1):
        px = np.arange(int(2.0 * sr)) / sr
        env = np.minimum(1, px / 0.15) * np.exp(-px * 0.6)
        add(sum(np.sin(2 * np.pi * fq * px) for fq in chords[b % 4]) / 3 * env, b * 2.0, 0.08)
    rx = np.linspace(0, 1, int(max(0.4, hook_dur - 0.3) * sr))
    add(np.diff(rng.standard_normal(len(rx) + 1)) * rx ** 2, 0.3, 0.09)
    for tc in cuts:
        m = int(0.32 * sr)
        nz = rng.standard_normal(m)
        nz = nz - np.convolve(nz, np.ones(30) / 30, 'same')
        add(nz * np.sin(np.pi * np.linspace(0, 1, m)) ** 2, tc - 0.2, 0.07)
    tt = np.arange(n) / sr
    out *= np.minimum(1, (T - tt) / 0.4)
    out = np.tanh(out * 1.3) * 0.85
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((out * 32767).astype(np.int16).tobytes())


if __name__ == '__main__':
    main(sys.argv[1])
