import React from 'react';
import { Link } from 'react-router-dom';

const LANG_COLORS = {
  Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#2b7489',
  Java: '#b07219', 'C++': '#f34b7d', Go: '#00ADD8', Rust: '#dea584',
  Ruby: '#701516', PHP: '#4F5D95', Swift: '#ffac45', Kotlin: '#A97BFF',
  'C#': '#178600', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
  Jupyter: '#DA5B0B', R: '#198CE7', Scala: '#c22d40', Dart: '#00B4AB',
};

export default function GithubRepoCard({ repo }) {
  const {
    repository_name,
    description,
    owner_name,
    stars,
    forks,
    language,
    license,
    repository_url,
    category,
    topics,
    source,
    last_updated,
  } = repo || {};

  const isLive = source === 'github-live';
  const langColor = LANG_COLORS[language] || '#8b949e';
  const repoShortName = repository_name?.includes('/')
    ? repository_name.split('/')[1]
    : repository_name;
  const ownerName = owner_name || (repository_name?.includes('/') ? repository_name.split('/')[0] : 'GitHub');
  const displayTopics = (topics || []).slice(0, 3);
  const updatedDate = last_updated ? new Date(last_updated).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;

  return (
    <article className="group relative flex flex-col h-full rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex flex-col flex-1 p-5">

        {/* Header: icon + name + language */}
        <div className="flex items-start gap-3 mb-3">
          {/* Repo icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg font-black border border-border">
            🐙
          </div>

          {/* Name block */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
              {repoShortName || repository_name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {ownerName}
            </p>
          </div>

          {/* Language badge */}
          {language && language !== 'Unknown' && (
            <span
              className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border bg-secondary/70 text-foreground whitespace-nowrap"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: langColor }}
              />
              {language}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3 flex-1">
          {description || 'No description available.'}
        </p>

        {/* Topics */}
        {displayTopics.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {displayTopics.map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1 font-medium">
            <span className="text-yellow-400">★</span>
            <span className="text-foreground font-semibold">{(stars || 0).toLocaleString()}</span>
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span>⑂</span>
            <span className="text-foreground font-semibold">{(forks || 0).toLocaleString()}</span>
          </span>
          {license && (
            <span className="ml-auto flex items-center gap-1">
              <span>⚖</span> {license}
            </span>
          )}
          {!license && updatedDate && (
            <span className="ml-auto">{updatedDate}</span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border/60 pt-3 mt-auto flex items-center justify-between gap-2">
          {isLive ? (
            <a
              href={repository_url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
            >
              View on GitHub →
            </a>
          ) : (
            <Link
              to={`/repo/${repo.slug}`}
              className="text-[11px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
            >
              View details →
            </Link>
          )}
          <a
            href={repository_url}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-3 py-1.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1"
          >
            Open Repo
          </a>
        </div>
      </div>
    </article>
  );
}
