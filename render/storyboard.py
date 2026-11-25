"""Storyboard 6 panel (HTML -> PNG 1080x1920 lewat Chrome headless) untuk dilampirkan di Google Flow.
Argumen JSON: judul, sub, foto[], atas{hex,print}, bawah{hex}, panel[{no,waktu,label,deskripsi,kamera,pose}], aturan, keluar"""
import base64, html, json, os, subprocess, sys, tempfile


def data_uri(path):
    return 'data:image/jpeg;base64,' + base64.b64encode(open(path, 'rb').read()).decode()


def sketsa(pose, atas, bawah):
    sh = atas.get('hex') or '#3a3a3c'
    pa = bawah.get('hex') or '#4a4d52'
    pr = atas.get('print') or 'polos'
    ada_atas, ada_bawah = atas.get('ada', True), bawah.get('ada', True)
    sh = sh if ada_atas else '#e9e6e1'
    pa = pa if ada_bawah else '#6b6f75'
    skin = '#c99a78'
    if pose == 'samping':
        s = f'<rect x="38" y="4" width="26" height="40" rx="6" fill="{sh}"/><rect x="41" y="42" width="20" height="44" rx="4" fill="{pa}"/><rect x="38" y="86" width="26" height="7" rx="3" fill="#222"/>'
    else:
        s = f'<path d="M20 6 L80 6 L88 24 L76 28 L74 44 L26 44 L24 28 L12 24 Z" fill="{sh}"/>'
        if pose == 'belakang' and pr in ('belakang', 'depan_belakang'):
            s += '<path d="M40 14 C44 8 50 20 50 20 C50 20 56 8 60 14 C64 22 54 28 50 32 C46 28 36 22 40 14Z" fill="#9fd3ff"/>'
        elif pose != 'belakang' and pr in ('depan', 'depan_belakang'):
            s += '<rect x="38" y="14" width="24" height="5" fill="#c33"/><rect x="36" y="21" width="28" height="6" rx="3" fill="#9bbbd0"/>'
        elif pose != 'belakang':
            s += '<rect x="56" y="14" width="9" height="4" fill="#ddd"/>'
        if pose == 'melangkah':
            s += f'<path d="M30 43 L70 43 L74 86 L58 86 L52 58 L44 82 L26 82 Z" fill="{pa}"/><rect x="22" y="82" width="22" height="7" rx="3" fill="#222"/><rect x="56" y="86" width="22" height="7" rx="3" fill="#222"/>'
        else:
            s += f'<path d="M30 43 L70 43 L73 86 L54 86 L50 56 L46 86 L27 86 Z" fill="{pa}"/><rect x="24" y="86" width="22" height="7" rx="3" fill="#222"/><rect x="54" y="86" width="22" height="7" rx="3" fill="#222"/>'
        if pose == 'kerah':
            s += f'<path d="M16 26 L36 10 M84 26 L64 10" stroke="{skin}" stroke-width="5"/>'
        if pose == 'ujung':
            s += f'<path d="M18 26 L28 44 M82 26 L72 44" stroke="{skin}" stroke-width="5"/>'
        if pose == 'saku':
            s += f'<path d="M86 26 L74 46" stroke="{skin}" stroke-width="5"/>'
    return (f'<div class="rug"></div><svg viewBox="0 0 100 96" class="fig">{s}'
            '<line x1="0" y1="2" x2="100" y2="2" stroke="#e8742c" stroke-width="1.2" stroke-dasharray="3 2"/></svg>')


