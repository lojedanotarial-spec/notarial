import os, re

files = []
for root, dirs, filenames in os.walk('src'):
    for f in filenames:
        if f.endswith('.jsx') or f.endswith('.js'):
            files.append(os.path.join(root, f))

replacements = [
    ('background: C.warm, borderBottom: "1px solid rgba(26,35,50,.08)"',
     'background: C.cerulean, borderBottom: "1px solid rgba(58,124,165,.8)"'),
    ('background:C.warm, borderBottom:"1px solid rgba(26,35,50,.08)"',
     'background:C.cerulean, borderBottom:"1px solid rgba(58,124,165,.8)"'),
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Updated:', path)

print('Listo.')
