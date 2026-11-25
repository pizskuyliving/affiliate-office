"""Potong foto produk ke kotak bersih dari analis (pecahan 0..1), simpan JPG berlatar putih.
Argumen: file JSON {"foto": [{"masuk", "keluar", "kotak": {x0,y0,x1,y1}}]}"""
import json, sys
from PIL import Image


def main(arg):
    for f in json.load(open(arg))['foto']:
        im = Image.open(f['masuk'])
        if im.mode in ('RGBA', 'LA', 'P'):
            im = im.convert('RGBA')
            bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
            bg.alpha_composite(im)
            im = bg
        im = im.convert('RGB')
        w, h = im.size
        k = f['kotak']
        box = (int(k['x0'] * w), int(k['y0'] * h), int(k['x1'] * w), int(k['y1'] * h))
        out = im.crop(box)
        if max(out.size) > 1600:
            out.thumbnail((1600, 1600), Image.LANCZOS)
        out.save(f['keluar'], quality=92)
        print(f['keluar'], out.size)


if __name__ == '__main__':
    main(sys.argv[1])
