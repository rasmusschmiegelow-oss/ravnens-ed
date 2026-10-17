"""List a public Google Drive folder recursively: prints id, size and path for each file. Usage: gdrive_ls.py FOLDER_ID [depth]"""
import re, sys, urllib.request, codecs

def ls(fid):
    h = urllib.request.urlopen(f'https://drive.google.com/drive/folders/{fid}').read().decode('utf-8', 'replace')
    m = re.search(r"window\['_DRIVE_ivd'\] = '(.*?)';", h, re.S)
    if not m: return []
    data = codecs.decode(m.group(1), 'unicode_escape')
    out = []
    for e in re.finditer(r'\["([\w-]{20,})",\["' + re.escape(fid) + r'"\],"([^"]+)","([^"]+)"', data):
        out.append((e.group(1), e.group(2), e.group(3)))
    return out

def walk(fid, path, depth):
    for i, name, mime in ls(fid):
        if mime.endswith('folder'):
            if depth > 0: walk(i, path + name + '/', depth - 1)
        else:
            print(i, path + name)

walk(sys.argv[1], '', int(sys.argv[2]) if len(sys.argv) > 2 else 2)
