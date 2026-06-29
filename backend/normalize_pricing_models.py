import json
from pathlib import Path

path = Path('src/utils/tools_enriched.json')
with path.open('r', encoding='utf-8') as f:
    tools = json.load(f)

mapping = {
    'free': 'free',
    'freemium': 'freemium',
    'paid': 'paid',
    'enterprise': 'enterprise',
    'unknown': 'unknown',
}

updated = 0
for tool in tools:
    model = None
    if tool.get('pricing') and isinstance(tool['pricing'], dict):
        raw = tool['pricing'].get('model')
        if raw is not None:
            token = str(raw).strip().lower()
            if 'free' in token:
                model = 'free'
            elif 'freemium' in token:
                model = 'freemium'
            elif 'enterprise' in token:
                model = 'enterprise'
            elif 'paid' in token or 'usage' in token or 'limited' in token or 'api' in token or 'open' in token:
                # open source or pay-as-you-go treated as free if explicitly free, else paid
                if 'free' in token:
                    model = 'free'
                else:
                    model = 'paid'
            else:
                model = 'unknown'
            if tool['pricing']['model'] != model:
                tool['pricing']['model'] = model
                updated += 1
    if tool.get('pricing_type'):
        token = str(tool['pricing_type']).strip().lower()
        if token not in mapping:
            if 'free' in token:
                tool['pricing_type'] = 'free'
            elif 'freemium' in token:
                tool['pricing_type'] = 'freemium'
            elif 'enterprise' in token:
                tool['pricing_type'] = 'enterprise'
            elif 'paid' in token or 'usage' in token or 'limited' in token or 'api' in token or 'open' in token:
                tool['pricing_type'] = 'paid'
            else:
                tool['pricing_type'] = 'unknown'
            updated += 1

with path.open('w', encoding='utf-8') as f:
    json.dump(tools, f, indent=2, ensure_ascii=False)

print(f'pricing fields normalized for {updated} values')
