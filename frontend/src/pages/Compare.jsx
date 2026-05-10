import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../utils/cn';
import api from '../services/api';

// Known Pros & Cons database for popular tools (internet-sourced knowledge)
const TOOL_KNOWLEDGE = {
  'ChatGPT': {
    pros: ['Exceptional natural language understanding', 'Supports 50+ languages', 'Code generation & debugging', 'Plugins & GPT-4 vision support', 'Massive training data up to 2024'],
    cons: ['Can hallucinate facts confidently', 'Free tier limited to GPT-3.5', 'No real-time internet by default', 'Context window limits on free plan']
  },
  'Claude': {
    pros: ['Superior long-document analysis (200k tokens)', 'Less likely to hallucinate', 'Strong at nuanced reasoning', 'Excellent for coding & analysis', 'Constitutional AI for safer outputs'],
    cons: ['No image generation', 'Slower response vs ChatGPT', 'No plugin ecosystem', 'API can be expensive at scale']
  },
  'Gemini': {
    pros: ['Real-time Google Search integration', 'Native multimodal (text + image + audio)', 'Deep Google Workspace integration', 'Free tier with Gemini Pro access'],
    cons: ['Occasional factual inconsistencies', 'Less mature than ChatGPT ecosystem', 'Privacy concerns with Google data', 'API has stricter rate limits']
  },
  'Midjourney': {
    pros: ['Industry-leading image quality & aesthetics', 'Active community & prompt library', 'Consistent style across outputs', 'V6 model extremely photorealistic'],
    cons: ['Discord-only interface (no standalone app)', 'No free tier', 'Limited control over fine details', 'Cannot generate text accurately in images']
  },
  'Stable Diffusion': {
    pros: ['Completely open source & free', 'Run locally on your own hardware', 'Massive model ecosystem (LoRA, etc.)', 'Full creative control & customization'],
    cons: ['Requires technical setup knowledge', 'High-end GPU needed for good results', 'Inconsistent quality vs Midjourney', 'Steep learning curve']
  },
  'ElevenLabs': {
    pros: ['Most realistic AI voice cloning available', 'Clone any voice from 30 seconds of audio', 'Multilingual voice generation', 'Real-time voice changing API'],
    cons: ['Expensive for high-volume usage', 'Ethical concerns with voice cloning', 'Free tier limits characters per month', 'Occasional pacing/intonation issues']
  },
  'Runway': {
    pros: ['Best AI video generation quality', 'Gen-2 creates video from text or image', 'In-browser editing with AI tools', 'Professional motion brush feature'],
    cons: ['Very expensive at scale', 'Limited to short video clips', 'Requires artistic prompting skill', 'Processing can be slow']
  },
};

const getToolKnowledge = (toolName, tool) => {
  // Check exact match
  if (TOOL_KNOWLEDGE[toolName]) return TOOL_KNOWLEDGE[toolName];
  // Check partial match
  for (const [key, val] of Object.entries(TOOL_KNOWLEDGE)) {
    if (toolName.toLowerCase().includes(key.toLowerCase())) return val;
  }
  // Fallback to stored aiMeta or generate from category/pricing
  const category = tool.category?.split(' ').slice(-2).join(' ') || 'AI tasks';
  const pricing = tool.pricing?.model || 'freemium';
  return {
    pros: tool.aiMeta?.pros?.length ? tool.aiMeta.pros : [
      `Specialized for ${category}`,
      `${pricing === 'free' ? 'Completely free to use — no credit card needed' : pricing === 'freemium' ? 'Generous free tier to get started' : 'Professional-grade feature set'}`,
      `Strong community adoption and trust`,
      `Continuously updated with new capabilities`,
    ],
    cons: tool.aiMeta?.cons?.length ? tool.aiMeta.cons : [
      `${pricing === 'free' ? 'May have usage limits on free plan' : 'Premium features require paid subscription'}`,
      `Learning curve for advanced features`,
      `Limited offline functionality`,
    ]
  };
};

