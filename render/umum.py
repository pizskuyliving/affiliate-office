"""Alat gambar bersama untuk storyboard dan editor (Pillow + numpy)."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1080, 1920, 30
MX = 80                      # margin kiri teks
ACCENT = (232, 140, 72)
FONT_DIR = os.environ.get('FONT_DIR', '/usr/share/fonts/opentype/inter')
_font_cache = {}


def font(weight, size):
    k = (weight, size)
    if k not in _font_cache:
        path = None
        for name in (f'Inter-{weight}.otf', f'Inter-{weight}.ttf', 'Inter-Bold.otf', 'DejaVuSans-Bold.ttf'):
            p = os.path.join(FONT_DIR, name)
            if os.path.exists(p):
                path = p
                break
        _font_cache[k] = ImageFont.truetype(path, size) if path else ImageFont.truetype('DejaVuSans-Bold.ttf', size)
    return _font_cache[k]


def eo(x):
    x = min(max(x, 0), 1)
    return 1 - (1 - x) ** 3


def text_img(s, size, weight='Bold', color=(255, 255, 255), track=0):
    f = font(weight, size)
    widths = [f.getlength(c) + track for c in s] if track else None
    tw = int(sum(widths)) if track else int(f.getlength(s))
    asc, desc = f.getmetrics()
    im = Image.new('RGBA', (tw + 8, asc + desc + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if track:
        x = 4
        for c, wd in zip(s, widths):
            d.text((x, 4), c, font=f, fill=color)
            x += wd
    else:
        d.text((4, 4), s, font=f, fill=color)
    return im


def soft_shadow(im, r=10, op=0.45):
    pad = r * 3
    out = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    sh = Image.new('RGBA', im.size, (0, 0, 0, 255))
    sh.putalpha(im.getchannel('A').point(lambda v: int(v * op)))
    out.alpha_composite(sh, (pad, pad + r // 2))
    out = out.filter(ImageFilter.GaussianBlur(r))
    out.alpha_composite(im, (pad, pad))
    out.info['pad'] = pad
    return out


def kicker(s):
    t = text_img(s, 30, 'SemiBold', ACCENT, track=5)
    im = Image.new('RGBA', (t.width + 70, t.height), (0, 0, 0, 0))
    ImageDraw.Draw(im).rectangle((0, t.height // 2 - 2, 48, t.height // 2 + 1), fill=ACCENT)
    im.alpha_composite(t, (64, 0))
    return im


def place(frame, im, x, y, alpha=1.0):
    if alpha <= 0:
        return
    pad = im.info.get('pad', 0)
    if alpha < 1:
        im = im.copy()
        im.putalpha(im.getchannel('A').point(lambda v: int(v * alpha)))
    frame.alpha_composite(im, (int(x - pad), int(y - pad)))


def scrim(frame, top=True, h=760, op=0.62):
    g = np.linspace(op, 0, h) if top else np.linspace(0, op, h)
    a = Image.fromarray((g * 255).astype(np.uint8)[:, None].repeat(W, 1))
    blk = Image.new('RGBA', (W, h), (8, 8, 8, 255))
    blk.putalpha(a)
    frame.alpha_composite(blk, (0, 0 if top else H - h))
