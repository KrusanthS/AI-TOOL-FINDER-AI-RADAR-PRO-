import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api, {
  getPermanentTools,
  createPermanentTool,
  updatePermanentTool,
  deletePermanentTool,
  seedPermanentTools,
} from '../services/api';

export default function Admin() {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);

  // Check for admin role in the user object
  const isAdmin = isAuthenticated && user?.role === 'admin';
  const showDemo = isAuthenticated && !isAdmin;

  // Fetch real stats when overview tab is active
  React.useEffect(() => {
    if (isAuthenticated && activeTab === 'overview') {
      api.get('/admin/stats')
        .then(res => setStats(res.data))
        .catch(() => {}); // silently fail — backend guards admin route
    }
  }, [isAuthenticated, activeTab]);

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

  const handleTriggerTrending = async () => {
    try {
      await api.post('/admin/jobs/trending');
      alert('Trending recalculation triggered');
    } catch (error) {
      alert('Failed to trigger trending recalculation');
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
              { id: 'permanent-tools', label: '📌 Permanent Tools' },
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
                  <p className="text-3xl font-black">{stats?.totalTools ?? '...'}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground mb-1">Pending Approval</p>
                  <p className="text-3xl font-black text-orange-500">{stats?.pendingTools ?? '...'}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground mb-1">Total Users</p>
                  <p className="text-3xl font-black">{stats?.totalUsers ?? '...'}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground mb-1">Added This Week</p>
                  <p className="text-3xl font-black text-emerald-500">{stats?.addedThisWeek ?? '...'}</p>
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
                  <button onClick={handleTriggerTrending} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 flex-shrink-0">
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

          {activeTab === 'permanent-tools' && (
            <div className="animate-fade-in">
              <PermanentToolsManager />
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

// ── Permanent Tools Manager ────────────────────────────────────────────────────
const EMPTY_TOOL = {
  name: '', description: '', short_description: '', category: 'Chat AI',
  website_url: '', logo_url: '', pricing: 'Freemium',
  features: [], tags: [], platform: [], popularity_score: 50, rating: 0,
};

const CATEGORY_OPTIONS = [
  'Chat AI', 'Coding', 'Image Generation', 'Video AI', 'Audio AI',
  'Writing', 'Research', 'Design', 'Automation', 'Marketing', 'Productivity',
  'LLMs', 'Data', 'Education', 'Other',
];

function PermanentToolsManager() {
  const [tools, setTools] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [seeding, setSeeding] = React.useState(false);
  const [seedMsg, setSeedMsg] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [editingTool, setEditingTool] = React.useState(null);
  const [form, setForm] = React.useState(EMPTY_TOOL);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await getPermanentTools({ limit: 100, search });
    setTools(res.tools || []);
    setLoading(false);
  }, [search]);

  React.useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg('');
    const res = await seedPermanentTools();
    setSeedMsg(res.message || (res.success ? 'Seed complete!' : res.error || 'Seed failed'));
    setSeeding(false);
    load();
  };

  const openAdd = () => {
    setEditingTool(null);
    setForm(EMPTY_TOOL);
    setError('');
    setShowForm(true);
  };

  const openEdit = (tool) => {
    setEditingTool(tool);
    setForm({
      name: tool.name || '',
      description: tool.description || '',
      short_description: tool.short_description || '',
      category: tool.category || 'Chat AI',
      website_url: tool.website_url || '',
      logo_url: tool.logo_url || '',
      pricing: tool.pricing || 'Freemium',
      features: (tool.features || []).join(', '),
      tags: (tool.tags || []).join(', '),
      platform: (tool.platform || []).join(', '),
      popularity_score: tool.popularity_score || 0,
      rating: tool.rating || 0,
    });
    setError('');
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}" permanently?`)) return;
    await deletePermanentTool(id);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    // Normalize comma-separated arrays
    const payload = {
      ...form,
      features: typeof form.features === 'string' ? form.features.split(',').map(s => s.trim()).filter(Boolean) : form.features,
      tags: typeof form.tags === 'string' ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : form.tags,
      platform: typeof form.platform === 'string' ? form.platform.split(',').map(s => s.trim()).filter(Boolean) : form.platform,
      popularity_score: Number(form.popularity_score) || 0,
      rating: Number(form.rating) || 0,
    };
    const res = editingTool
      ? await updatePermanentTool(editingTool._id, payload)
      : await createPermanentTool(payload);
    if (res.success) {
      setShowForm(false);
      load();
    } else {
      setError(res.error || 'Save failed');
    }
    setSaving(false);
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';
  const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1';

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-bold">📌 Permanent Tools</h3>
          <p className="text-sm text-muted-foreground">
            Curated AI tools permanently stored in the database. They appear in all search results alongside internet-fetched tools.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {seeding ? '⏳ Seeding...' : '🌱 Seed 40 Tools'}
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            + Add Tool
          </button>
        </div>
      </div>

      {seedMsg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
          seedMsg.toLowerCase().includes('fail') || seedMsg.toLowerCase().includes('error')
            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
            : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
        }`}>
          {seedMsg}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search permanent tools..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={inputCls}
        />
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="mb-6 p-5 rounded-2xl border border-primary/30 bg-card">
          <h4 className="font-bold mb-4">{editingTool ? `✏️ Edit: ${editingTool.name}` : '➕ Add New Permanent Tool'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Tool Name *</label>
                <input required className={inputCls} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. ChatGPT" />
              </div>
              <div>
                <label className={labelCls}>Website URL</label>
                <input className={inputCls} value={form.website_url} onChange={e => setForm(f => ({...f, website_url: e.target.value}))} placeholder="https://..." />
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select className={inputCls} value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                  {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Pricing</label>
                <select className={inputCls} value={form.pricing} onChange={e => setForm(f => ({...f, pricing: e.target.value}))}>
                  {['Free', 'Freemium', 'Paid', 'Enterprise', 'Open Source', 'Unknown'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Popularity Score (0–100)</label>
                <input type="number" min="0" max="100" className={inputCls} value={form.popularity_score} onChange={e => setForm(f => ({...f, popularity_score: e.target.value}))} />
              </div>
              <div>
                <label className={labelCls}>Rating (0–5)</label>
                <input type="number" min="0" max="5" step="0.1" className={inputCls} value={form.rating} onChange={e => setForm(f => ({...f, rating: e.target.value}))} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Short Description</label>
                <input className={inputCls} value={form.short_description} onChange={e => setForm(f => ({...f, short_description: e.target.value}))} placeholder="One-line summary" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Full Description</label>
                <textarea rows={3} className={inputCls} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Detailed description..." />
              </div>
              <div>
                <label className={labelCls}>Logo URL</label>
                <input className={inputCls} value={form.logo_url} onChange={e => setForm(f => ({...f, logo_url: e.target.value}))} placeholder="https://..." />
              </div>
              <div>
                <label className={labelCls}>Platform (comma-separated)</label>
                <input className={inputCls} value={form.platform} onChange={e => setForm(f => ({...f, platform: e.target.value}))} placeholder="Web, iOS, Android, API" />
              </div>
              <div>
                <label className={labelCls}>Features (comma-separated)</label>
                <input className={inputCls} value={form.features} onChange={e => setForm(f => ({...f, features: e.target.value}))} placeholder="Code generation, Chat, API..." />
              </div>
              <div>
                <label className={labelCls}>Tags (comma-separated)</label>
                <input className={inputCls} value={form.tags} onChange={e => setForm(f => ({...f, tags: e.target.value}))} placeholder="ai, coding, llm..." />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                {saving ? 'Saving...' : editingTool ? 'Save Changes' : 'Add Tool'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tools Table */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading permanent tools...</p>
      ) : tools.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-bold mb-1">No permanent tools yet</p>
          <p className="text-muted-foreground text-sm mb-4">Click "Seed 40 Tools" to populate with popular AI tools, or add them manually.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tool</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Pricing</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Score</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tools.map(tool => (
                <tr key={tool._id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {tool.logo_url ? (
                        <img src={tool.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">{tool.name?.[0]}</div>
                      )}
                      <div>
                        <p className="font-semibold">{tool.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{tool.short_description || tool.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tool.category}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      tool.pricing === 'Free' || tool.pricing === 'Open Source' ? 'bg-emerald-500/10 text-emerald-600' :
                      tool.pricing === 'Freemium' ? 'bg-blue-500/10 text-blue-600' :
                      'bg-orange-500/10 text-orange-600'
                    }`}>{tool.pricing}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tool.popularity_score ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(tool)} className="px-3 py-1 rounded-lg bg-secondary border border-border text-xs font-medium hover:border-primary/40 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(tool._id, tool.name)} className="px-3 py-1 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-medium hover:bg-red-500/20 transition-colors">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-secondary/30 text-xs text-muted-foreground border-t border-border">
            {tools.length} permanent tool{tools.length !== 1 ? 's' : ''} stored
          </div>
        </div>
      )}
    </div>
  );
}

