"""Find Quaternius models on poly.pizza by name and download the GLB (CC0 only).
Usage: polypizza.py OUTDIR Name [Name...]   (names match the model title, e.g. Wolf, Orc_Skull -> 'Orc Skull')"""
import html, os, re, sys, time, urllib.parse, urllib.request

def get(u, tries=4):
    for k in range(tries):
        try: return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})).read()
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(8 * (k + 1))
    raise RuntimeError('rate limited: ' + u)

out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for name in sys.argv[2:]:
    want = name.replace('_', ' ').lower()
    h = get('https://poly.pizza/search/' + urllib.parse.quote(want)).decode('utf-8', 'replace')
    pos = [(m.start(), m.group(1)) for m in re.finditer(r'href="/m/([A-Za-z0-9]+)"', h)]
    hit = None
    for k, (st, i) in enumerate(pos):
        nxt = next((s2 for s2, j in pos[k + 1:] if j != i), len(h)); seg = h[st:nxt]
        alts = [html.unescape(a).strip().lower() for a in re.findall(r'alt="([^"]+)"', seg)]
        if want in alts and 'Quaternius' in seg:
            time.sleep(2); pg = get('https://poly.pizza/m/' + i).decode('utf-8', 'replace')
            glb = re.search(r'https://static\.poly\.pizza/[\w-]+\.glb', pg)
            if glb and 'CC0' in pg and 'Quaternius' in pg: hit = (i, glb.group(0)); break
    if hit:
        time.sleep(1); data = get(hit[1]); open(f'{out}/{name}.glb', 'wb').write(data)
        print(f'{name}: {len(data)//1024} KB  https://poly.pizza/m/{hit[0]}')
    else: print(f'{name}: not found')
    time.sleep(2)
