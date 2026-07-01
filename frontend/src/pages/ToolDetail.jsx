import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getReposForTool } from '../services/api';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/authStore';

const FALLBACK_COLORS = [
  '#7C3AED', // Violet
  '#2563EB', // Blue
  '#DB2777', // Pink
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Red
  '#4B5563', // Gray
];

const getRandomColor = (name) => {
  if (!name) return FALLBACK_COLORS[0];
  const code = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_COLORS[code % FALLBACK_COLORS.length];
};

const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
};

function ProsConsCard({ pros = [], cons = [] }) {
  if (pros.length === 0 && cons.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
      {pros.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h3 className="font-bold text-emerald-500 mb-4 flex items-center gap-2"><span>✅</span> Pros</h3>
          <ul className="space-y-2">
            {pros.map((pro, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-emerald-500 mt-0.5 flex-shrink-0">+</span>{pro}
              </li>
            ))}
          </ul>
        </div>
      )}
      {cons.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <h3 className="font-bold text-red-400 mb-4 flex items-center gap-2"><span>❌</span> Cons</h3>
          <ul className="space-y-2">
            {cons.map((con, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-red-400 mt-0.5 flex-shrink-0">−</span>{con}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RelatedRepos({ toolName, category }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!toolName && !category) return;
    setLoading(true);
    getReposForTool(toolName, category)
      .then((data) => setRepos(data.repos || []))
      .finally(() => setLoading(false));
  }, [toolName, category]);

  if (!loading && repos.length === 0) return null;

  return (
    <div className="mb-12 mt-12">
      <h2 className="text-xl font-bold mb-5 flex items-center gap-2">🐙 Related GitHub Repositories</h2>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted rounded w-full mb-2" />
              <div className="h-3 bg-muted rounded w-4/5 mb-4" />
              <div className="flex gap-3">
                <div className="h-8 bg-muted rounded-xl w-1/2" />
                <div className="h-8 bg-muted rounded-xl w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {repos.map((repo) => (
            <a
              key={repo.repository_url}
              href={repo.repository_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:-translate-y-1 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-2 flex-1">
                  {repo.repository_name}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border uppercase font-black tracking-widest text-muted-foreground flex-shrink-0">
                  {repo.language || 'Code'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1">
                {repo.description || 'No description available.'}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                <span className="flex items-center gap-1">⭐ {repo.stars?.toLocaleString() || 0} stars</span>
                <span className="flex items-center gap-1">🍴 {repo.forks?.toLocaleString() || 0} forks</span>
              </div>
              <div className="mt-3 text-[11px] font-bold uppercase tracking-widest text-primary group-hover:underline">
                View on GitHub →
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ToolDetail() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuthStore();
  const [data, setData] = useState({ tool: null, versions: [], related: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState('');

  const [compareIds, setCompareIds] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_radar_compare_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const fetchTool = async () => {
      try {
        const response = await api.get(`/tools/${slug}`);
        setData(response.data);
      } catch (err) {
        setError("The tool couldn't be found or doesn't exist yet.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTool();
  }, [slug]);

  const { tool, versions, related } = data;

  const handleCompareToggle = () => {
    if (!tool?._id) return;
    let newIds;
    if (compareIds.includes(tool._id)) {
      newIds = compareIds.filter(id => id !== tool._id);
    } else {
      if (compareIds.length >= 4) {
        alert('You can compare up to 4 tools.');
        return;
      }
      newIds = [...compareIds, tool._id];
    }
    setCompareIds(newIds);
    localStorage.setItem('ai_radar_compare_ids', JSON.stringify(newIds));
  };

  const handleAnalyze = async () => {
    if (isAnalyzing || analysisResult) return;
    setIsAnalyzing(true);
    setAnalysisError('');
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBase}/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: tool?.name,
          toolId: tool?._id,
          context: {
            tool_category: tool?.category,
            tool_pricing: tool?.pricing?.model,
          },
        }),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const result = await response.json();

      // API returns { tool, analysis } — extract the analysis object for rendering
      const analysisData = result.analysis || result;
      // Normalise final_verdict from various possible fields
      if (!analysisData.final_verdict) {
        analysisData.final_verdict =
          analysisData.final_recommendation?.summary ||
          analysisData.recommendation ||
          null;
      }
      // Coerce not_suitable_for to array if backend returned a string
      if (analysisData.use_case_analysis?.not_suitable_for && !Array.isArray(analysisData.use_case_analysis.not_suitable_for)) {
        analysisData.use_case_analysis.not_suitable_for = [analysisData.use_case_analysis.not_suitable_for];
      }
      setAnalysisResult(analysisData);
    } catch (err) {
      setAnalysisError('AI analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isToolSelectedForCompare = tool?._id && compareIds.includes(tool._id);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading tool details...</p>
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-3xl font-bold mb-3">Tool not found</h1>
        <p className="text-muted-foreground mb-8">{error}</p>
        <Link to="/discover" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
          Browse All Tools
        </Link>
      </div>
    );
  }

  const { name, category, pricing, stats, description, shortDescription, short_description, links, website_url, aiMeta, tags, verified, media } = tool;
  const displayDescription = stripHtml(shortDescription || short_description || '');
  const cleanDescription = stripHtml(description || '');
  const websiteUrl = links?.website || website_url || '';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        <span>/</span>
        <Link to="/discover" className="hover:text-foreground transition-colors">Discover</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{name}</span>
      </nav>

      {/* Hero */}
      <div className="gradient-border rounded-3xl bg-card p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-secondary border border-border flex items-center justify-center text-4xl font-black text-primary flex-shrink-0 overflow-hidden relative">
            {media?.logo ? (
              <img 
                src={media.logo} 
                alt={name} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  const domain = websiteUrl ? (() => { try { return new URL(websiteUrl).hostname; } catch(e) { return ''; } })() : '';
                  if (domain && !e.target.src.includes('google.com')) {
                    e.target.src = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
                  } else {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement.querySelector('.logo-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div 
              className={cn(
                "logo-fallback absolute inset-0 items-center justify-center font-black text-white",
                media?.logo ? "hidden" : "flex"
              )}
              style={{
                backgroundColor: getRandomColor(name),
              }}
            >
              {name ? name.charAt(0) : '?'}
            </div>
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black">{name}</h1>
                {verified && <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">✓ Verified</span>}
              </div>
              <div className="flex flex-wrap gap-2.5 items-center">
                {/* Compare Button */}
                <button
                  onClick={handleCompareToggle}
                  className={cn(
                    "px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-sm font-bold border transition-all duration-300 flex items-center gap-2",
                    isToolSelectedForCompare
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                      : "bg-secondary text-foreground border-border hover:bg-secondary/80"
                  )}
                >
                  {isToolSelectedForCompare ? '✓ Selected' : '⚖️ Compare'}
                </button>

                {compareIds.length >= 2 && (
                  <Link
                    to="/compare"
                    className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-sm bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg flex items-center gap-1.5"
                  >
                    Compare Now ({compareIds.length}) ⚖️
                  </Link>
                )}

                {/* Redirect to Actual Tool Website Button */}
                {websiteUrl && (
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/20 flex items-center gap-2">
                    Launch 🚀
                  </a>
                )}
              </div>
            </div>
            <p className="text-lg text-muted-foreground mb-4">{displayDescription}</p>

            {/* Meta row */}
            <div className="flex flex-wrap gap-3 mb-5">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">{category}</span>
              <span className="px-3 py-1 rounded-full bg-secondary border border-border text-sm font-medium capitalize">{pricing?.model || 'Free'}</span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-yellow-500">⭐ {stats?.rating || 0} <span className="text-muted-foreground font-normal">({stats?.ratingCount || 0} reviews)</span></span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">👁 {(stats?.views || 0).toLocaleString()} views</span>
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {tags.map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {aiMeta?.summary && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mb-8">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
            <div className="flex-1">
              <h2 className="font-bold text-primary mb-2 flex items-center gap-2">🤖 AI Summary</h2>
              <p className="text-sm leading-relaxed text-foreground">{aiMeta.summary}</p>
            </div>

            {/* Analyze button — fires automatically on click */}
            {!analysisResult && (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-black shadow-lg shadow-violet-500/25 hover:opacity-90 hover:scale-105 transition-all disabled:opacity-60 disabled:scale-100 self-start"
              >
                {isAnalyzing ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing...</>
                ) : (
                  <>⚡ AI Analysis</>
                )}
              </button>
            )}
          </div>

          {/* Loading */}
          {isAnalyzing && !analysisResult && (
            <div className="mt-4 p-6 rounded-2xl border border-border bg-card text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="font-bold">AI is analysing {tool?.name}...</p>
              <p className="text-xs text-muted-foreground mt-1">Gemini is generating a deep analysis</p>
            </div>
          )}

          {/* Error */}
          {analysisError && !isAnalyzing && (
            <p className="mt-3 text-sm text-red-500 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20">{analysisError}</p>
          )}

          {/* Results */}
          {analysisResult && (
            <div className="mt-4 border-t border-primary/20 pt-4 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <h3 className="font-black text-base">AI Analysis Complete</h3>
                  <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full">DONE</span>
                </div>
                <button onClick={() => { setAnalysisResult(null); setAnalysisError(''); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clear ✕</button>
              </div>

              {/* Overview */}
              {analysisResult.overview && (
                <div className="p-4 rounded-xl bg-card border border-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">📋 Overview</p>
                  <p className="text-sm text-foreground/90 leading-relaxed">{analysisResult.overview.what_it_does || analysisResult.overview.best_for}</p>
                </div>
              )}

              {/* Use case fit */}
              {analysisResult.use_case_analysis && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysisResult.use_case_analysis.ideal_use_cases?.length > 0 && (
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">✅ Ideal For</p>
                      <ul className="space-y-1">
                        {analysisResult.use_case_analysis.ideal_use_cases.slice(0, 3).map((u, i) => (
                          <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5"><span className="text-emerald-500 font-bold mt-0.5">+</span>{u}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysisResult.use_case_analysis.not_suitable_for?.length > 0 && (
                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                      <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">⚠️ Not Ideal For</p>
                      <ul className="space-y-1">
                        {analysisResult.use_case_analysis.not_suitable_for.slice(0, 3).map((u, i) => (
                          <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5"><span className="text-red-400 font-bold mt-0.5">−</span>{u}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Pros / Cons */}
              {(analysisResult.pros?.length > 0 || analysisResult.cons?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysisResult.pros?.length > 0 && (
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">✅ Pros</p>
                      <ul className="space-y-1.5">
                        {analysisResult.pros.slice(0, 4).map((p, i) => (
                          <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                            <span className="text-emerald-500 font-bold mt-0.5 flex-shrink-0">+</span>
                            {typeof p === 'object' ? p.point : p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysisResult.cons?.length > 0 && (
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">❌ Cons</p>
                      <ul className="space-y-1.5">
                        {analysisResult.cons.slice(0, 4).map((c, i) => (
                          <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                            <span className="text-red-400 font-bold mt-0.5 flex-shrink-0">−</span>
                            {typeof c === 'object' ? c.point : c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Pricing */}
              {analysisResult.pricing_analysis && (
                <div className="p-4 rounded-xl bg-card border border-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">💰 Pricing Fit</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {analysisResult.pricing_analysis.free_tier && (
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">Free tier: {analysisResult.pricing_analysis.free_tier}</span>
                    )}
                    {analysisResult.pricing_analysis.value_for_money && (
                      <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-medium capitalize">Value: {analysisResult.pricing_analysis.value_for_money}</span>
                    )}
                    {analysisResult.pricing_analysis.target_budget && (
                      <span className="px-2 py-1 rounded-lg bg-secondary text-muted-foreground border border-border font-medium">{analysisResult.pricing_analysis.target_budget}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Learning curve */}
              {analysisResult.learning_curve && (
                <div className="p-4 rounded-xl bg-card border border-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">📚 Learning Curve</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {analysisResult.learning_curve.difficulty && (
                      <span className={cn(
                        'px-2 py-1 rounded-lg border font-bold capitalize',
                        analysisResult.learning_curve.difficulty === 'beginner' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        analysisResult.learning_curve.difficulty === 'advanced' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      )}>{analysisResult.learning_curve.difficulty}</span>
                    )}
                    {analysisResult.learning_curve.time_to_productivity && (
                      <span className="text-muted-foreground">⏱ {analysisResult.learning_curve.time_to_productivity}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Final verdict */}
              {(analysisResult.final_verdict || analysisResult.recommendation) && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">🎯 Final Verdict</p>
                  <p className="text-sm leading-relaxed">{analysisResult.final_verdict || analysisResult.recommendation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">About {name}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{cleanDescription}</p>
      </div>

      {/* Pros & Cons */}
      <ProsConsCard pros={aiMeta?.pros} cons={aiMeta?.cons} />

      {/* Use Cases */}
      {aiMeta?.useCases?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">💡 Use Cases</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {aiMeta.useCases.map((uc, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">{i + 1}</div>
                <p className="text-sm">{uc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Plans */}
      {pricing?.plans?.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-5">💰 Pricing Plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {pricing.plans.map((plan, i) => (
              <div key={i} className={`rounded-2xl border p-5 ${i === 1 ? 'border-primary bg-primary/5 glow-sm' : 'border-border bg-card'}`}>
                {i === 1 && <div className="text-xs font-bold text-primary mb-2">⭐ Most Popular</div>}
                <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                <p className="text-2xl font-black mb-4">${plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <ul className="space-y-1.5">
                  {(plan.features || []).map((f, j) => (
                    <li key={j} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Available Versions */}
      {versions && versions.length > 0 && (
        <div className="mb-8 mt-12">
          <h2 className="text-xl font-bold mb-5 flex items-center gap-2">🔄 Other Versions of {name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {versions.map((v) => (
              <Link
                key={v.slug}
                to={`/tool/${v.slug}`}
                className="group p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold group-hover:text-primary transition-colors">{v.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border uppercase font-black tracking-widest text-muted-foreground">Version</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">⭐ {v.stats.rating}</span>
                  <span className="capitalize">{v.pricing.model}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related GitHub Repositories */}
      <RelatedRepos toolName={name} category={category} />

      {/* Related Tools */}
      {related && related.length > 0 && (
        <div className="mb-12 mt-12">
          <h2 className="text-xl font-bold mb-5 flex items-center gap-2">✨ You Might Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link
                key={r.slug}
                to={`/tool/${r.slug}`}
                className="group p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold group-hover:text-primary transition-colors">{r.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase font-black tracking-widest">Similar</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">⭐ {r.stats.rating}</span>
                  <span className="capitalize">{r.pricing.model}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
