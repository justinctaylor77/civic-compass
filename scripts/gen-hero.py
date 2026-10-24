#!/usr/bin/env python3
"""Builds the responsive hero photo renditions in public/img/hero/ (v5).
Source: "Capitol Dome" by the Architect of the Capitol (USCapitol on Flickr), a U.S. federal government work (public domain).
  Commons: https://commons.wikimedia.org/wiki/File:Flickr_-_USCapitol_-_Capitol_Dome_(1).jpg
  Flickr : https://www.flickr.com/photos/uscapitol/7537241496/
Usage: python3 scripts/gen-hero.py [path-to-original.jpg]   (downloads the 3000x2000 original if no path is given)
Two art-directed crops x widths 480/960/1600 x avif/webp/jpeg. Needs Pillow with WebP+AVIF."""
import hashlib, os, sys, urllib.request
from PIL import Image
URL = 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Flickr_-_USCapitol_-_Capitol_Dome_%281%29.jpg'
SHA1 = 'a6906679cfe0d6a8c7d7a5a2f4f7dda9538b5b02'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'img', 'hero')
src = sys.argv[1] if len(sys.argv) > 1 else '/tmp/capitol-dome-original.jpg'
if not os.path.exists(src):
    req = urllib.request.Request(URL, headers={'User-Agent': 'civic-compass-build/1.0'})
    open(src, 'wb').write(urllib.request.urlopen(req, timeout=120).read())
assert hashlib.sha1(open(src, 'rb').read()).hexdigest() == SHA1, 'source file does not match the verified original'
im = Image.open(src).convert('RGB')
# crop boxes on the 3000x2000 original: (left, top, right, bottom)
CROPS = {'sq': (200, 300, 1900, 2000),   # desktop card, 1:1 (flag + dome curve; excludes the AOC watermark)
         'wide': (150, 400, 2250, 1800)}  # mobile banner, 3:2
for name, box in CROPS.items():
    c = im.crop(box); ratio = c.height / c.width
    for w in (480, 960, 1600):
        r = c.resize((w, round(w * ratio)), Image.LANCZOS)
        r.save(f'{OUT}/capitol-{name}-{w}.jpg', 'JPEG', quality=80, optimize=True, progressive=True)
        r.save(f'{OUT}/capitol-{name}-{w}.webp', 'WEBP', quality=78, method=6)
        r.save(f'{OUT}/capitol-{name}-{w}.avif', 'AVIF', quality=52, speed=4)
print('ok')