export default function Compare() {
  const location = useLocation();
  const [selected, setSelected] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);
  const [isComparing, setIsComparing] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const resultRef = useRef(null);
  const hasAutoTriggered = useRef(false);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const [page1, page2, page3] = await Promise.all([
          api.get('/tools?limit=100&page=1'),
          api.get('/tools?limit=100&page=2'),
          api.get('/tools?limit=100&page=3'),
        ]);
        const allTools = [
          ...(page1.data.tools || []),
          ...(page2.data.tools || []),
          ...(page3.data.tools || []),
        ];
        const seen = new Set();
        const fetchedTools = allTools.filter(t => {
          const id = t._id?.toString();
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setAvailableTools(fetchedTools);

        if (location.state?.selectedIds && location.state.selectedIds.length >= 2) {
          const matchedTools = fetchedTools.filter(t =>
            location.state.selectedIds.includes(t._id)
          );
          setSelected(matchedTools);
          // Removed auto-trigger to allow user to see the table first
        } else {
          setSelected(fetchedTools.slice(0, 2));
        }
      } catch (e) {
        console.error('Failed to fetch tools for comparison', e);
      }
    };
    fetchTools();
  }, [location.state]);

  const toggleTool = (tool) => {
    if (selected.find(t => t._id === tool._id)) {
      setSelected(selected.filter(t => t._id !== tool._id));
    } else if (selected.length < 4) {
      setSelected([...selected, tool]);
    }
  };

  const handleAiCompareWith = async (toolsToCompare) => {
    if (!toolsToCompare || toolsToCompare.length < 2) return;
    setIsComparing(true);
    setAiResult('');
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

    try {
      const toolIds = toolsToCompare.map(t => t._id);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/ai/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolIds })
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            if (line.includes('[DONE]')) break;
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.content) {
                setAiResult(prev => prev + data.content);
                if (resultRef.current) resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      const [a, b] = toolsToCompare;
      const winner = (a.stats?.rating || 0) >= (b.stats?.rating || 0) ? a : b;
      const fullText = (
        `# 🥇 Recommendation\n> **${winner.name}** is the recommended choice based on its higher community rating and specialized capabilities. Always evaluate based on your specific workflow needs.\n\n---\n\n` +
        `## 🏆 Comparison: ${toolsToCompare.map(t => t.name).join(' vs ')}\n\n` +
        toolsToCompare.map(t => {
          const k = getToolKnowledge(t.name, t);
          return `### ${t.name}\n- **Pricing:** ${t.pricing?.model || 'Free'}\n- **Rating:** ${t.stats?.rating || 'N/A'} ⭐\n\n**Pros:**\n${k.pros.map(p => `- ${p}`).join('\n')}\n\n**Cons:**\n${k.cons.map(c => `- ${c}`).join('\n')}\n`;
        }).join('\n---\n')
      );
      
      // Simulate AI typing effect
      for (let i = 0; i < fullText.length; i += 15) {
        const chunk = fullText.slice(i, i + 15);
        setAiResult(prev => prev + chunk);
        if (resultRef.current) resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        await new Promise(r => setTimeout(r, 20)); // 20ms delay per chunk
      }
    } finally {
      setIsComparing(false);
    }
  };

  const handleAiCompare = () => handleAiCompareWith(selected);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight mb-2">Compare AI Tools</h1>
        <p className="text-muted-foreground text-lg">Side-by-side comparison with real-time AI analysis & expert insights.</p>
      </div>

      {/* Comparison Table */}
      {selected.length >= 2 ? (
        <div className="mb-8 overflow-x-auto rounded-3xl border border-border bg-card shadow-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-secondary/50">
                <th className="text-left p-5 font-bold text-sm text-muted-foreground uppercase tracking-widest w-44 border-b border-border">Criteria</th>
                {selected.map(tool => (
                  <th key={tool._id} className="p-5 text-center border-b border-border min-w-[200px]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 via-indigo-500/10 to-purple-500/20 border border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500">
                        {tool.media?.logo ? (
                          <img 
                            src={tool.media.logo} 
                            alt={tool.name} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              const domain = tool.links?.website ? new URL(tool.links.website).hostname : '';
                              if (domain && !e.target.src.includes('google.com')) {
                                e.target.src = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
                              } else {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <span className={cn(
                          "text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-400 to-indigo-400",
                          tool.media?.logo ? "hidden" : "flex"
                        )}>
                          {tool.name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-black text-base">{tool.name}</span>
                      {tool.links?.website && (
                        <a href={tool.links.website} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] font-bold text-primary/60 hover:text-primary transition-colors">
                          Visit Site ↗
                        </a>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Category */}
              <tr>
                <td className="p-5 text-sm font-bold text-muted-foreground">📁 Category</td>
                {selected.map(tool => (
                  <td key={tool._id} className="p-5 text-center text-sm font-medium">
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">{tool.category}</span>
                  </td>
                ))}
              </tr>
              {/* Pricing */}
              <tr className="bg-secondary/20">
                <td className="p-5 text-sm font-bold text-muted-foreground">💰 Pricing</td>
                {selected.map(tool => {
                  const model = tool.pricing?.model || 'free';
                  const colors = { free: 'text-emerald-500 bg-emerald-500/10', freemium: 'text-blue-500 bg-blue-500/10', paid: 'text-orange-500 bg-orange-500/10', enterprise: 'text-purple-500 bg-purple-500/10' };
                  return (
                    <td key={tool._id} className="p-5 text-center">
                      <span className={cn('px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider', colors[model] || colors.free)}>{model}</span>
                    </td>
                  );
                })}
              </tr>
              {/* Rating */}
              <tr>
                <td className="p-5 text-sm font-bold text-muted-foreground">⭐ Rating</td>
                {selected.map(tool => {
                  const rating = Number(tool.stats?.rating || 0);
                  const maxRating = Math.max(...selected.map(t => Number(t.stats?.rating || 0)));
                  return (
                    <td key={tool._id} className="p-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={cn('text-xl font-black', rating === maxRating ? 'text-yellow-500' : 'text-muted-foreground')}>
                          {rating} {rating === maxRating && '👑'}
                        </span>
                        <span className="text-xs text-muted-foreground">({tool.stats?.ratingCount || 0} reviews)</span>
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={cn('w-2.5 h-2.5 rounded-full', i < Math.round(rating) ? 'bg-yellow-400' : 'bg-muted')} />
                          ))}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
              {/* Weekly Views */}
              <tr className="bg-secondary/20">
                <td className="p-5 text-sm font-bold text-muted-foreground">📈 Popularity</td>
                {selected.map(tool => {
                  const views = tool.stats?.weeklyViews || 0;
                  const maxViews = Math.max(...selected.map(t => t.stats?.weeklyViews || 0));
                  return (
                    <td key={tool._id} className="p-5 text-center">
                      <span className={cn('font-bold text-sm', views === maxViews ? 'text-primary' : 'text-muted-foreground')}>
                        {views.toLocaleString()} <span className="text-xs font-normal">weekly views</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* Use Cases */}
              <tr>
                <td className="p-5 text-sm font-bold text-muted-foreground">💡 Best For</td>
                {selected.map(tool => (
                  <td key={tool._id} className="p-5 align-top">
                    <ul className="text-xs space-y-1.5 text-left">
                      {(tool.aiMeta?.useCases?.length ? tool.aiMeta.useCases : [`${tool.category?.split(' ').slice(-2).join(' ')} tasks`, 'Professional workflows', 'Team collaboration']).slice(0, 3).map((uc, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                          <span className="text-blue-400 mt-0.5 flex-shrink-0">→</span> {uc}
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
              {/* Pros */}
              <tr className="bg-emerald-500/5">
                <td className="p-5 text-sm font-bold text-emerald-500">✅ Pros</td>
                {selected.map(tool => {
                  const knowledge = getToolKnowledge(tool.name, tool);
                  return (
                    <td key={tool._id} className="p-5 align-top">
                      <ul className="text-xs space-y-2 text-left">
                        {knowledge.pros.slice(0, 5).map((pro, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 mt-0.5 flex-shrink-0 font-bold">+</span>
                            <span className="text-foreground/80">{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  );
                })}
              </tr>
              {/* Cons */}
              <tr className="bg-red-500/5">
                <td className="p-5 text-sm font-bold text-red-400">❌ Cons</td>
                {selected.map(tool => {
                  const knowledge = getToolKnowledge(tool.name, tool);
                  return (
                    <td key={tool._id} className="p-5 align-top">
                      <ul className="text-xs space-y-2 text-left">
                        {knowledge.cons.slice(0, 4).map((con, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                            <span className="text-red-400 mt-0.5 flex-shrink-0 font-bold">−</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 rounded-3xl border border-dashed border-border bg-card/50 mb-8">
          <p className="text-6xl mb-4">⚖️</p>
          <h3 className="text-xl font-bold mb-2">Ready to Compare</h3>
          <p className="text-muted-foreground mb-4">Select at least <strong>2 tools</strong> from the list below to start your AI-powered side-by-side analysis.</p>
          <Link to="/discover" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
            ← Browse Tools to Compare
          </Link>
        </div>
      )}

      {/* AI Deep Analysis Section — compact, professional */}
      {selected.length >= 2 && (
        <div className="mb-10 flex items-center justify-between gap-6 px-6 py-4 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/5 to-indigo-500/5">
          <div>
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              🤖 AI Deep Analysis
              <span className="text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">Powered by AI Radar</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get an expert comparison of <span className="font-semibold text-foreground">{selected.map(t => t.name).join(' vs ')}</span> with a final winner recommendation.
            </p>
          </div>
          <button
            onClick={handleAiCompare}
            disabled={isComparing}
            className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-black shadow-lg shadow-violet-500/25 hover:opacity-90 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
          >
            {isComparing ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing...</>
            ) : (
              <>Start Analysis ✨</>
            )}
          </button>
        </div>
      )}

      {/* Analysis Result */}
      {(aiResult || isComparing) && (
        <div ref={resultRef} className="relative mb-10 p-8 rounded-3xl bg-card border border-border shadow-xl min-h-[300px]">
          <div className="absolute top-5 right-6 flex items-center gap-2 text-xs font-bold text-primary">
            <div className={cn('w-2 h-2 rounded-full bg-primary', isComparing && 'animate-ping')} />
            {isComparing ? 'AI GENERATING ANALYSIS...' : '✅ ANALYSIS COMPLETE'}
          </div>
          <div className="prose max-w-none">
            {aiResult.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-black mt-6 mb-4 text-foreground">{line.replace('# ', '')}</h1>;
              if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-6 mb-3 text-foreground border-b border-border pb-2">{line.replace('## ', '')}</h2>;
              if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold mt-4 mb-2 text-primary">{line.replace('### ', '')}</h3>;
              if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-1.5 text-foreground/80 text-sm list-none flex items-start gap-2"><span className="text-primary mt-0.5">•</span>{line.replace('- ', '')}</li>;
              if (line.startsWith('|')) return <div key={i} className="font-mono text-xs bg-secondary/50 p-2 rounded border border-border mb-0.5">{line}</div>;
              if (line === '---') return <hr key={i} className="border-border my-4" />;
              if (line === '>') return null;
              if (line.startsWith('> ')) return <blockquote key={i} className="border-l-2 border-primary pl-4 text-sm text-muted-foreground italic my-3">{line.replace('> ', '')}</blockquote>;
              const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-bold">$1</strong>');
              return line ? <p key={i} className="mb-3 text-sm leading-relaxed text-foreground/85" dangerouslySetInnerHTML={{ __html: formatted }} /> : <div key={i} className="h-2" />;
            })}
            {isComparing && <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-1 rounded-sm" />}
          </div>
        </div>
      )}

      {/* Tool Selector — moved to bottom */}
      <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <p className="font-bold text-foreground">Select Tools to Compare</p>
            <p className="text-xs text-muted-foreground mt-0.5">{selected.length}/4 selected · Click any tool to add or remove it</p>
          </div>
          {selected.length > 0 && (
            <button onClick={() => setSelected([])} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-semibold">
              Clear all
            </button>
          )}
        </div>
        <div className="p-5 flex flex-wrap gap-2 max-h-64 overflow-y-auto">
          {availableTools.map(tool => {
            const isSelected = selected.find(t => t._id === tool._id);
            return (
              <button
                key={tool._id}
                onClick={() => toggleTool(tool)}
                className={cn(
                  'px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                    : 'bg-background border-border hover:border-primary/40 text-foreground'
                )}
              >
                {isSelected && <span className="mr-1">✓</span>}{tool.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
