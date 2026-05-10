import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export default function Admin() {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  // Check for admin role in the user object
  const isAdmin = isAuthenticated && user?.role === 'admin';

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-3xl font-bold mb-3">Sign in required</h1>
        <p className="text-muted-foreground mb-8">You need to sign in to access the admin panel.</p>
      </div>
    );
  }

  // To let user preview the dashboard without actually being an admin for the demo
  // But restricted features will still fail on the backend
  const showDemo = !isAdmin;


  const handleTriggerDiscovery = async () => {
    try {
      await api.post('/admin/jobs/discovery');
      alert('Discovery job triggered');
    } catch (error) {
      alert('Failed to trigger discovery');
    }
  };

  const handleTriggerEnrichment = async () => {
    try {
      await api.post('/admin/jobs/enrichment');
      alert('Enrichment job triggered');
    } catch (error) {
      alert('Failed to trigger enrichment');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {showDemo && (
        <div className="mb-8 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-sm flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p><strong>Demo Mode:</strong> You are viewing the admin panel in demo mode. Normally, only users with the 'admin' role can see this page.</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Admin Control Center</h1>
          <p className="text-muted-foreground text-lg">Manage tools, view system health, and trigger background jobs.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
            {[
              { id: 'overview', label: '📊 System Overview' },
              { id: 'tools', label: '🛠️ Manage Tools' },
              { id: 'jobs', label: '⚙️ Background Jobs' },
              { id: 'users', label: '👥 Users' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card border border-border hover:border-primary/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'overview' && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground mb-1">Total Tools</p>
                  <p className="text-3xl font-black">2,412</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground mb-1">Pending Approval</p>
                  <p className="text-3xl font-black text-orange-500">45</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground mb-1">Active Users</p>
                  <p className="text-3xl font-black">12.4K</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground mb-1">API Health</p>
                  <p className="text-3xl font-black text-emerald-500">100%</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-lg font-bold mb-4">Recent System Logs</h3>
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded bg-secondary text-foreground">
                    <span className="text-emerald-500">[INFO]</span> 2026-04-28 10:45:12 - AI Enrichment job completed for 50 tools.
                  </div>
                  <div className="p-3 rounded bg-secondary text-foreground">
                    <span className="text-emerald-500">[INFO]</span> 2026-04-28 09:30:00 - ProductHunt scraper finished successfully. Added 12 new tools.
                  </div>
                  <div className="p-3 rounded bg-secondary text-foreground">
                    <span className="text-orange-500">[WARN]</span> 2026-04-28 08:15:22 - Rate limit exceeded for IP 192.168.1.100.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold mb-4">Bull Queue Workers</h3>
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold flex items-center gap-2">🔍 Scrape ProductHunt</h4>
                    <p className="text-sm text-muted-foreground">Pulls the latest AI tools from ProductHunt today section.</p>
                  </div>
                  <button 
                    onClick={handleTriggerDiscovery}
                    className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 flex-shrink-0"
                  >
                    Run Now
                  </button>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold flex items-center gap-2">🤖 Run AI Enrichment</h4>
                    <p className="text-sm text-muted-foreground">Generates summaries, pros/cons, and categories for pending tools using GPT-4o.</p>
                  </div>
                  <button 
                    onClick={handleTriggerEnrichment}
                    className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 flex-shrink-0"
                  >
                    Run Now
                  </button>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold flex items-center gap-2">📉 Recalculate Trending</h4>
                    <p className="text-sm text-muted-foreground">Applies time-decay formulas to tool views and saves to update trending score.</p>
                  </div>
                  <button className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 flex-shrink-0">
                    Run Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold mb-4">Pending Tool Approvals</h3>
              <PendingToolsList />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="animate-fade-in rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
              <div className="text-4xl mb-4">🚧</div>
              <h3 className="text-lg font-bold mb-2">Under Construction</h3>
              <p className="text-muted-foreground">User management is coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingToolsList() {
  const [tools, setTools] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await api.get('/admin/pending');
        setTools(res.data);
      } catch (e) {
        console.error('Failed to fetch pending tools');
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  const handleAction = async (id, action) => {
    try {
      await api.post(`/admin/${action}/${id}`);
      setTools(tools.filter(t => t._id !== id));
    } catch (e) {
      alert(`Failed to ${action} tool`);
    }
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading tools...</p>;
  if (tools.length === 0) return (
    <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
      <p className="text-muted-foreground">No pending tools to review. All caught up! 🎉</p>
    </div>
  );

  return (
    <div className="grid gap-4">
      {tools.map(tool => (
        <div key={tool._id} className="p-4 rounded-2xl border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center font-bold text-xl overflow-hidden">
              {tool.media?.logo ? <img src={tool.media.logo} alt="" className="w-full h-full object-cover" /> : tool.name[0]}
            </div>
            <div>
              <h4 className="font-bold">{tool.name}</h4>
              <p className="text-xs text-muted-foreground line-clamp-1">{tool.shortDescription}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleAction(tool._id, 'approve')}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors"
            >
              Approve
            </button>
            <button 
              onClick={() => handleAction(tool._id, 'reject')}
              className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

