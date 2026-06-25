import json
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from html import unescape

PATH = 'src/utils/tools_enriched.json'
OUTPUT = 'src/utils/url_validation_results_incremental.json'

with open(PATH, 'r', encoding='utf-8') as f:
    tools = json.load(f)
urls = [item.get('links', {}).get('website') for item in tools if item.get('links', {}).get('website')]
urls = [u for u in urls if u]
unique_urls = sorted(set(urls))
print('unique urls', len(unique_urls))

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
}

session = requests.Session()

if os.path.exists(OUTPUT):
    with open(OUTPUT, 'r', encoding='utf-8') as f:
        data = json.load(f)
    results = data.get('results', {})
else:
    results = {}


def fetch(url):
    if url in results:
        return url, results[url]
    item = {
        'url': url,
        'status': None,
        'final_url': None,
        'redirects': None,
        'reason': None,
        'title': None,
        'content_snippet': None,
        'error': None,
    }
    try:
        resp = session.get(url, headers=headers, timeout=10, allow_redirects=True)
        item['status'] = resp.status_code
        item['final_url'] = resp.url
        item['redirects'] = [r.url for r in resp.history]
        if resp.status_code == 200:
            text = resp.text
            m = re.search(r'<title>(.*?)</title>', text, re.I | re.S)
            if m:
                item['title'] = unescape(m.group(1).strip())
            p = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', text, re.I | re.S)
            if p:
                item['content_snippet'] = unescape(p.group(1).strip())
            else:
                h = re.search(r'<h1[^>]*>(.*?)</h1>', text, re.I | re.S)
                if h:
                    item['content_snippet'] = re.sub('<[^<]+?>', '', h.group(1).strip())[:180]
        else:
            item['reason'] = resp.reason
    except Exception as e:
        item['error'] = str(e)
    return url, item

with ThreadPoolExecutor(max_workers=8) as executor:
    futures = {executor.submit(fetch, url): url for url in unique_urls}
    for completed, future in enumerate(as_completed(futures), start=1):
        url = futures[future]
        try:
            u, result = future.result()
            results[u] = result
        except Exception as e:
            results[url] = {'url': url, 'error': str(e)}
        if completed % 20 == 0 or completed == len(unique_urls):
            with open(OUTPUT, 'w', encoding='utf-8') as f:
                json.dump({'generated': time.time(), 'results': results}, f, indent=2)
            print(f'progress {completed}/{len(unique_urls)}')

with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump({'generated': time.time(), 'results': results}, f, indent=2)
print('done', len(results))
