"""Download free files from an itch.io page ("name your own price" at 0).
Usage: itch_dl.py PAGE_URL [--list] [--get SUBSTRING OUTDIR]"""
import http.cookiejar, json, re, sys, urllib.parse, urllib.request

jar = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
op.addheaders = [('User-Agent', 'Mozilla/5.0')]
def get(u, data=None, ref=None):
    r = urllib.request.Request(u, data=urllib.parse.urlencode(data).encode() if data else None)
    if ref: r.add_header('Referer', ref)
    return op.open(r).read().decode('utf-8', 'replace')
csrf = lambda h: re.search(r'name="csrf_token" value="([^"]+)"', h).group(1)

page = sys.argv[1].rstrip('/')
h = get(page)
dl = json.loads(get(page + '/download_url', {'csrf_token': csrf(h)}))['url']
d = get(dl)
ups = []
for m in re.finditer(r'data-upload_id="(\d+)"(.*?)file_size"><span>([^<]+)', d, re.S):
    name = re.search(r'title="([^"]+)"', m.group(2)); ups.append((m.group(1), name.group(1) if name else '?', m.group(3)))
if '--list' in sys.argv:
    for u in ups: print(*u, sep=' | ')
if '--get' in sys.argv:
    sub, out = sys.argv[sys.argv.index('--get') + 1], sys.argv[sys.argv.index('--get') + 2]
    for uid, name, size in ups:
        if sub.lower() in name.lower():
            r = json.loads(get(f'{page}/file/{uid}?source=game_download&after_download_lightbox=1&as_props=1', {'csrf_token': csrf(d)}, ref=dl))
            urllib.request.urlretrieve(r['url'], f'{out}/{name}'); print('saved', name, size)
