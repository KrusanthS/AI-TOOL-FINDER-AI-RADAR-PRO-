import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../utils/cn';
import api from '../services/api';

const PRICING_COLORS = {
  free: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  freemium: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  paid: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  enterprise: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
};

const WINNER_BADGES = {
  bestOverall: { label: '🏆 Best Overall', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  bestForBeginners: { label: '🌱 Best for Beginners', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  bestForDevelopers: { label: '👨💻 Best for Developers', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  bestBudgetOption: { label: '💰 Best Budget', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  bestEnterpriseOption: { label: '🏢 Best Enterprise', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
};

function WinnerBadges({ result, toolName }) {
  const badges = Object.entries(WINNER_BADGES).filter(([key]) => result[key] === toolName);
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {badges.map(([key, { label, color }]) => (
        <span key={key} className={cn('text-[10px] px-2 py-0.5 rounded-full border font-bold', color)}>{label}</span>
      ))}
    </div>
  );
}

function FeatureTable({ featureComparison, tools }) {
  if (!featureComparison?.length) return null;
  return (
    <div className="mb-8">
      <h3 className="text-lg font-black mb-4 flex items-center gap-2">📊 Feature Comparison</h3>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-secondary/50">
              <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border w-36">Feature</th>
              {tools.map(t => (
                <th key={t._id} className="p-4 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">{t.name}</th>
              ))}
              <th className="p-4 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">Winner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {featureComparison.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? '' : 'bg-secondary/20'}>
                <td className="p-4 text-sm font-semibold">{row.feature}</td>
                {tools.map(t => (
                  <td key={t._id} className="p-4 text-center text-sm text-muted-foreground">{row.values?.[t.name] || '—'}</td>
                ))}
                <td className="p-4 text-center">
                  {row.winner && row.winner !== 'Tie' && row.winner !== 'tie'
                    ? <span className="text-xs font-black text-yellow-500">🏆 {row.winner}</span>
                    : <span className="text-xs text-muted-foreground">Tie</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PricingTable({ pricingComparison, tools }) {
  if (!pricingComparison?.length) return null;
  return (
    <div className="mb-8">
      <h3 className="text-lg font-black mb-4 flex items-center gap-2">💰 Pricing Breakdown</h3>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-secondary/50">
              <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border w-36">Tier</th>
              {tools.map(t => (
                <th key={t._id} className="p-4 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">{t.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pricingComparison.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? '' : 'bg-secondary/20'}>
                <td className="p-4 text-sm font-semibold">{row.tier}</td>
                {tools.map(t => (
                  <td key={t._id} className="p-4 text-center text-sm text-muted-foreground">{row.values?.[t.name] || '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StrengthsWeaknesses({ strengths, weaknesses }) {
  if (!strengths?.length) return null;
  return (
    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      {strengths.map((s, i) => {
        const w = weaknesses?.find(x => x.tool === s.tool);
        return (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <h4 className="font-black text-base mb-4">{s.tool}</h4>
            <div className="mb-4">
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">✅ Strengths</p>
              <ul className="space-y-1.5">
                {(s.points || []).map((p, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-emerald-500 font-bold mt-0.5 flex-shrink-0">+</span>{p}
                  </li>
                ))}
              </ul>
            </div>
            {w?.points?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">❌ Weaknesses</p>
                <ul className="space-y-1.5">
                  {w.points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-red-400 font-bold mt-0.5 flex-shrink-0">−</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AIInsights({ aiInsights }) {
  if (!aiInsights?.length) return null;
  return (
    <div className="mb-8">
      <h3 className="text-lg font-black mb-4 flex items-center gap-2">🤖 AI Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aiInsights.map((ins, i) => (
          <div key={i} className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="font-bold text-primary text-sm mb-2">{ins.title}</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{ins.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UseCases({ useCases }) {
  if (!useCases?.length) return null;
  return (
    <div className="mb-8">
      <h3 className="text-lg font-black mb-4 flex items-center gap-2">💡 Use Case Recommendations</h3>
      <div className="space-y-3">
        {useCases.map((uc, i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs flex-shrink-0">{i + 1}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{uc.scenario}</p>
              <p className="text-xs text-muted-foreground mt-1">{uc.reason}</p>
            </div>
            <span className="text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded-lg flex-shrink-0">{uc.bestTool}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceGrid({ performanceAnalysis, communityTrust, tools }) {
  if (!performanceAnalysis) return null;
  const metrics = [
    { key: 'speed', label: '⚡ Speed', data: performanceAnalysis.speed },
    { key: 'accuracy', label: '🎯 Accuracy', data: performanceAnalysis.accuracy },
    { key: 'outputQuality', label: '✨ Output Quality', data: performanceAnalysis.outputQuality },
    { key: 'apiQuality', label: '🔌 API Quality', data: performanceAnalysis.apiQuality },
    { key: 'popularity', label: '📈 Popularity', data: communityTrust?.popularity },
    { key: 'developerAdoption', label: '👨💻 Dev Adoption', data: communityTrust?.developerAdoption },
  ].filter(m => m.data);

  return (
    <div className="mb-8">
      <h3 className="text-lg font-black mb-4 flex items-center gap-2">📈 Performance & Trust</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metrics.map(m => (
          <div key={m.key} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{m.label}</p>
            <div className="space-y-2">
              {tools.map(t => (
                <div key={t._id} className="flex items-start gap-2">
                  <span className="text-xs font-bold text-primary w-20 flex-shrink-0 pt-0.5">{t.name}</span>
                  <span className="text-xs text-foreground/80">{m.data?.[t.name] || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Compare() {
  const location = useLocation();
  const [selected, setSelected] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);
  const [isComparing, setIsComparing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [compareError, setCompareError] = useState('');
  const resultRef = useRef(null);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const [p1, p2] = await Promise.all([
          api.get('/tools?limit=100&page=1'),
          api.get('/tools?limit=100&page=2'),
        ]);
        const all = [...(p1.data.tools || []), ...(p2.data.tools || [])];
        const seen = new Set();
        const tools = all.filter(t => {
          const id = t._id?.toString();
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setAvailableTools(tools);
        if (location.state?.selectedIds?.length >= 2) {
          setSelected(tools.filter(t => location.state.selectedIds.includes(t._id)));
        } else {
          const savedIds = (() => {
            try {
              const saved = localStorage.getItem('ai_radar_compare_ids');
              return saved ? JSON.parse(saved) : [];
            } catch {
              return [];
            }
          })();
          if (savedIds.length >= 2) {
            setSelected(tools.filter(t => savedIds.includes(t._id)));
          } else {
            setSelected(tools.slice(0, 2));
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchTools();
  }, [location.state]);

  useEffect(() => {
    if (selected.length > 0) {
      localStorage.setItem('ai_radar_compare_ids', JSON.stringify(selected.map(t => t._id)));
    }
  }, [selected]);

  const toggleTool = (tool) => {
    if (selected.find(t => t._id === tool._id)) setSelected(selected.filter(t => t._id !== tool._id));
    else if (selected.length < 4) setSelected([...selected, tool]);
  };

  const handleAiCompare = async () => {
    if (selected.length < 2 || isComparing) return;
    setIsComparing(true);
    setAiResult(null);
    setCompareError('');

    // Scroll to loading state immediately
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBase}/ai/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolIds: selected.map(t => t._id) }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const data = JSON.parse(payload);
            if (data.type === 'result' && data.data) {
              setAiResult(data.data);
              setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            }
          } catch { /* ignore malformed chunks */ }
        }
      }
    } catch (e) {
      console.error('Compare failed:', e);
      setCompareError('Comparison failed. Please try again.');
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight mb-2">Compare AI Tools</h1>
        <p className="text-muted-foreground text-lg">Side-by-side AI-powered analysis with real insights.</p>
      </div>

      {/* Static comparison table */}
      {selected.length >= 2 ? (
        <div className="mb-8 overflow-x-auto rounded-3xl border border-border bg-card shadow-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-secondary/50">
                <th className="text-left p-5 font-bold text-sm text-muted-foreground uppercase tracking-widest w-44 border-b border-border">Criteria</th>
                {selected.map(tool => (
                  <th key={tool._id} className="p-5 text-center border-b border-border min-w-[200px]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center overflow-hidden">
                        {tool.media?.logo
                          ? <img src={tool.media.logo} alt={tool.name} className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                          : null}
                        <span className={cn('text-xl font-black text-primary', tool.media?.logo ? 'hidden' : 'flex')}>{tool.name.charAt(0)}</span>
                      </div>
                      <span className="font-black text-base">{tool.name}</span>
                      {tool.links?.website && <a href={tool.links.website} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary/60 hover:text-primary">Visit Site ↗</a>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-5 text-sm font-bold text-muted-foreground">📁 Category</td>
                {selected.map(t => <td key={t._id} className="p-5 text-center"><span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">{t.category}</span></td>)}
              </tr>
              <tr className="bg-secondary/20">
                <td className="p-5 text-sm font-bold text-muted-foreground">💰 Pricing</td>
                {selected.map(t => {
                  const m = (t.pricing?.model || 'free').toLowerCase();
                  return <td key={t._id} className="p-5 text-center"><span className={cn('px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border', PRICING_COLORS[m] || PRICING_COLORS.free)}>{m}</span></td>;
                })}
              </tr>
              <tr>
                <td className="p-5 text-sm font-bold text-muted-foreground">⭐ Rating</td>
                {selected.map(t => {
                  const r = Number(t.stats?.rating || 0);
                  const max = Math.max(...selected.map(x => Number(x.stats?.rating || 0)));
                  return (
                    <td key={t._id} className="p-5 text-center">
                      <span className={cn('text-xl font-black', r === max ? 'text-yellow-500' : 'text-muted-foreground')}>{r} {r === max && '👑'}</span>
                      <div className="text-xs text-muted-foreground">({t.stats?.ratingCount || 0} reviews)</div>
                    </td>
                  );
                })}
              </tr>
              <tr className="bg-secondary/20">
                <td className="p-5 text-sm font-bold text-muted-foreground">📈 Popularity</td>
                {selected.map(t => {
                  const v = t.stats?.weeklyViews || 0;
                  const max = Math.max(...selected.map(x => x.stats?.weeklyViews || 0));
                  return <td key={t._id} className="p-5 text-center"><span className={cn('font-bold text-sm', v === max ? 'text-primary' : 'text-muted-foreground')}>{v.toLocaleString()} <span className="text-xs font-normal">weekly views</span></span></td>;
                })}
              </tr>
              <tr>
                <td className="p-5 text-sm font-bold text-muted-foreground">💡 Best For</td>
                {selected.map(t => (
                  <td key={t._id} className="p-5 align-top">
                    <ul className="text-xs space-y-1.5">
                      {(t.aiMeta?.useCases?.length ? t.aiMeta.useCases : [`${t.category} tasks`, 'Professional workflows', 'Team collaboration']).slice(0, 3).map((uc, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-muted-foreground"><span className="text-blue-400 mt-0.5 flex-shrink-0">→</span>{uc}</li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 rounded-3xl border border-dashed border-border bg-card/50 mb-8">
          <p className="text-6xl mb-4">⚖️</p>
          <h3 className="text-xl font-bold mb-2">Ready to Compare</h3>
          <p className="text-muted-foreground mb-4">Select at least <strong>2 tools</strong> from the list below.</p>
          <Link to="/discover" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">← Browse Tools</Link>
        </div>
      )}

      {/* AI Compare trigger */}
      {selected.length >= 2 && (
        <div className="mb-8 flex items-center justify-between gap-6 px-6 py-4 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/5 to-indigo-500/5">
          <div>
            <h2 className="text-base font-black flex items-center gap-2">
              🤖 AI Deep Analysis
              <span className="text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">Gemini Powered</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Expert AI comparison of <span className="font-semibold text-foreground">{selected.map(t => t.name).join(' vs ')}</span></p>
          </div>
          <button
            onClick={handleAiCompare}
            disabled={isComparing}
            className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-black shadow-lg shadow-violet-500/25 hover:opacity-90 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
          >
            {isComparing
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing...</>
              : <>Compare Now ✨</>}
          </button>
        </div>
      )}

      {/* Error state */}
      {compareError && !isComparing && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
          {compareError}
        </div>
      )}

      {/* Loading state */}
      {isComparing && !aiResult && (
        <div ref={resultRef} className="mb-8 p-10 rounded-3xl border border-border bg-card text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold text-lg mb-1">AI is analyzing {selected.map(t => t.name).join(' vs ')}...</p>
          <p className="text-sm text-muted-foreground">Gemini Flash is generating a comprehensive comparison</p>
        </div>
      )}

      {/* AI Result */}
      {aiResult && (
        <div ref={resultRef} className="mb-10 animate-fade-in">
          {/* Summary + Winners banner */}
          <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-purple-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🤖</span>
              <h2 className="text-xl font-black">AI Analysis Complete</h2>
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full">✅ DONE</span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed mb-5">{aiResult.summary}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(WINNER_BADGES).map(([key, { label, color }]) => aiResult[key] && (
                <div key={key} className={cn('rounded-xl border p-3 text-center', color)}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">{label}</p>
                  <p className="font-black text-sm">{aiResult[key]}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tool header cards with winner badges */}
          <div className={cn(
            'grid gap-4 mb-8',
            selected.length === 2 ? 'grid-cols-2' : 
            selected.length === 3 ? 'grid-cols-2 sm:grid-cols-3' : 
            'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          )}>
            {selected.map(tool => (
              <div key={tool._id} className="rounded-2xl border border-border bg-card p-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center overflow-hidden mx-auto mb-2">
                  {tool.media?.logo ? <img src={tool.media.logo} alt={tool.name} className="w-full h-full object-cover" /> : <span className="text-xl font-black text-primary">{tool.name.charAt(0)}</span>}
                </div>
                <p className="font-black text-sm">{tool.name}</p>
                <WinnerBadges result={aiResult} toolName={tool.name} />
              </div>
            ))}
          </div>

          <FeatureTable featureComparison={aiResult.featureComparison} tools={selected} />
          <PricingTable pricingComparison={aiResult.pricingComparison} tools={selected} />
          <StrengthsWeaknesses strengths={aiResult.strengths} weaknesses={aiResult.weaknesses} />
          <AIInsights aiInsights={aiResult.aiInsights} />
          <UseCases useCases={aiResult.useCases} />
          <PerformanceGrid performanceAnalysis={aiResult.performanceAnalysis} communityTrust={aiResult.communityTrust} tools={selected} />

          {/* Final Verdict */}
          {aiResult.finalVerdict && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
              <h3 className="font-black text-lg mb-2 flex items-center gap-2">🎯 Final Verdict</h3>
              <p className="text-white/90 leading-relaxed">{aiResult.finalVerdict}</p>
            </div>
          )}
        </div>
      )}

      {/* Tool Selector */}
      <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <p className="font-bold">Select Tools to Compare</p>
            <p className="text-xs text-muted-foreground mt-0.5">{selected.length}/4 selected · Click to add or remove</p>
          </div>
          {selected.length > 0 && <button onClick={() => setSelected([])} className="text-xs text-muted-foreground hover:text-foreground font-semibold">Clear all</button>}
        </div>
        <div className="p-5 flex flex-wrap gap-2 max-h-64 overflow-y-auto">
          {availableTools.map(tool => {
            const isSel = !!selected.find(t => t._id === tool._id);
            return (
              <button key={tool._id} onClick={() => toggleTool(tool)}
                className={cn('px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200',
                  isSel ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' : 'bg-background border-border hover:border-primary/40 text-foreground'
                )}>
                {isSel && <span className="mr-1">✓</span>}{tool.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
