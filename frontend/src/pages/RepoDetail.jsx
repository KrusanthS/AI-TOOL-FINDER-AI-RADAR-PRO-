import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

export default function RepoDetail() {
  const { slug } = useParams();
  const [repo, setRepo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    api.get(`/github-repos/${slug}`)
      .then((response) => setRepo(response.data))
      .catch((err) => {
        console.error('Repo detail load failed:', err);
        setError('Repository details could not be loaded.');
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading repository details…</p>
        </div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-lg font-bold text-foreground">Repository not found</p>
        <p className="text-sm text-muted-foreground">Try another GitHub repository or return to discovery.</p>
        <Link to="/discover" className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold">Back to Discover</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">GitHub Repository</p>
          <h1 className="text-4xl font-black tracking-tight">{repo.repository_name}</h1>
          <p className="text-muted-foreground mt-2">{repo.description || 'No description available.'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={repo.repository_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
          >
            Open on GitHub
          </a>
          <Link
            to="/discover"
            className="rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            Back to Discover
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold mb-4">Repository Overview</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.28em] text-muted-foreground mb-1">Owner</dt>
                <dd className="text-sm font-semibold text-foreground">{repo.owner_name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.28em] text-muted-foreground mb-1">Category</dt>
                <dd className="text-sm font-semibold text-foreground">{repo.category || 'General'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.28em] text-muted-foreground mb-1">Language</dt>
                <dd className="text-sm font-semibold text-foreground">{repo.language || 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.28em] text-muted-foreground mb-1">License</dt>
                <dd className="text-sm font-semibold text-foreground">{repo.license || 'N/A'}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold mb-4">README Summary</h2>
            <p className="text-sm text-muted-foreground leading-7">
              {repo.readme_summary || 'No summary available for this repository.'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold mb-4">Repository Stats</h2>
            <div className="grid gap-3">
              <div className="rounded-2xl bg-secondary/70 p-4">
                <p className="text-sm text-muted-foreground">Stars</p>
                <p className="text-2xl font-black text-foreground">{repo.stars?.toLocaleString() || 0}</p>
              </div>
              <div className="rounded-2xl bg-secondary/70 p-4">
                <p className="text-sm text-muted-foreground">Forks</p>
                <p className="text-2xl font-black text-foreground">{repo.forks?.toLocaleString() || 0}</p>
              </div>
              <div className="rounded-2xl bg-secondary/70 p-4">
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="text-2xl font-black text-foreground">{repo.last_updated ? new Date(repo.last_updated).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold mb-4">Topics</h2>
            <div className="flex flex-wrap gap-2">
              {(repo.topics || []).length > 0 ? (
                repo.topics.map((topic) => (
                  <span key={topic} className="rounded-full bg-secondary/70 px-3 py-1 text-xs text-muted-foreground">#{topic}</span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No repository topics available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
