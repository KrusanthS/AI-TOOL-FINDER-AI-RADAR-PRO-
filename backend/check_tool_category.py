import json
from pathlib import Path

names = [
    'AlphaSense', 'Framer AI', 'Replit AI', 'Perplexity', 'Grok', 'Microsoft Copilot',
    'You.com', 'Bolt.new', 'ChatGPT', 'Jasper', 'Copy.ai'
]

path = Path('src/utils/tools_enriched.json')
with path.open('r', encoding='utf-8') as f:
    tools = json.load(f)

lookup = {t['name']: t for t in tools}
for name in names:
    tool = lookup.get(name)
    if not tool:
        print(f'MISSING: {name}')
    else:
        print(name, '-> category=', tool.get('category'), 'categories=', tool.get('categories'))