def main(arg):
    a = json.load(open(arg))
    foto = [data_uri(f) for f in a['foto']]
    kartu = []
    for p in a['panel']:
        if p['pose'] == 'closeup':
            imgs = foto[:2] or []
            wdt = 100 // max(1, len(imgs))
            art = ''.join(f'<img src="{u}" style="position:absolute;left:{i*wdt}%;top:0;width:{wdt}%;height:100%;object-fit:cover">' for i, u in enumerate(imgs))
            art = f'<div class="close">{art}</div>'
        else:
            art = sketsa(p['pose'], a['atas'], a['bawah'])
        kartu.append(f'''<div class="card"><div class="frame">{art}<div class="no">{p['no']}</div></div>
<div class="cap"><div class="t">{html.escape(p['waktu'])}<span>{html.escape(p['label'])}</span></div>
<div class="d">{html.escape(p['deskripsi'])}</div><div class="k">Kamera: {html.escape(p['kamera'])}</div></div></div>''')
    ref = ''.join(f'<img src="{u}">' for u in foto[:3])
    doc = f'''<!doctype html><html><head><meta charset="utf-8"><style>
*{{box-sizing:border-box;margin:0}}body{{width:1080px;height:1920px;background:#f4f1ec;font-family:Inter,sans-serif;color:#1d1b19;padding:40px;overflow:hidden}}
h1{{font-size:42px;font-weight:800}}.sub{{font-size:22px;color:#6b645c;margin-top:6px}}
.ref{{display:flex;gap:14px;margin-top:20px;align-items:center}}.ref img{{height:150px;max-width:260px;object-fit:contain;border-radius:12px;border:2px solid #ddd;background:#fff}}.ref div{{font-size:19px;color:#6b645c;flex:1}}
.grid{{display:grid;grid-template-columns:1fr 1fr;gap:20px 22px;margin-top:20px}}.card{{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08)}}
.frame{{position:relative;height:270px;overflow:hidden;background:linear-gradient(180deg,#d9d6d0,#c2beb7 70%,#9b968e)}}.close{{position:absolute;inset:0}}
.rug{{position:absolute;left:22%;right:22%;bottom:6%;height:16%;border-radius:50%;background:#1d1d1d;border:6px solid #f1f1f1}}.fig{{position:absolute;left:30%;width:40%;top:0;height:92%}}
.no{{position:absolute;top:10px;left:10px;background:#1d1b19;color:#fff;width:38px;height:38px;border-radius:19px;font-size:21px;font-weight:800;display:flex;align-items:center;justify-content:center}}
.cap{{padding:12px 16px 14px}}.t{{font-size:21px;font-weight:800}}.t span{{float:right;background:#e8742c;color:#fff;font-size:14px;padding:4px 10px;border-radius:8px}}
.d{{font-size:17px;line-height:1.3;margin-top:6px;height:66px;overflow:hidden}}.k{{font-size:15px;color:#8a8279;margin-top:4px}}
.rules{{margin-top:20px;background:#1d1b19;color:#fff;border-radius:16px;padding:18px 24px;font-size:17px;line-height:1.45}}.rules b{{color:#f29a5c}}
</style></head><body><h1>{html.escape(a['judul'])}</h1><div class="sub">{html.escape(a['sub'])}</div>
<div class="ref">{ref}<div>Referensi produk. Garis oranye putus-putus = batas atas frame (mulai dari leher, wajah tidak terlihat).</div></div>
<div class="grid">{''.join(kartu)}</div><div class="rules"><b>Aturan wajib:</b> {html.escape(a['aturan'])}</div></body></html>'''
    chrome = os.environ.get('CHROME_BIN')
    if not chrome:
        sys.exit('Chrome tidak ditemukan: isi CHROME_BIN di .env')
    with tempfile.TemporaryDirectory() as tmp:
        f = os.path.join(tmp, 'sb.html')
        open(f, 'w').write(doc)
        r = subprocess.run([chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', f'--user-data-dir={tmp}/u',
                            '--window-size=1080,1920', f'--screenshot={a["keluar"]}', f'file://{f}'], capture_output=True, text=True, timeout=120)
        if not os.path.exists(a['keluar']):
            sys.exit('Chrome gagal membuat storyboard: ' + r.stderr[-500:])
    print(a['keluar'])


if __name__ == '__main__':
    main(sys.argv[1])
