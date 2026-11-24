# SPDX-License-Identifier: CC0-1.0
"""Check every internal link and #anchor in the built site (.vitepress/dist).

VitePress already fails the build on links to missing pages; this also checks that each
#anchor exists on its target page, so "Contents" lists and cross-page section links stay valid.
Usage: python3 -I .vitepress/check_links.py [dist-dir] [base]
"""
import glob, html, os, posixpath, re, sys

dist = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'dist')
base = sys.argv[2] if len(sys.argv) > 2 else '/hidizs-ap30-docs/'

def url_of(f):
    u = base + f[:-5]
    return u[:-5] if u.endswith('/index') else u

os.chdir(dist)
pages = {url_of(f): set(re.findall(r'\sid="([^"]+)"', open(f, encoding='utf-8').read()))
         for f in glob.glob('**/*.html', recursive=True)}
bad, total = [], 0
for f in glob.glob('**/*.html', recursive=True):
    if f == '404.html':
        continue
    text = open(f, encoding='utf-8').read()
    body = text.split('class="vp-doc', 1)[-1].split('</main>')[0]
    me = url_of(f)
    for href in re.findall(r'href="([^"]+)"', body):
        href = html.unescape(href)
        if re.match(r'^[a-z]+:', href):
            continue
        path, _, frag = href.partition('#')
        if not path:
            target = me
        elif path.startswith('/'):
            target = path
        else:
            here = me if me.endswith('/') else posixpath.dirname(me) + '/'
            target = posixpath.normpath(posixpath.join(here, path))
        total += 1
        ids = next((pages[c] for c in (target, target.rstrip('/'), target.rstrip('/') + '/')
                    if c in pages), None)
        if ids is None:
            bad.append(f'{f}: {href} (no such page)')
        elif frag and frag not in ids:
            bad.append(f'{f}: {href} (no such anchor)')
print(f'check_links: {total} internal links, {len(bad)} broken')
for b in bad:
    print('  ' + b)
sys.exit(1 if bad else 0)
