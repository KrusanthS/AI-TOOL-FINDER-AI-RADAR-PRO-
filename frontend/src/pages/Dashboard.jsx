import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-3xl font-bold mb-3">Sign in required</h1>
        <p className="text-muted-foreground mb-8">You need to sign in to access your dashboard.</p>
        <button className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-violet-500/25 transition-all">
          Sign In
        </button>
      </div>
    );
  }

  const [bookmarkedTools, setBookmarkedTools] = React.useState([]);

  React.useEffect(() => {
    if (isAuthenticated) {
      import('../services/api').then(({ default: api }) => {
        api.get('/bookmarks').then(res => {
          setBookmarkedTools(res.data || []);
        }).catch(err => console.error('Failed to fetch bookmarks for dashboard', err));
      });
    }
  }, [isAuthenticated]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="flex items-center gap-6 mb-10">
        <img
          src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=6d28d9&color=fff`}
          alt="Avatar"
          className="w-20 h-20 rounded-2xl border-4 border-card shadow-lg"
        />
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-1">Welcome back, {user?.displayName || 'User'}!</h1>
          <p className="text-muted-foreground">Manage your preferences and view your activity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Quick Stats */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Bookmarked Tools</h3>
            <span className="text-2xl">🔖</span>
          </div>
          <p className="text-4xl font-black gradient-text">{bookmarkedTools.length}</p>
          <Link to="/bookmarks" className="text-sm text-primary hover:underline mt-2 inline-block">View bookmarks →</Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Role</h3>
            <span className="text-2xl">👤</span>
          </div>
          <p className="text-4xl font-black gradient-text capitalize">{user?.role || 'User'}</p>
          <span className="text-sm text-muted-foreground mt-2 inline-block">Account Level</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Member Since</h3>
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-4xl font-black gradient-text">
            {user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear()}
          </p>
          <Link to="/discover" className="text-sm text-primary hover:underline mt-2 inline-block">Explore new tools →</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Recent Bookmarks</h2>
          <div className="space-y-4">
            {bookmarkedTools.length > 0 ? (
              bookmarkedTools.slice(0, 5).map(item => {
                const tool = item.toolId || item; // accommodate different populate structures
                return (
                  <div key={tool._id} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg">🔖</div>
                    <div>
                      <Link to={`/tool/${tool.slug}`} className="text-sm font-medium hover:text-primary transition-colors">{tool.name}</Link>
                      <p className="text-xs text-muted-foreground">{tool.category}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground py-4">No recent bookmarks. Start exploring to save your favorite AI tools!</p>
            )}
          </div>
        </div>


        {/* AI Recommendations */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🤖</span>
            <h2 className="text-xl font-bold">AI Recommendations for You</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Based on your bookmarks and searches, we think you'll like these tools:</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">G</div>
                <div>
                  <Link to="/tool/github-copilot" className="text-sm font-semibold hover:text-primary">GitHub Copilot</Link>
                  <p className="text-xs text-muted-foreground">Because you viewed Cursor</p>
                </div>
              </div>
              <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80">View</button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">N</div>
                <div>
                  <Link to="/tool/notion-ai" className="text-sm font-semibold hover:text-primary">Notion AI</Link>
                  <p className="text-xs text-muted-foreground">Because you bookmarked ChatGPT</p>
                </div>
              </div>
              <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80">View</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
