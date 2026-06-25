import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { name: 'Writing', icon: '✍️', color: 'from-blue-500/20 to-cyan-500/20', count: 124 },
  { name: 'Image', icon: '🎨', color: 'from-pink-500/20 to-rose-500/20', count: 89 },
  { name: 'Video', icon: '🎬', color: 'from-orange-500/20 to-amber-500/20', count: 67 },
  { name: 'Audio', icon: '🎵', color: 'from-purple-500/20 to-violet-500/20', count: 45 },
  { name: 'Coding', icon: '💻', color: 'from-green-500/20 to-emerald-500/20', count: 112 },
  { name: 'Productivity', icon: '⚡', color: 'from-yellow-500/20 to-orange-500/20', count: 98 },
  { name: 'Research', icon: '🔬', color: 'from-teal-500/20 to-cyan-500/20', count: 56 },
  { name: 'Marketing', icon: '📣', color: 'from-red-500/20 to-pink-500/20', count: 73 },
  { name: 'Data', icon: '📊', color: 'from-indigo-500/20 to-blue-500/20', count: 42 },
  { name: 'Cybersecurity', icon: '🛡️', color: 'from-slate-500/20 to-slate-700/20', count: 30 },
  { name: 'Finance', icon: '💰', color: 'from-green-500/20 to-emerald-500/20', count: 40 },
  { name: 'Legal', icon: '⚖️', color: 'from-yellow-500/20 to-amber-500/20', count: 30 },
  { name: 'Healthcare', icon: '🩺', color: 'from-red-500/20 to-pink-500/20', count: 0 },
  { name: 'Design', icon: '🎭', color: 'from-fuchsia-500/20 to-purple-500/20', count: 81 },
  { name: 'Website Builder', icon: '🌐', color: 'from-cyan-500/20 to-blue-500/20', count: 46 },
  { name: 'Repository', icon: '📦', color: 'from-slate-500/20 to-slate-700/20', count: 30 },
  { name: 'LLM', icon: '🧠', color: 'from-indigo-500/20 to-violet-500/20', count: 72 },
  { name: 'Chatbots', icon: '🤖', color: 'from-sky-500/20 to-blue-500/20', count: 55 },
  { name: 'AI Search Engines', icon: '🔎', color: 'from-yellow-500/20 to-amber-500/20', count: 40 },
];

const FEATURED_TOOLS = [
  { name: 'ChatGPT', category: 'Chat', pricing: 'Freemium', rating: 4.8, desc: 'Conversational AI for virtually any task', slug: 'chatgpt', icon: '🤖', gradient: 'from-emerald-400 to-teal-600' },
  { name: 'Midjourney', category: 'Image', pricing: 'Paid', rating: 4.9, desc: 'Generate stunning AI art from text prompts', slug: 'midjourney', icon: '🎨', gradient: 'from-violet-400 to-purple-600' },
  { name: 'GitHub Copilot', category: 'Coding', pricing: 'Paid', rating: 4.7, desc: 'AI pair programmer in your IDE', slug: 'github-copilot', icon: '👨‍💻', gradient: 'from-slate-400 to-slate-600' },
  { name: 'Notion AI', category: 'Productivity', pricing: 'Freemium', rating: 4.5, desc: 'AI writing and thinking assistant in Notion', slug: 'notion-ai', icon: '📝', gradient: 'from-orange-400 to-amber-600' },
  { name: 'Runway', category: 'Video', pricing: 'Freemium', rating: 4.6, desc: 'AI-powered video generation and editing', slug: 'runway', icon: '🎬', gradient: 'from-rose-400 to-pink-600' },
  { name: 'ElevenLabs', category: 'Audio', pricing: 'Freemium', rating: 4.8, desc: 'Ultra-realistic AI voice generation', slug: 'elevenlabs', icon: '🎙️', gradient: 'from-blue-400 to-indigo-600' },
];

const STATS = [
  { label: 'AI Tools Catalogued', value: '2,400+', icon: '🛠️' },
  { label: 'Categories Covered', value: '30+', icon: '📂' },
  { label: 'Daily Active Users', value: '12K+', icon: '👥' },
  { label: 'AI Comparisons Made', value: '89K+', icon: '⚖️' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden">
      {/* HERO SECTION */}
      <section className="relative pt-20 pb-32 px-4 overflow-hidden">
        {/* Clean background */}
        <div className="absolute inset-0 -z-10 bg-background" />

        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-ring" />
            2,400+ AI Tools Indexed & Updated Daily
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6 animate-fade-in-up">
            Discover the{' '}
            <span className="gradient-text">Best AI Tools</span>
            <br />for Every Task
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up delay-100">
            Find, compare, and bookmark top-rated AI software with our intelligent discovery engine.
            Powered by GPT-4o comparisons and real user reviews.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-10 animate-fade-in-up delay-150">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const query = e.target.search.value;
                if (query) navigate(`/discover?search=${encodeURIComponent(query)}`);
              }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative flex items-center bg-card border border-border rounded-2xl p-2 pl-6 focus-within:border-primary/50 transition-all shadow-xl">
                <span className="text-xl mr-3 opacity-50">🔍</span>
                <input
                  name="search"
                  type="text"
                  placeholder="Try 'free AI for coding' or 'best image generator'..."
                  className="flex-1 bg-transparent border-none outline-none text-lg py-2"
                />
                <button 
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in-up delay-200">
            <Link
              to="/discover"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-lg shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-200"
            >
              🚀 Start Exploring
            </Link>
            <Link
              to="/compare"
              className="px-8 py-4 rounded-2xl border border-border bg-card text-foreground font-semibold text-lg hover:bg-secondary transition-all duration-200"
            >
              ⚖️ Compare Tools
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto animate-fade-in-up delay-300">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-2xl bg-card border border-border">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-black gradient-text">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES SECTION */}
      <section className="py-16 px-4 bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Browse by Category</p>
              <h2 className="text-3xl font-black">30+ AI Categories</h2>
            </div>
            <Link to="/discover" className="text-sm font-medium text-primary hover:underline hidden md:block">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                to={`/discover?category=${cat.name}`}
                className="group flex flex-col items-center p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
                  {cat.icon}
                </div>
                <p className="font-semibold text-sm text-center">{cat.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.count} tools</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED TOOLS SECTION */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Editor's Picks</p>
              <h2 className="text-3xl font-black">Featured AI Tools</h2>
            </div>
            <Link to="/discover?sort=rating" className="text-sm font-medium text-primary hover:underline hidden md:block">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURED_TOOLS.map((tool, i) => (
              <Link
                key={tool.slug}
                to={`/tool/${tool.slug}`}
                className="group relative gradient-border rounded-2xl p-5 hover:glow-sm transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-bold text-base truncate">{tool.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground flex-shrink-0">
                        {tool.pricing}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{tool.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {tool.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-yellow-500">
                        ⭐ {tool.rating}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI POWER BANNER */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden p-10 text-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-2xl shadow-violet-500/30">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoLTZsNi02em0wLTZ2NmgtNmw2LTZ6TTMwIDM0djZoLTZsNi02ek0zMCAyOHY2aC02bDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
            <div className="relative z-10">
              <div className="text-5xl mb-4">🤖</div>
              <h2 className="text-3xl font-black mb-3">AI-Powered Comparisons</h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8 text-lg">
                Our GPT-4o engine generates structured, unbiased comparisons between tools in seconds. 
                Get feature tables, pros & cons, and intelligent recommendations.
              </p>
              <Link
                to="/compare"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-violet-700 font-bold text-base hover:bg-white/90 transition-colors shadow-lg"
              >
                ⚖️ Try AI Comparison Free
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
