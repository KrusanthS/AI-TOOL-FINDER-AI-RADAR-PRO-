import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api, {
  searchGithubRepos,
  consultantRecommend,
  getCanonicalCategories,
  getToolsByCategory,
  smartSearch,
} from '../services/api';
import ToolCard from '../components/tools/ToolCard';
import GithubRepoCard from '../components/tools/GithubRepoCard';
import { cn } from '../utils/cn';

const GITHUB_REPO_CATEGORY = 'GitHub Repositories';

const CANONICAL_CATEGORY_NAMES = [
  'Writing', 'Reading', 'Coding', 'Image Generation', 'Video Generation',
  'Audio', 'Productivity', 'Research', 'Marketing', 'Design',
  'Finance', 'Legal', 'Cybersecurity', 'Website Builder',
  'Search Engines', 'Chatbots', 'LLMs',
];

const PRICING = ['All', 'Free', 'Freemium', 'Paid', 'Enterprise'];

const SORT_OPTIONS = [
  { value: 'newest', label: '🆕 Newest' },
  { value: 'trending', label: '🔥 Trending' },
  { value: 'rating', label: '⭐ Top Rated' },
];

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-muted" />
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
      </div>
      <div className="h-3 bg-muted rounded mb-2 w-full" />
      <div className="h-3 bg-muted rounded mb-4 w-4/5" />
      <div className="flex gap-2 mb-4">
        <div className="h-5 bg-muted rounded-full w-14" />
        <div className="h-5 bg-muted rounded-full w-14" />
      </div>
      <div className="border-t border-border pt-3 flex justify-between">
        <div className="h-3 bg-muted rounded w-20" />
        <div className="h-5 bg-muted rounded-full w-16" />
      </div>
    </div>
  );
}

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const category = searchParams.get('category') || 'All';
  const pricing  = searchParams.get('pricing')  || 'All';
  const sort     = searchParams.get('sort')      || 'newest';
  const search   = searchParams.get('search')   || '';

  const isGithubCategory    = category === GITHUB_REPO_CATEGORY;
  const isCanonicalCategory = CANONICAL_CATEGORY_NAMES.includes(category);

  // Tool / repo lists
  const [tools,   setTools]   = useState([]);
  const [repos,   setRepos]   = useState([]);
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Category counts + icons
  const [categoryMeta, setCategoryMeta] = useState({});

  // ── Unified search state ─────────────────────────────────────────────────
  const [searchInput,      setSearchInput]      = useState('');
  const [isSearching,      setIsSearching]      = useState(false);
  const [directResult,     setDirectResult]     = useState(null);
  const [directQuery,      setDirectQuery]      = useState('');
  const [isAiSearching,    setIsAiSearching]    = useState(false);
  const [aiMessage,        setAiMessage]        = useState('');
  const [consultantMeta,   setConsultantMeta]   = useState(null);
  const [selectedForCompare, setSelectedForCompare] = useState([]);

  const debounceRef = useRef(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const setFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'All' || !value) params.delete(key);
    else params.set(key, value);
    params.delete('page');
    setSearchParams(params);
  };

  const getToolKey = (tool) =>
    tool._id ? `db-${tool._id}` : tool.name ? `live-${tool.name}` : `tool-${Math.random()}`;

  // ── Load category metadata once ──────────────────────────────────────────
  useEffect(() => {
    getCanonicalCategories().then((data) => {
      if (data?.categories) {
        const meta = {};
        for (const c of data.categories) meta[c.name] = { count: c.count, icon: c.icon };
        setCategoryMeta(meta);
      }
    });
  }, []);

  // Sync input with URL search param
  useEffect(() => { setSearchInput(search); }, [search]);

  // Reset list when filters change
  useEffect(() => {
    setTools([]);
    setRepos([]);
    setPage(1);
  }, [category, pricing, sort, search, isAiSearching]);

  // ── Main tool fetcher (category / all / URL search) ──────────────────────
  useEffect(() => {
    if (isAiSearching) return;
    let cancelled = false;

    const fetchTools = async () => {
      setIsLoading(true);
      try {
        if (isGithubCategory) {
          const params = new URLSearchParams();
          if (search) params.set('search', search);
          params.set('page', page);
          params.set('limit', 20);
          const res = await api.get(`/github-repos?${params.toString()}`);
          if (cancelled) return;
          const fetched = res.data.repos || [];
          setRepos(prev => page === 1 ? fetched : [...prev, ...fetched]);
          setHasMore(page * 20 < (res.data.total || 0));
        } else if (isCanonicalCategory) {
          const result = await getToolsByCategory(category, {
            page, limit: 20,
            pricing: pricing !== 'All' ? pricing : undefined,
            sort,
          });
          if (cancelled) return;
          const fetched = result.tools || [];
          setTools(prev => page === 1 ? fetched : [...prev, ...fetched]);
          setHasMore(page < (result.pages || 1));
        } else {
          const params = new URLSearchParams();
          if (category !== 'All') params.set('category', category);
          if (pricing !== 'All') params.set('pricing', pricing.toLowerCase());
          if (sort) params.set('sort', sort);
          if (search) params.set('search', search);
          params.set('page', page);
          params.set('limit', 20);
          const res = await api.get(`/tools?${params.toString()}`);
          if (cancelled) return;
          const fetched = res.data.tools || [];
          setTools(prev => page === 1 ? fetched : [...prev, ...fetched]);
          setHasMore(page < (res.data.pages || 1));
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to fetch tools:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchTools();
    return () => { cancelled = true; };
  }, [category, pricing, sort, search, page, isAiSearching, isGithubCategory, isCanonicalCategory]);

  // ── Unified search: runs on form submit ─────────────────────────────────
  // Auto-detects: direct tool name → DB lookup, intent phrase → AI consultant
  const runUnifiedSearch = useCallback(async (query) => {
    const trimmed = (query || '').trim();
    if (!trimmed) return;

    setDirectResult(null);
    setAiMessage('');
    setIsSearching(true);

    try {
      // GitHub category: update URL search param → triggers main useEffect grid fetch
      if (isGithubCategory) {
        const params = new URLSearchParams(searchParams);
        params.set('search', trimmed);
        params.set('category', GITHUB_REPO_CATEGORY);
        setSearchParams(params);
        setIsSearching(false);
        return;
      }

      // Ask backend to detect mode (direct tool vs intent)
      const modeResult = await smartSearch(trimmed);

      if (modeResult.search_mode === 'direct') {
        // Direct tool name hit — show inline result, no AI needed
        setDirectResult(modeResult);
        setDirectQuery(trimmed);
        setIsAiSearching(false);
      } else {
        // Intent / use-case — run AI consultant
        setIsAiSearching(true);
        setIsLoading(true);
        const budget = pricing && pricing !== 'All' ? pricing.toLowerCase() : null;
        const response = await consultantRecommend(trimmed, { limit: 12, budget });

        if (response.error) {
          setAiMessage(response.reasoning || 'AI consultant is unavailable. Please try again.');
          setTools([]);
        } else {
          const toolsData = response.recommended_tools || [];
          const intent    = response.user_intent;
          const reasoning = response.reasoning || '';

          let intentSummary = '';
          if (intent) {
            const caps = (intent.required_capabilities || []).slice(0, 3).join(', ');
            intentSummary = `I understood you want to ${intent.goal || trimmed}. ` +
                            (caps ? `Key requirements: ${caps}.` : '');
          }

          if (toolsData.length === 0) {
            setTools([]);
            setAiMessage(reasoning || intentSummary || 'No tools found. Try a different description.');
          } else {
            setTools(toolsData.map(t => ({
              _id: t.slug || t.tool_name,
              name: t.name || t.tool_name,
              shortDescription: t.description || t.shortDescription,
              description: t.description,
              category: t.category,
              pricing: typeof t.pricing === 'object' ? t.pricing : { model: t.pricing || 'unknown' },
              stats: { rating: t.rating || 0, ratingCount: 0, saves: 0 },
              tags: t.tags || [],
              media: { logo: t.logo || '' },
              links: { website: t.website || t.url || '' },
              url: t.url || t.website || '',
              source: t.source || 'database',
              verified: t.verified || false,
              explanation: t.why_recommended || '',
              best_for: t.best_for || '',
              confidence_score: t.confidence_score || 0,
              pros: t.pros || [],
              limitations: t.limitations || [],
              match_score: t.match_score || 0,
              slug: t.slug || String(t.tool_name || t.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            })));
            setAiMessage(intentSummary);
          }
          setHasMore(false);
          setSelectedForCompare([]);
          setConsultantMeta({
            intent, reasoning,
            confidence: response.confidence || 0,
            source: response.source,
            fromCache: response.fromCache,
            responseTimeMs: response.responseTimeMs,
            total_candidates: response.total_candidates,
            db_sufficiency: response.db_sufficiency,
          });
        }
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Search error:', err);
      setAiMessage('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [isGithubCategory, pricing]);

  // Re-run AI search if pricing filter changes while in AI mode
  useEffect(() => {
    if (isAiSearching && searchInput) runUnifiedSearch(searchInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricing]);

  // Debounced live direct-tool lookup while typing (no full AI call)
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const trimmed = value.trim();
      if (!trimmed || trimmed.length < 2) { setDirectResult(null); return; }
      if (isGithubCategory) return; // let submit handle github
      const result = await smartSearch(trimmed);
      if (result.search_mode === 'direct') {
        setDirectResult(result);
        setDirectQuery(trimmed);
      } else {
        setDirectResult(null);
      }
    }, 400);
  };

  // Submit = run full unified search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchInput?.trim();
    if (!query) return;
    runUnifiedSearch(query);
  };

  // Clear all search state
  const clearSearch = () => {
    setSearchInput('');
    setDirectResult(null);
    setDirectQuery('');
    setAiMessage('');
    setIsAiSearching(false);
    setConsultantMeta(null);
    setSelectedForCompare([]);
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    setSearchParams(params);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Display helpers ──────────────────────────────────────────────────────
  const topTools   = [...tools].sort((a, b) => (b.stats?.rating || 0) - (a.stats?.rating || 0)).slice(0, 2);
  const otherTools = tools.filter(t => !topTools.find(top => top._id === t._id && t._id));

  const toggleCompare = (toolId) => {
    if (selectedForCompare.includes(toolId)) {
      setSelectedForCompare(selectedForCompare.filter(id => id !== toolId));
    } else if (selectedForCompare.length < 4) {
      setSelectedForCompare([...selectedForCompare, toolId]);
    }
  };

  const goToCompare = () => {
    if (selectedForCompare.length < 2) return;
    navigate('/compare', { state: { selectedIds: selectedForCompare } });
  };

  const showDirectToolResult = directResult?.type === 'direct_tool' && directResult?.tool;
  const showDirectNotFound   = directResult?.type === 'not_found';
  const showGithubResult     = directResult?.type === 'github' && directResult?.repo;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight mb-2">
          Discover {isGithubCategory ? 'GitHub Repositories' : 'AI Tools'}
        </h1>
        <p className="text-muted-foreground text-lg">
          Browse categories, search by tool name, or describe what you need — all in one place.
        </p>
      </div>

      {/* ── Unified Search Bar ──────────────────────────────────────────────── */}
      <div className="mb-8 p-1 rounded-3xl bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 shadow-md">
        <div className="bg-card rounded-[22px] p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔍</span>
            <div>
              <h2 className="text-xl font-bold text-foreground">Search AI Tools</h2>
              <p className="text-sm text-muted-foreground">
                Type a tool name (e.g. <span className="font-medium">ChatGPT</span>, <span className="font-medium">Midjourney</span>) or describe a use case (e.g. <span className="font-medium italic">I need AI for writing blog posts</span>)
              </p>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-lg">
                {isSearching ? '⏳' : '🔍'}
              </span>
              <input
                type="text"
                placeholder={
                  isGithubCategory
                    ? 'Search GitHub repositories...'
                    : "Search tool names or describe a use case... e.g. 'I need an AI that can help me summarize legal documents'"
                }
                value={searchInput}
                onChange={handleSearchInputChange}
                className="w-full pl-11 pr-10 py-4 rounded-xl border border-border bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-xs hover:bg-secondary/80 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading && isAiSearching}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 flex items-center justify-center gap-2 flex-shrink-0"
            >
              {isLoading && isAiSearching ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing...</>
              ) : isSearching ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Searching...</>
              ) : (
                <>Search ✨</>
              )}
            </button>
          </form>

          {/* Active AI search status bar */}
          {isAiSearching && !isLoading && (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-primary font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                AI Recommendations for: "{searchInput}"
              </p>
              <div className="flex items-center gap-3">
                {selectedForCompare.length >= 2 && (
                  <button onClick={goToCompare} className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shadow-sm hover:opacity-90 transition-all">
                    Compare {selectedForCompare.length} Tools ⚖️
                  </button>
                )}
                <button onClick={clearSearch} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                  Clear results ✕
                </button>
              </div>
            </div>
          )}

          {/* Consultant meta panel */}
          {isAiSearching && !isLoading && consultantMeta && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-purple-500/5 border border-violet-500/20 animate-fade-in">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-500">AI Consultant</span>
                {consultantMeta.intent?.intent && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300 font-bold border border-violet-500/20">
                    Intent: {consultantMeta.intent.intent}
                  </span>
                )}
                {consultantMeta.intent?.skill_level && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 font-bold border border-blue-500/20">
                    {consultantMeta.intent.skill_level}
                  </span>
                )}
                {consultantMeta.intent?.budget_preference && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-500/20">
                    Budget: {consultantMeta.intent.budget_preference}
                  </span>
                )}
                {typeof consultantMeta.confidence === 'number' && consultantMeta.confidence > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 font-bold border border-amber-500/20">
                    Confidence: {consultantMeta.confidence}%
                  </span>
                )}
                {consultantMeta.source && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    consultantMeta.source === 'database' ? 'bg-green-500/10 text-green-600 dark:text-green-300 border-green-500/20' :
                    consultantMeta.source === 'web' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20' :
                    'bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/20'
                  }`}>
                    Source: {consultantMeta.source}
                  </span>
                )}
                {consultantMeta.fromCache && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold border border-border">
                    ⚡ Cached
                  </span>
                )}
              </div>
              {consultantMeta.reasoning && (
                <p className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-violet-500/40 pl-3">
                  {consultantMeta.reasoning}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-8">
        {!isAiSearching && (
          <>
            {/* Sort */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary w-fit">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter('sort', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sort === opt.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Canonical 17 categories */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilter('category', 'All')}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border ${
                  category === 'All'
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/30'
                }`}
              >
                All
              </button>
              {CANONICAL_CATEGORY_NAMES.map((cat) => {
                const meta = categoryMeta[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setFilter('category', cat)}
                    title={meta?.count ? `${meta.count} tools` : undefined}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border flex items-center gap-1 ${
                      category === cat
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/30'
                    }`}
                  >
                    {meta?.icon && <span>{meta.icon}</span>}
                    {cat}
                    {meta?.count > 0 && (
                      <span className={`text-[10px] px-1.5 rounded-full ${category === cat ? 'bg-white/20' : 'bg-secondary'}`}>
                        {meta.count}
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => setFilter('category', GITHUB_REPO_CATEGORY)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border ${
                  category === GITHUB_REPO_CATEGORY
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/30'
                }`}
              >
                🐙 GitHub Repos
              </button>
            </div>
          </>
        )}

        {/* Pricing filter */}
        <div className="flex flex-wrap gap-1.5">
          {PRICING.map((p) => (
            <button
              key={p}
              onClick={() => setFilter('pricing', p)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border ${
                pricing === p
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/30'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Direct Tool Result ────────────────────────────────────────────────── */}
      {showDirectToolResult && (
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎯</span>
            <h2 className="text-xl font-bold">Direct Match</h2>
            {directResult.exact_match ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 font-bold">
                Exact Match
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">
                Best Match ({Math.round((directResult.confidence || 0) * 100)}%)
              </span>
            )}
            {directResult.did_you_mean && (
              <span className="text-sm text-muted-foreground">
                Did you mean <strong>{directResult.did_you_mean}</strong>?
              </span>
            )}
            <button onClick={clearSearch} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
              ✕ Clear
            </button>
          </div>
          <div className="relative p-1 rounded-[2rem] bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-green-500/20 border border-emerald-500/30 shadow-lg">
            <div className="bg-card rounded-[1.8rem] overflow-hidden">
              <ToolCard
                tool={directResult.tool}
                isSelectedForCompare={selectedForCompare.includes(directResult.tool._id)}
                onCompare={toggleCompare}
              />
            </div>
          </div>
        </div>
      )}

      {/* Direct search — not found */}
      {showDirectNotFound && directQuery && (
        <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 animate-fade-in flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold text-orange-500">Tool not found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {directResult.message || `We couldn't find "${directQuery}" in our database.`}
            </p>
            {directResult.suggestions?.length > 0 && (
              <p className="text-sm mt-2">
                Did you mean:{' '}
                {directResult.suggestions.slice(0, 3).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => runUnifiedSearch(s.name)}
                    className="font-bold text-primary underline mr-2"
                  >
                    {s.name}
                  </button>
                ))}
              </p>
            )}
            <button onClick={clearSearch} className="mt-2 text-xs text-muted-foreground hover:text-foreground">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* GitHub live repo result */}
      {showGithubResult && (
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📡</span>
            <h2 className="text-xl font-bold text-blue-500">Live Fetched Repository</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium">GitHub</span>
          </div>
          <div className="relative p-1 rounded-[2rem] bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 border border-blue-500/30 shadow-lg">
            <div className="bg-card rounded-[1.8rem] overflow-hidden p-6">
              <GithubRepoCard repo={directResult.repo} />
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{' '}
          <strong className="text-foreground">
            {isGithubCategory ? repos.length : tools.length}
          </strong>{' '}
          {isGithubCategory ? 'repositories' : isAiSearching ? 'expert recommendations' : 'tools'}
          {isCanonicalCategory && !isAiSearching && category !== 'All' && (
            <span className="ml-1">in {category}</span>
          )}
        </p>
        {isAiSearching && !isGithubCategory && (
          <p className="text-xs text-muted-foreground italic">Select tools to compare side-by-side.</p>
        )}
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────────── */}
      {isLoading && page === 1 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isGithubCategory ? (
        repos.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card/30 animate-fade-in">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2">No matching repositories</h3>
            <p className="text-muted-foreground mb-4">Try a broader description or adjust your search.</p>
            <Link to="/discover" className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
              Browse other categories
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {repos.map((repo) => (
              <GithubRepoCard key={repo._id || repo.slug || repo.repository_url} repo={repo} />
            ))}
          </div>
        )
      ) : tools.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card/30 animate-fade-in">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-bold mb-2">No matching tools</h3>
          <p className="text-muted-foreground mb-4">
            {aiMessage || 'Try a broader description or check your filters.'}
          </p>
          {isAiSearching && (
            <button onClick={clearSearch} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
              Reset Search
            </button>
          )}
        </div>
      ) : (
        <>
          {aiMessage && isAiSearching && (
            <div className="mb-6 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 text-sm text-muted-foreground italic">
              {aiMessage}
            </div>
          )}

          {/* Top 2 highlight */}
          {!isGithubCategory && topTools.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🏆</span>
                <h2 className="text-xl font-bold">Top Matches</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {topTools.map((tool, i) => (
                  <div key={getToolKey(tool)} className="relative flex flex-col group">
                    <div className="relative p-1 rounded-[2rem] bg-gradient-to-br from-violet-500/30 via-indigo-500/20 to-purple-500/30 border border-white/10 shadow-2xl transition-all duration-500 hover:shadow-violet-500/20 hover:-translate-y-1">
                      <div className="absolute -top-4 -right-2 z-20 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-white text-[11px] font-black uppercase tracking-tighter px-4 py-1.5 rounded-full shadow-[0_4px_20px_rgba(245,158,11,0.4)] border border-white/20">
                        🏆 Best Match #{i + 1}
                      </div>
                      <div className="bg-card rounded-[1.8rem] overflow-hidden">
                        <ToolCard
                          tool={tool}
                          isSelectedForCompare={selectedForCompare.includes(tool._id)}
                          onCompare={toggleCompare}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other tools grid */}
          {!isGithubCategory && otherTools.length > 0 && (
            <div className="pt-8 border-t border-border/50">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-secondary/50 flex items-center justify-center text-xl shadow-inner border border-border/50">📋</div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">More Results</h2>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Highly rated in this category</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
                {otherTools.map((tool, i) => (
                  <div key={getToolKey(tool)} className={cn(
                    'transition-all duration-500 rounded-3xl h-full relative animate-fade-in-up',
                    selectedForCompare.includes(tool._id) ? 'ring-2 ring-primary ring-offset-4 ring-offset-background scale-[0.98]' : 'hover:-translate-y-1',
                  )} style={{ animationDelay: `${i * 40}ms` }}>
                    <ToolCard
                      tool={tool}
                      isSelectedForCompare={selectedForCompare.includes(tool._id)}
                      onCompare={toggleCompare}
                      compactCompare
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pb-20">
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={isLoading}
                className="px-10 py-4 rounded-2xl bg-card border border-border font-bold hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-2 shadow-sm"
              >
                {isLoading
                  ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  : <>{isGithubCategory ? 'Show More Repositories ⬇️' : 'Show More AI Tools ⬇️'}</>}
              </button>
            </div>
          )}
        </>
      )}

      {/* Sticky Compare Bar */}
      {!isGithubCategory && selectedForCompare.length > 0 && (
        <div className="fixed top-[64px] left-0 right-0 z-[60] animate-fade-in-up">
          <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 shadow-2xl shadow-violet-500/40 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-white text-sm font-black uppercase tracking-widest hidden sm:block">⚖️ Compare:</span>
                <div className="flex -space-x-2">
                  {selectedForCompare.map(id => {
                    const tool = tools.find(t => t._id === id);
                    return (
                      <div key={id} title={tool?.name} className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-sm border-2 border-white/30 shadow-lg">
                        {tool?.name?.charAt(0) || '?'}
                      </div>
                    );
                  })}
                  {selectedForCompare.length < 4 && (
                    <div className="w-9 h-9 rounded-xl bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center text-white/60 text-xs font-bold">
                      +{4 - selectedForCompare.length}
                    </div>
                  )}
                </div>
                <span className="text-white/80 text-sm font-semibold">
                  {selectedForCompare.length} tool{selectedForCompare.length > 1 ? 's' : ''} selected
                  {selectedForCompare.length < 2 && <span className="text-yellow-300 ml-1">(select 1 more)</span>}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedForCompare([])} className="text-white/70 hover:text-white text-xs font-bold transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10">
                  Clear ✕
                </button>
                <button
                  onClick={goToCompare}
                  disabled={selectedForCompare.length < 2}
                  className="px-6 py-2.5 rounded-xl bg-white text-violet-700 text-sm font-black shadow-xl hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 flex items-center gap-2"
                >
                  Compare Now ⚖️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
