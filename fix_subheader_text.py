import os

files = []
for root, dirs, filenames in os.walk('src'):
    for f in filenames:
        if f.endswith('.jsx') or f.endswith('.js'):
            files.append(os.path.join(root, f))

replacements = [
    ('color: "#1a2332",\n          fontSize: 13, fontFamily: "\'Montserrat\',sans-serif",\n          padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,',
     'color: "#fff",\n          fontSize: 13, fontFamily: "\'Montserrat\',sans-serif",\n          padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,'),
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
