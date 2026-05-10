import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ToolCard from '../components/tools/ToolCard';
import { cn } from '../utils/cn';

const CATEGORIES = ['All', 'Writing', 'Image', 'Video', 'Audio', 'Coding', 'Marketing', 'Productivity', 'Research', 'Data', 'Cybersecurity', 'Finance', 'Legal', 'Healthcare', 'Design'];
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
  const [useCase, setUseCase] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  
  const [tools, setTools] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);

  const category = searchParams.get('category') || 'All';
  const pricing = searchParams.get('pricing') || 'All';
  const sort = searchParams.get('sort') || 'newest';
  const search = searchParams.get('search') || '';

  const setFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'All' || !value) params.delete(key);
    else params.set(key, value);
    // Reset page when filtering
    params.delete('page');
    setSearchParams(params);
  };

  useEffect(() => {
    // Reset when filters change
    setTools([]);
    setPage(1);
  }, [category, pricing, sort, search, isAiSearching]);

  useEffect(() => {
    const fetchTools = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (category !== 'All') params.append('category', category);
        if (pricing !== 'All') params.append('pricing', pricing.toLowerCase());
        if (sort) params.append('sort', sort);
        if (search) params.append('search', search);
        params.append('page', page);
        params.append('limit', 20);
        
        const response = await api.get(`/tools?${params.toString()}`);
        const fetchedTools = response.data.tools || [];
        
        setTools(prev => page === 1 ? fetchedTools : [...prev, ...fetchedTools]);
        setHasMore(page < response.data.pages);
      } catch (error) {
        console.error('Failed to fetch tools:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isAiSearching) fetchTools();
  }, [category, pricing, sort, search, page, isAiSearching]);

  const handleAiSearch = async (e) => {
    if (e) e.preventDefault();
    if (!useCase.trim()) return;

    setIsAiSearching(true);
    setIsLoading(true);
    try {
      const response = await api.post('/ai/recommend', { 
        query: useCase, 
        limit: 12,
        pricing: pricing !== 'All' ? pricing.toLowerCase() : undefined
      });
      if (response.data.message) {
        setTools([]);
        setAiMessage(response.data.message);
      } else {
        setTools(response.data || []);
        setAiMessage('');
      }
      setHasMore(false);
      setSelectedForCompare([]);
    } catch (error) {
      console.error('Failed AI search:', error);
      alert('AI Recommendation failed. Please check your API keys in the backend .env file.');
    } finally {
      setIsLoading(false);
    }
  };

  // Re-run AI search if pricing filter changes while in AI mode
  useEffect(() => {
    if (isAiSearching && useCase) {
      handleAiSearch();
    }
  }, [pricing]);

  const loadMore = () => setPage(prev => prev + 1);

  // Identify Top 2 Tools
  const topTools = [...tools]
    .sort((a, b) => (b.stats?.rating || 0) - (a.stats?.rating || 0))
    .slice(0, 2);
  
  const otherTools = tools.filter(t => !topTools.find(top => top._id === t._id));

  const toggleCompare = (toolId) => {
    if (selectedForCompare.includes(toolId)) {
      setSelectedForCompare(selectedForCompare.filter(id => id !== toolId));
    } else if (selectedForCompare.length < 4) {
      setSelectedForCompare([...selectedForCompare, toolId]);
    }
  };

  const goToCompare = () => {
    if (selectedForCompare.length < 2) return;
    // Assuming the compare page takes IDs or we can just navigate there
    navigate('/compare', { state: { selectedIds: selectedForCompare } });
  };

  const clearAiSearch = () => {
    setUseCase('');
    setAiMessage('');
    setIsAiSearching(false);
    setSelectedForCompare([]);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight mb-2">Discover AI Tools</h1>
        <p className="text-muted-foreground text-lg">Browse our curated directory, or let AI find the perfect tool for your use case.</p>
      </div>

      {/* AI Use-Case Finder */}
      <div className="mb-8 p-1 rounded-3xl bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 shadow-md">
        <div className="bg-card rounded-[22px] p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🤖</span>
            <div>
              <h2 className="text-xl font-bold text-foreground">AI Use-Case Finder</h2>
              <p className="text-sm text-muted-foreground">Describe what you want to achieve, and we'll analyze the whole directory to find your best matches.</p>
            </div>
          </div>
          
          <form onSubmit={handleAiSearch} className="flex flex-col sm:flex-row gap-3 relative">
            <input
              type="text"
              placeholder="e.g. 'I need an AI that can help me summarize legal documents and extract key dates...'"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              className="flex-1 px-5 py-4 rounded-xl border border-border bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
            />
            <button 
              type="submit" 
              disabled={isLoading || !useCase.trim()}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 flex items-center justify-center gap-2 flex-shrink-0"
            >
              {isLoading && isAiSearching ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing...</>
              ) : (
                <>Find Tools ✨</>
              )}
            </button>
          </form>

          {isAiSearching && !isLoading && (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-primary font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                AI Recommendations for: "{useCase}"
              </p>
              <div className="flex items-center gap-3">
                {selectedForCompare.length >= 2 && (
                  <button 
                    onClick={goToCompare}
                    className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shadow-sm hover:opacity-90 transition-all animate-bounce-subtle"
                  >
                    Compare {selectedForCompare.length} Selected Tools ⚖️
                  </button>
                )}
                <button onClick={clearAiSearch} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                  Clear results x
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-3">
          {!isAiSearching && (
            <>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary">
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

              <div className="hidden lg:block w-px h-6 bg-border" />

              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => {
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilter('category', cat)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border ${
                        category === cat
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/30'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-1.5">
            {PRICING.map((p) => {
              return (
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
              );
            })}
          </div>
        </div>

        {/* Global Search Input */}
        <div className="relative min-w-[300px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
          <input
            type="text"
            placeholder="Search tool names..."
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setFilter('search', e.target.value);
              }
            }}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
          />
          {search && (
            <button 
              onClick={() => setFilter('search', '')}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-xs hover:bg-secondary/80 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Search Indicator */}
      {!!search && (
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
            <span className="text-primary font-bold text-sm">Search: "{search}"</span>
            <button 
              onClick={() => setFilter('search', '')}
              className="w-5 h-5 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center text-primary text-xs transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-muted-foreground italic">Intelligent search matches synonyms and intent.</p>
        </div>
      )}

      {/* Results */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <strong className="text-foreground">{tools.length}</strong> {isAiSearching ? 'expert recommendations' : 'tools'}
        </p>
        {isAiSearching && (
          <p className="text-xs text-muted-foreground italic">
            Select tools to compare pros/cons side-by-side.
          </p>
        )}
      </div>

      {/* Grid */}
      {isLoading && page === 1 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : tools.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card/30 animate-fade-in">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-bold mb-2">No matching tools</h3>
          <p className="text-muted-foreground mb-4">{aiMessage || "Try a broader description or check your filters."}</p>
          {isAiSearching && (
            <button onClick={clearAiSearch} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
              Reset Search
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Top 2 Tools Highlight */}
          {topTools.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🏆</span>
                <h2 className="text-xl font-bold">Top Matches</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {topTools.map((tool, i) => (
                  <div key={tool._id} className="relative flex flex-col group">
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
                    {isAiSearching && tool.explanation && (
                      <div className="mt-4 p-5 bg-violet-500/5 rounded-3xl border border-violet-500/10 text-sm text-foreground/90 shadow-inner relative overflow-hidden animate-fade-in group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-indigo-500 opacity-50" />
                        <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 block mb-2 text-xs uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                          Expert Reasoning
                        </span>
                        <div className="leading-relaxed opacity-80 font-medium italic">
                          "{tool.explanation}"
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Tools Grid */}
          {otherTools.length > 0 && (
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
                  <div key={tool._id || tool.slug} className="group flex flex-col animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className={cn(
                      "transition-all duration-500 rounded-3xl h-full relative",
                      selectedForCompare.includes(tool._id) ? "ring-2 ring-primary ring-offset-4 ring-offset-background scale-[0.98]" : "hover:-translate-y-1"
                    )}>
                      <ToolCard 
                        tool={tool} 
                        isSelectedForCompare={selectedForCompare.includes(tool._id)}
                        onCompare={toggleCompare}
                        compactCompare={true}
                      />
                    </div>
                    
                    {isAiSearching && tool.explanation && (
                      <div className="mt-3 p-4 bg-secondary/30 rounded-2xl border border-border/50 text-xs text-foreground/70 shadow-sm leading-relaxed italic group-hover:bg-secondary/50 transition-colors">
                        <span className="font-bold text-primary/80 block mb-1 text-[10px] uppercase tracking-wider">Reasoning</span>
                        {tool.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show More Button */}
          {hasMore && (
            <div className="flex justify-center pb-20">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="px-10 py-4 rounded-2xl bg-card border border-border font-bold hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-2 shadow-sm"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Show More AI Tools ⬇️</>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Sticky Top Comparison Bar */}
      {selectedForCompare.length > 0 && (
        <div className="fixed top-[64px] left-0 right-0 z-[60] animate-fade-in-up">
          <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 shadow-2xl shadow-violet-500/40 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              {/* Selected Tools Avatars */}
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

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedForCompare([])}
                  className="text-white/70 hover:text-white text-xs font-bold transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
                >
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
