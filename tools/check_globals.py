"""Lists top-level names declared in more than one game file (they share one global scope)."""
import collections, json, re, sys, os
here = os.path.dirname(os.path.abspath(__file__)); game = os.path.join(here, '..', 'src', 'game')
order = json.loads(re.search(r'GAME_FILES = (.*);', open(os.path.join(game, '..', 'main.js')).read()).group(1))
def top_names(src):
    names, depth, i, n = [], 0, 0, len(src)
    while i < n:
        c = src[i]
        if c in '"\'`':  # skip strings and template literals
            q = c; i += 1
            while i < n and src[i] != q:
                if src[i] == '\\': i += 1
                i += 1
        elif src.startswith('//', i): i = src.find('\n', i)
        elif src.startswith('/*', i): i = src.find('*/', i) + 1
        elif c in '{([': depth += 1
        elif c in '})]': depth -= 1
        elif depth == 0:
            m = re.match(r'(const|let|var|function|class)\s+([A-Za-z_$][\w$]*)', src[i:])
            if m and (i == 0 or not re.match(r'[\w$.]', src[i-1])):
                names.append(m.group(2))
                if m.group(1) in ('const', 'let', 'var'):  # further declarators on the same statement
                    j, d = i + m.end(), 0
                    while j < n:
                        ch = src[j]
                        if ch in '"\'`':
                            q = ch; j += 1
                            while j < n and src[j] != q:
                                if src[j] == '\\': j += 1
                                j += 1
                        elif ch in '{([': d += 1
                        elif ch in '})]': d -= 1
                        elif ch == ';' and d == 0: break
                        elif ch == ',' and d == 0:
                            mm = re.match(r'\s*([A-Za-z_$][\w$]*)\s*=', src[j+1:])
                            if mm: names.append(mm.group(1))
                        j += 1
                i += m.end() - 1
        i += 1 if i >= 0 else n
    return names
seen = collections.defaultdict(list)
for f in order:
    for name in top_names(open(os.path.join(game, f)).read()): seen[name].append(f)
dups = {k: v for k, v in seen.items() if len(v) > 1}
print(dups or 'Ingen dubletter')
sys.exit(1 if dups else 0)
