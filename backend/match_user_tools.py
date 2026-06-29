import json
from pathlib import Path

user_names = [
    'ChatGPT','Claude','Jasper','Copy.ai','Writesonic','Rytr','Sudowrite','Grammarly','QuillBot','HyperWrite',
    'Midjourney','DALL·E','Adobe Firefly','Leonardo AI','Ideogram','Flux','Stable Diffusion','Playground AI','Recraft','DreamStudio',
    'Sora','Runway','Pika','Luma Dream Machine','Synthesia','HeyGen','Kling AI','Veo','Colossyan','Elai',
    'ElevenLabs','Murf AI','Play.ht','Descript','Suno','Udio','Speechify','Resemble AI','WellSaid Labs','LOVO',
    'Cursor','Windsurf','GitHub Copilot','Codeium','Amazon Q Developer','Tabnine','Sourcegraph Cody','Replit AI','Bolt.new','Continue.dev',
    'Anyword','AdCreative.ai','Ocoya','Predis.ai','HubSpot AI','Surfer SEO','Frase','Scalenut',
    'Notion AI','Motion','Mem AI','Taskade','ClickUp AI','Fireflies.ai','Otter.ai','Fellow','Rewind AI','Magical',
    'Perplexity','Perplexity Labs','You.com','Elicit','Consensus','Scite','Semantic Scholar AI','ChatGPT Deep Research','Gemini Deep Research','Research Rabbit',
    'Pinecone','Weaviate','Chroma','Milvus','Qdrant','DataRobot','Snowflake Cortex','Databricks Mosaic AI','MongoDB Atlas Vector Search','LanceDB',
    'CrowdStrike Charlotte AI','Microsoft Security Copilot','Darktrace','SentinelOne Purple AI','Wiz AI','Palo Alto Cortex AI','Vectra AI','Recorded Future AI','Cybereason AI','Elastic Security AI',
    'AlphaSense','BloombergGPT','Hebbia','Uptrends AI','FinChat','Kavout','Magnifi','TIFIN','Zest AI','Numerai',
    'Harvey','CoCounsel','Lexis+ AI','Casetext','Spellbook','Luminance','Ironclad AI','Eudia','Robin AI','LawGeex',
    'Canva AI','Figma AI','Adobe Express AI','Uizard','Galileo AI','Framer AI','Visily','Khroma','Designs.ai','Microsoft Designer',
    'Lovable','Bolt.new','v0','Replit AI','Cursor','Windsurf','Framer AI','Webflow AI','Durable','Hostinger Horizons',
    'LangChain','LangGraph','LlamaIndex','CrewAI','AutoGen','Flowise','OpenHands','Haystack','Semantic Kernel','DSPy','vLLM','Ollama','LiteLLM','Open WebUI','FastGPT','Continue','Dify','SuperAGI','AgentOps','Mem0',
    'Gemini','Microsoft Copilot','Grok','Pi','Poe','YouChat','Character.AI',
    'Google AI Mode','Microsoft Copilot Search','Andi','Phind','Komo','Brave Search AI','Exa','Genspark',
    'GPT-5.5','GPT-4.1','Claude Opus','Claude Sonnet','Gemini 2.5 Pro','Gemini 2.5 Flash','Grok','Command R+','Mistral Large','AI21 Jamba','Llama','DeepSeek R1','DeepSeek V3','Qwen','Mixtral','Phi','Gemma','Falcon','Yi','MPT','DeepSeek Coder','Qwen Coder','Codestral','StarCoder2','Code Llama','Qwen-VL','LLaVA'
]

path = Path('src/utils/tools_enriched.json')
with path.open('r', encoding='utf-8') as f:
    tools = json.load(f)

lower_map = {t['name'].lower(): t['name'] for t in tools}
for name in user_names:
    exact = next((t for t in tools if t.get('name','') == name), None)
    if exact:
        print(f'EXACT OK: {name} -> {exact["name"]} ({exact.get("category")})')
    else:
        found = [t for t in tools if t.get('name','').lower() == name.lower()]
        if found:
            print(f'CASE MISMATCH: {name} -> {found[0].get("name")} ({found[0].get("category")})')
        else:
            print(f'MISSING: {name}')
