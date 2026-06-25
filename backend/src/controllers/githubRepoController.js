import GitHubRepository from '../models/GitHubRepository.js';
import https from 'https';

// Fetch live repos from GitHub API
const fetchGitHubRepos = (query, token, perPage = 20, page = 1) => {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: String(Math.min(perPage, 30)),
      page: String(page),
    });
    const options = {
      hostname: 'api.github.com',
      path: `/search/repositories?${params.toString()}`,
      method: 'GET',
      headers: {
        'User-Agent': 'ai-radar-pro',
        'Accept': 'application/vnd.github+json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

// Category → GitHub topic/keyword map — reliable topic-based queries
const CATEGORY_QUERY_MAP = {
  // AI tool categories
  'Writing':           'topic:ai-writing language:Python',
  'Reading':           'topic:nlp language:Python',
  'Coding':            'topic:code-generation language:Python',
  'Image Generation':  'topic:stable-diffusion',
  'Video Generation':  'topic:video-generation language:Python',
  'Audio':             'topic:text-to-speech language:Python',
  'Productivity':      'topic:automation language:Python',
  'Research':          'topic:rag language:Python',
  'Marketing':         'topic:marketing language:Python',
  'Design':            'topic:generative-art',
  'Finance':           'topic:algorithmic-trading language:Python',
  'Legal':             'topic:nlp legal language:Python',
  'Cybersecurity':     'topic:cybersecurity language:Python',
  'Website Builder':   'topic:website-builder language:JavaScript',
  'Search Engines':    'topic:search language:Python',
  'Chatbots':          'topic:chatbot language:Python',
  'LLMs':              'topic:llm language:Python',
  // Software/dev categories users may search
  'Website':           'topic:website language:JavaScript',
  'Portfolio':         'topic:portfolio language:JavaScript',
  'Fullstack':         'topic:fullstack language:JavaScript',
  'Full Stack':        'topic:fullstack language:JavaScript',
  'Data Analytics':    'topic:data-analysis language:Python',
  'Data Science':      'topic:data-science language:Python',
  'Machine Learning':  'topic:machine-learning language:Python',
  'Deep Learning':     'topic:deep-learning language:Python',
  'React':             'topic:react language:JavaScript',
  'Next.js':           'topic:nextjs language:JavaScript',
  'Node.js':           'topic:nodejs language:JavaScript',
  'Django':            'topic:django language:Python',
  'FastAPI':           'topic:fastapi language:Python',
  'Docker':            'topic:docker',
  'DevOps':            'topic:devops',
  'Mobile':            'topic:mobile-app',
  'Android':           'topic:android language:Kotlin',
  'iOS':               'topic:ios language:Swift',
  'Blockchain':        'topic:blockchain',
  'Web3':              'topic:web3',
  'Game':              'topic:game-development',
  'REST API':          'topic:rest-api language:Python',
  'GraphQL':           'topic:graphql language:JavaScript',
  'Database':          'topic:database language:Python',
};

// Smart keyword → query map for user free-text searches
const SEARCH_KEYWORD_MAP = [
  { terms: ['portfolio', 'personal website', 'personal site'],  query: 'topic:portfolio language:JavaScript' },
  { terms: ['website', 'landing page', 'web design'],           query: 'topic:website language:JavaScript' },
  { terms: ['fullstack', 'full stack', 'full-stack'],           query: 'topic:fullstack language:JavaScript' },
  { terms: ['data analytics', 'data analysis', 'analytics'],   query: 'topic:data-analysis language:Python' },
  { terms: ['data science', 'datascience'],                     query: 'topic:data-science language:Python' },
  { terms: ['machine learning', 'ml model'],                    query: 'topic:machine-learning language:Python' },
  { terms: ['deep learning', 'neural network', 'cnn', 'rnn'],   query: 'topic:deep-learning language:Python' },
  { terms: ['llm', 'large language model', 'gpt', 'chatgpt'],   query: 'topic:llm language:Python' },
  { terms: ['stable diffusion', 'image generation', 'midjourney'], query: 'topic:stable-diffusion' },
  { terms: ['chatbot', 'chat bot', 'conversational ai'],        query: 'topic:chatbot language:Python' },
  { terms: ['react', 'reactjs', 'react.js'],                    query: 'topic:react language:JavaScript' },
  { terms: ['next.js', 'nextjs', 'next js'],                    query: 'topic:nextjs language:JavaScript' },
  { terms: ['node.js', 'nodejs', 'node js', 'express'],         query: 'topic:nodejs language:JavaScript' },
  { terms: ['django', 'flask', 'fastapi', 'python web'],        query: 'topic:django language:Python' },
  { terms: ['docker', 'kubernetes', 'k8s', 'devops', 'ci/cd'],  query: 'topic:devops' },
  { terms: ['blockchain', 'web3', 'ethereum', 'solidity', 'nft'], query: 'topic:blockchain' },
  { terms: ['mobile app', 'android', 'kotlin'],                 query: 'topic:android language:Kotlin' },
  { terms: ['ios', 'swift', 'iphone app'],                      query: 'topic:ios language:Swift' },
  { terms: ['game', 'unity', 'unreal', 'pygame'],               query: 'topic:game-development' },
  { terms: ['automation', 'bot', 'scraping', 'playwright'],     query: 'topic:automation language:Python' },
  { terms: ['cybersecurity', 'security', 'penetration', 'ctf'], query: 'topic:cybersecurity language:Python' },
  { terms: ['rag', 'retrieval augmented', 'vector', 'embedding'], query: 'topic:rag language:Python' },
  { terms: ['langchain', 'lang chain'],                         query: 'topic:langchain language:Python' },
  { terms: ['transformer', 'bert', 'attention'],                query: 'topic:transformer language:Python' },
  { terms: ['speech', 'audio', 'tts', 'whisper'],               query: 'topic:text-to-speech language:Python' },
  { terms: ['finance', 'trading', 'stock', 'crypto', 'quant'],  query: 'topic:algorithmic-trading language:Python' },
  { terms: ['e-commerce', 'ecommerce', 'shop', 'store'],        query: 'topic:ecommerce language:JavaScript' },
  { terms: ['rest api', 'api', 'graphql', 'backend'],           query: 'topic:rest-api language:Python' },
];

const getReposForTool = async (req, res, next) => {
  try {
    const { toolName, category } = req.query;
    if (!toolName && !category) {
      return res.status(400).json({ message: 'toolName or category is required' });
    }

    const token = process.env.GITHUB_TOKEN;
    const catQuery = CATEGORY_QUERY_MAP[category] || '';
    const nameQuery = toolName ? `${toolName} AI` : '';
    const searchQuery = catQuery || nameQuery || 'artificial intelligence';

    const data = await fetchGitHubRepos(searchQuery, token);
    const items = (data.items || []).slice(0, 6).map((r) => ({
      repository_name: r.full_name,
      slug: r.full_name.replace('/', '--'),
      owner_name: r.owner?.login,
      repository_url: r.html_url,
      description: r.description || '',
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      language: r.language || 'Unknown',
      license: r.license?.spdx_id || null,
      topics: r.topics || [],
      category: category || 'General',
      last_updated: r.updated_at,
    }));

    res.json({ repos: items, total: items.length });
  } catch (err) {
    next(err);
  }
};

// Default queries — rotate per page, covers AI + web + data + software topics
const DEFAULT_LIVE_QUERIES = [
  'topic:llm language:Python',
  'topic:stable-diffusion',
  'topic:react language:JavaScript',
  'topic:fullstack language:JavaScript',
  'topic:data-science language:Python',
  'topic:machine-learning language:Python',
  'topic:nextjs language:JavaScript',
  'topic:rag language:Python',
  'topic:portfolio language:JavaScript',
  'topic:deep-learning language:Python',
  'topic:chatbot language:Python',
  'topic:devops',
  'topic:data-analysis language:Python',
  'topic:nodejs language:JavaScript',
  'topic:transformer language:Python',
  'topic:cybersecurity language:Python',
  'topic:blockchain',
  'topic:fastapi language:Python',
  'topic:automation language:Python',
  'topic:website language:JavaScript',
];

const mapGitHubItem = (r, category) => ({
  _id: String(r.id || r.full_name),
  repository_name: r.full_name,
  slug: r.full_name.replace('/', '--'),
  owner_name: r.owner?.login || '',
  repository_url: r.html_url,
  description: r.description || '',
  stars: r.stargazers_count || 0,
  forks: r.forks_count || 0,
  language: r.language || 'Unknown',
  license: r.license?.spdx_id || null,
  topics: r.topics || [],
  category: category || 'AI',
  last_updated: r.updated_at,
  source: 'github-live',
  status: 'approved',
});

const getRepos = async (req, res, next) => {
  try {
    const {
      search = '',
      category,
      sort = 'stars',
      order = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10), 1);
    const pageSize = Math.min(parseInt(limit, 10), 30);
    const token = process.env.GITHUB_TOKEN;

    // ── Always fetch live from GitHub API — never rely on empty DB ────────────
    let liveQuery;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      // Try to match user search against known keyword map first
      let matched = null;
      for (const entry of SEARCH_KEYWORD_MAP) {
        if (entry.terms.some((t) => q.includes(t))) {
          matched = entry.query;
          break;
        }
      }
      if (matched) {
        liveQuery = matched;
      } else {
        // Fall back to raw keyword search on GitHub (no topic filter forced)
        liveQuery = search.trim();
      }
    } else if (category && CATEGORY_QUERY_MAP[category]) {
      liveQuery = CATEGORY_QUERY_MAP[category];
    } else {
      // Default: rotate through broad topics per page so content is always fresh
      const idx = (pageNumber - 1) % DEFAULT_LIVE_QUERIES.length;
      liveQuery = DEFAULT_LIVE_QUERIES[idx];
    }

    const data = await fetchGitHubRepos(liveQuery, token, pageSize, pageNumber);

    if (!data || data.message) {
      // GitHub API returned an error (rate limit, bad token, etc.)
      return res.json({
        repos: [],
        total: 0,
        page: pageNumber,
        limit: pageSize,
        source: 'github-live',
        error: data?.message || 'GitHub API error',
      });
    }

    const items = (data.items || []).map((r) => mapGitHubItem(r, category || 'AI'));
    // GitHub caps search at 1000 results; we show at most 5 pages of 20
    const liveTotal = Math.min(data.total_count || items.length, 100);

    res.json({ repos: items, total: liveTotal, page: pageNumber, limit: pageSize, source: 'github-live' });
  } catch (err) {
    next(err);
  }
};

const getRepoBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const repo = await GitHubRepository.findOne({ slug, status: 'approved' }).lean();
    if (!repo) {
      return res.status(404).json({ message: 'Repository not found' });
    }
    res.json(repo);
  } catch (err) {
    next(err);
  }
};

const getRepoCategories = async (req, res, next) => {
  try {
    const categories = await GitHubRepository.aggregate([
      { $match: { status: 'approved', category: { $exists: true, $ne: '' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);
    res.json(categories.map((item) => ({ category: item._id, count: item.count })));
  } catch (err) {
    next(err);
  }
};

export default {
  getRepos,
  getRepoBySlug,
  getRepoCategories,
  getReposForTool,
};
