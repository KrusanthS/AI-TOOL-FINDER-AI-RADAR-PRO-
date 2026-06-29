import json
from pathlib import Path

path = Path('src/utils/tools_enriched.json')
with path.open('r', encoding='utf-8') as f:
    tools = json.load(f)
print('total tools', len(tools))
for name in ['ChatGPT', 'Claude', 'Jasper', 'Midjourney', 'Sora', 'ElevenLabs', 'Cursor', 'Notion AI', 'Perplexity', 'Pinecone', 'CrowdStrike Charlotte AI', 'AlphaSense', 'Harvey', 'Canva AI', 'Lovable', 'LangChain', 'GPT-5.5', 'Claude Opus']:
    found = [t for t in tools if t.get('name', '').lower() == name.lower()]
    print(name, len(found), found[0].get('category') if found else None)
