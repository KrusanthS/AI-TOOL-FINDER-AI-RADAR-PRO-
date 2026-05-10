// frontend/src/components/tools/ToolCard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const PRICING_COLORS = {
  free: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  freemium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  paid: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  enterprise: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

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

function StarRating({ rating }) {
  const stars = Math.round(Number(rating) || 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg 
          key={i} 
          className={cn(
            'w-3 h-3 transition-colors duration-300', 
            i < stars ? 'text-amber-400 fill-current drop-shadow-[0_0_2px_rgba(251,191,36,0.5)]' : 'text-muted-foreground/20 fill-current'
          )} 
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ToolCard({ tool, isSelectedForCompare, onCompare, compactCompare = false }) {
  const { isAuthenticated } = useAuthStore();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [saveCount, setSaveCount] = useState(tool?.stats?.saves || 0);

  const {
    _id,
    name = 'AI Tool',
    shortDescription = 'An AI-powered tool.',
    category = 'Other',
    slug = 'tool',
    pricing = { model: 'free' },
    stats = { rating: 0, ratingCount: 0, saves: 0 },
    tags = [],
    media = {},
    verified = false,
  } = tool || {};

  const pricingModel = (pricing?.model || 'free').toLowerCase();

  useEffect(() => {
    if (isAuthenticated && _id) {
      checkStatus();
    }
  }, [isAuthenticated, _id]);

  const checkStatus = async () => {
    try {
      const response = await api.get(`/bookmarks/status/${_id}`);
      setIsBookmarked(response.data.isBookmarked);
    } catch (e) {}
  };

  const toggleBookmark = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      alert('Please sign in to bookmark tools');
      return;
    }

    try {
      if (isBookmarked) {
        await api.delete(`/bookmarks/${_id}`);
        setIsBookmarked(false);
        setSaveCount(prev => prev - 1);
      } else {
        await api.post('/bookmarks', { toolId: _id });
        setIsBookmarked(true);
        setSaveCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Bookmark toggle failed:', error);
    }
  };

  return (
    <article className="group relative flex flex-col gradient-border rounded-2xl bg-card overflow-hidden hover:glow-sm hover:-translate-y-0.5 transition-all duration-200 h-full">
      {verified && (
        <div className="absolute top-3 right-3 z-10 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
          ✓ Verified
        </div>
      )}

      {/* Compare Toggle */}
      <button 
        onClick={(e) => { e.preventDefault(); onCompare?.(_id); }}
        className={cn(
          "absolute top-3 right-3 z-10 flex items-center justify-center font-bold uppercase tracking-widest border transition-all duration-500 overflow-hidden",
          compactCompare ? "w-8 h-8 rounded-full" : "px-3 py-1.5 rounded-lg text-[10px] gap-1.5",
          isSelectedForCompare 
            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/40 scale-110" 
            : "bg-background/40 backdrop-blur-xl border-white/10 text-foreground/70 hover:text-primary hover:border-primary/50 hover:bg-background/60 shadow-md"
        )}
      >
        {compactCompare ? (
          isSelectedForCompare ? '✓' : '+'
        ) : (
          <>
            <span className={cn("w-2 h-2 rounded-full", isSelectedForCompare ? "bg-white animate-pulse" : "bg-primary/50")} />
            {isSelectedForCompare ? 'Selected' : 'Compare'}
          </>
        )}
      </button>

      {/* Bookmark Button */}
      <button 
        onClick={toggleBookmark}
        className={cn(
          "absolute top-3 left-3 z-10 p-2 rounded-xl transition-all duration-300 backdrop-blur-xl border border-white/5 hover:scale-110",
          isBookmarked ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-muted-foreground/60 bg-white/5 hover:text-red-500 hover:bg-red-500/5"
        )}
      >
        <svg className={cn("w-3.5 h-3.5", isBookmarked && "fill-current")} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      <div className="p-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:scale-105 transition-transform duration-500 relative">
            {media?.logo ? (
              <img 
                src={media.logo} 
                alt={name} 
                className="w-full h-full object-cover" 
                loading="lazy" 
                onError={(e) => {
                  const domain = tool.links?.website && !tool.links.website.includes('#') 
                    ? new URL(tool.links.website).hostname 
                    : '';
                  
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
                fontSize: compactCompare ? '1.2rem' : '1.8rem'
              }}
            >
              {name.charAt(0)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <Link to={`/tool/${slug}`} className="font-extrabold text-lg leading-none hover:text-primary transition-colors block truncate mb-1.5 tracking-tight">
              {name}
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/5 text-primary/80 font-bold uppercase tracking-wider border border-primary/10">
                {category}
              </span>
              {verified && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{shortDescription}</p>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">#{tag}</span>
            ))}
            {tags.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StarRating rating={stats.rating} />
            {stats.ratingCount > 0 && (
              <span className="text-[10px] text-muted-foreground/60 font-bold tabular-nums">({stats.ratingCount.toLocaleString()})</span>
            )}
          </div>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-md border font-black uppercase tracking-widest flex-shrink-0', PRICING_COLORS[pricingModel] || PRICING_COLORS.free)}>
            {pricingModel}
          </span>
        </div>
      </div>

      {/* Hover CTA */}
      <div className="border-t border-white/5 px-6 py-3.5 flex items-center justify-between bg-secondary/20 max-h-0 overflow-hidden group-hover:max-h-20 transition-all duration-500 ease-in-out backdrop-blur-md">
        <div className="flex gap-4 items-center">
          <Link to={`/tool/${slug}`} className="text-[11px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider">
            Details →
          </Link>
          {tool?.links?.website && (
            <a href={tool.links.website} target="_blank" rel="noopener noreferrer" className="text-[11px] font-black bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-1.5 rounded-lg shadow-lg shadow-violet-500/20 hover:scale-105 transition-transform">
              Launch 🚀
            </a>
          )}
        </div>
        <button onClick={toggleBookmark} className={cn("flex items-center gap-1.5 text-[11px] font-bold transition-all hover:scale-110", isBookmarked ? "text-red-500" : "text-muted-foreground/60 hover:text-foreground")}>
          <span>{isBookmarked ? '❤️' : '💾'}</span>
          <span className="tabular-nums">{saveCount}</span>
        </button>
      </div>
    </article>
  );
}
