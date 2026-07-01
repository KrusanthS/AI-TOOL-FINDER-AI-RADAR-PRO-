import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import ToolCard from '../components/tools/ToolCard';
import api from '../services/api';

export default function Bookmarks() {
  const { isAuthenticated, user } = useAuthStore();
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookmarks();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchBookmarks = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/bookmarks');
      setBookmarks(response.data || []);
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Your Bookmarks</h1>
          <p className="text-muted-foreground text-lg">Manage your saved AI tools and quick access links.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse h-64" />
          ))}
        </div>
      ) : !isAuthenticated ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card/50">
          <div className="text-5xl mb-4">🔖</div>
          <h3 className="text-xl font-bold mb-2">Sign in to see your bookmarks</h3>
          <p className="text-muted-foreground mb-6">Save your favourite AI tools and access them here.</p>
        </div>
      ) : bookmarks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {bookmarks.map((tool, i) => (
            <div key={tool._id} className="animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
              <ToolCard tool={tool} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card/50">
          <div className="text-5xl mb-4">🔖</div>
          <h3 className="text-xl font-bold mb-2">No bookmarks yet</h3>
          <p className="text-muted-foreground mb-6">Start exploring tools and save them for later.</p>
          <Link to="/discover" className="px-6 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-secondary transition-colors">
            Discover Tools
          </Link>
        </div>
      )}
    </div>
  );
}
