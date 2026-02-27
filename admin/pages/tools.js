import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function Tools() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [researching, setResearching] = useState({});
  const [filter, setFilter] = useState('all');

  async function loadTools() {
    try {
      const res = await fetch('/api/tools');
      if (res.ok) {
        setTools(await res.json());
      }
    } catch (err) {
      console.error('Failed to load tools:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTools(); }, []);

  async function addTool(e) {
    e.preventDefault();
    if (!newName || !newUrl) return;
    setAdding(true);

    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, url: newUrl })
      });

      if (res.ok) {
        setNewName('');
        setNewUrl('');
        setShowAdd(false);
        loadTools();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add tool');
      }
    } catch (err) {
      alert('Failed to add tool');
    } finally {
      setAdding(false);
    }
  }

  async function triggerResearch(toolId) {
    setResearching(prev => ({ ...prev, [toolId]: true }));

    try {
      const res = await fetch(`/api/tools/${toolId}/research`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setTools(prev => prev.map(t =>
          t.id === toolId ? { ...t, research_status: 'researching' } : t
        ));
      } else {
        alert(data.error || 'Failed to trigger research');
      }
    } catch (err) {
      alert('Failed to trigger research');
    } finally {
      setResearching(prev => ({ ...prev, [toolId]: false }));
    }
  }

  const filtered = filter === 'all'
    ? tools
    : tools.filter(t => t.research_status === filter);

  if (loading) return <Layout><p className="text-dim mt-4">Loading...</p></Layout>;

  return (
    <Layout>
      <div className="flex justify-between items-center" style={{ margin: '20px 0' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Tool Queue</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add Tool'}
        </button>
      </div>

      {showAdd && (
        <div className="card mb-4">
          <form onSubmit={addTool} className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                className="input"
                placeholder="Tool name (e.g. Warmly AI)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ flex: 2, minWidth: 300 }}>
              <input
                className="input"
                placeholder="URL (e.g. https://www.warmly.ai)"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? 'Adding...' : 'Add to Queue'}
            </button>
          </form>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['all', 'queued', 'researching', 'complete', 'failed'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? `All (${tools.length})` : `${f} (${tools.filter(t => t.research_status === f).length})`}
          </button>
        ))}
        <button className="btn btn-sm" onClick={loadTools} style={{ marginLeft: 'auto' }}>
          Refresh
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>URL</th>
                <th>Status</th>
                <th>Category</th>
                <th>Pricing</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-dim text-sm" style={{ textAlign: 'center', padding: 40 }}>
                  No tools found. Add one above.
                </td></tr>
              ) : filtered.map(tool => (
                <tr key={tool.id}>
                  <td style={{ fontWeight: 500 }}>{tool.name}</td>
                  <td>
                    <a href={tool.url} target="_blank" rel="noopener" className="text-sm truncate" style={{ display: 'block' }}>
                      {new URL(tool.url).hostname}
                    </a>
                  </td>
                  <td>
                    <span className={`badge badge-${tool.research_status}`}>
                      {tool.research_status}
                    </span>
                  </td>
                  <td className="text-dim text-sm">{tool.primary_category || '—'}</td>
                  <td className="text-dim text-sm">{tool.pricing || '—'}</td>
                  <td>
                    {(tool.research_status === 'queued' || tool.research_status === 'failed') && (
                      <button
                        className="btn btn-sm"
                        onClick={() => triggerResearch(tool.id)}
                        disabled={researching[tool.id]}
                      >
                        {researching[tool.id] ? 'Starting...' : 'Research'}
                      </button>
                    )}
                    {tool.research_status === 'complete' && (
                      <button
                        className="btn btn-sm"
                        onClick={() => triggerResearch(tool.id)}
                        disabled={researching[tool.id]}
                      >
                        Re-run
                      </button>
                    )}
                    {tool.research_status === 'researching' && (
                      <span className="text-dim text-xs">Running...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
