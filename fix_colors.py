import os, re

files = []
for root, dirs, filenames in os.walk('src'):
    for f in filenames:
        if f.endswith('.jsx') or f.endswith('.js'):
            files.append(os.path.join(root, f))

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    content = re.sub(r'color: "rgba\(26,35,50,\.[0-9]+\)"', 'color: "rgba(26,35,50,1)"', content)
    content = re.sub(r'color:"rgba\(26,35,50,\.[0-9]+\)"', 'color:"rgba(26,35,50,1)"', content)
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Updated:', path)

print('Listo.')
