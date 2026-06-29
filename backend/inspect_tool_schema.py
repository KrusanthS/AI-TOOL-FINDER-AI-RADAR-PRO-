import json
from pathlib import Path

path = Path('src/utils/tools_enriched.json')
with path.open('r', encoding='utf-8') as f:
    tools = json.load(f)
for name in ['ChatGPT', 'AlphaSense']:
    tool = next((t for t in tools if t.get('name', '').lower() == name.lower()), None)
    print('---', name, '---')
    if tool:
        print(json.dumps(tool, indent=2)[:2000])
    else:
        print('NOT FOUND')
