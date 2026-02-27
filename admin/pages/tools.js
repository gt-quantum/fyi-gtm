import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import FilterChips from '../components/FilterChips';
import FormModal, { FormField, inputStyle } from '../components/FormModal';
import { colors, timeAgo } from '../lib/theme';

export default function Tools() {
  const router = useRouter();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [researching, setResearching] = useState({});
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  async function loadTools() {
    try {
      const res = await fetch('/api/tools');
      if (res.ok) setTools(await res.json());
    } catch (err) {
      console.error('Failed to load tools:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTools(); }, []);

  async function addTool() {
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
      }
    } catch (err) {
      alert('Failed to add tool');
    }
    setAdding(false);
  }

  async function triggerResearch(e, toolId) {
    e.stopPropagation();
    setResearching(prev => ({ ...prev, [toolId]: true }));
    try {
      const res = await fetch(`/api/tools/${toolId}/research`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTools(prev => prev.map(t =>
          t.id === toolId ? { ...t, research_status: 'researching' } : t
        ));
      }
    } catch (err) {
      alert('Failed to trigger research');
    }
    setResearching(prev => ({ ...prev, [toolId]: false }));
  }

  const filtered = useMemo(() => {
    let list = tools;
    if (filter !== 'all') list = list.filter(t => t.research_status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || (t.url && t.url.toLowerCase().includes(q)));
    }
    return list;
  }, [tools, filter, search]);

  const statusCounts = useMemo(() => {
    const counts = {};
    tools.forEach(t => { counts[t.research_status] = (counts[t.research_status] || 0) + 1; });
    return counts;
  }, [tools]);

  const columns = [
    { key: 'name', label: 'Name', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { key: 'url', label: 'URL', width: 160, render: (v) => {
      try { return <span style={{ color: colors.dim, fontSize: 12 }}>{new URL(v).hostname}</span>; }
      catch { return <span style={{ color: colors.dim, fontSize: 12 }}>{v}</span>; }
    }},
    { key: 'research_status', label: 'Status', width: 110, render: (v) => <StatusBadge status={v} small /> },
    { key: 'primary_category', label: 'Category', width: 140, render: (v) => <span style={{ color: colors.dim, fontSize: 12 }}>{v || '-'}</span> },
    { key: 'pricing', label: 'Pricing', width: 100, render: (v) => <span style={{ color: colors.dim, fontSize: 12 }}>{v || '-'}</span> },
    { key: 'newsletter_status', label: 'Newsletter', width: 90, render: (v, row) => {
      const s = v || 'none';
      const c = s === 'sent' ? '#22c55e' : s === 'scheduled' ? '#3b82f6' : s === 'queued' ? '#f59e0b' : colors.subtle;
      return <span style={{ color: c, fontSize: 11, fontWeight: 500 }}>{s}{row.newsletter_priority > 0 ? ` (${row.newsletter_priority})` : ''}</span>;
    }},
    { key: 'updated_at', label: 'Updated', width: 100, render: (v) => <span style={{ color: colors.dim, fontSize: 12 }}>{timeAgo(v)}</span> },
    { key: '_actions', label: '', width: 90, render: (_, row) => (
      <div onClick={(e) => e.stopPropagation()}>
        {(row.research_status === 'queued' || row.research_status === 'failed') && (
          <button onClick={(e) => triggerResearch(e, row.id)} disabled={researching[row.id]}
            style={actionBtnStyle}>{researching[row.id] ? '...' : 'Research'}</button>
        )}
        {row.research_status === 'complete' && (
          <button onClick={(e) => triggerResearch(e, row.id)} disabled={researching[row.id]}
            style={actionBtnStyle}>{researching[row.id] ? '...' : 'Re-run'}</button>
        )}
        {row.research_status === 'researching' && (
          <span style={{ color: colors.warning, fontSize: 11 }}>Running...</span>
        )}
      </div>
    )},
  ];

  if (loading) return <Layout><p style={{ color: colors.dim, marginTop: 40 }}>Loading...</p></Layout>;

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Tools</h1>
        <button onClick={() => setShowAdd(true)} style={primaryBtnStyle}>+ Add Tool</button>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 260, padding: '7px 12px' }}
        />
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: tools.length },
            { value: 'queued', label: 'Queued', count: statusCounts.queued || 0 },
            { value: 'researching', label: 'Researching', count: statusCounts.researching || 0 },
            { value: 'complete', label: 'Complete', count: statusCounts.complete || 0 },
            { value: 'failed', label: 'Failed', count: statusCounts.failed || 0 },
          ]}
        />
        <button onClick={loadTools} style={{ ...actionBtnStyle, marginLeft: 'auto' }}>Refresh</button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(row) => router.push(`/tools/${row.id}`)}
        emptyMessage="No tools found. Add one above."
      />

      {showAdd && (
        <FormModal
          title="Add Tool"
          onClose={() => setShowAdd(false)}
          onSubmit={addTool}
          submitLabel="Add to Queue"
          submitting={adding}
        >
          <FormField label="Tool Name">
            <input style={inputStyle} placeholder="e.g. Warmly AI" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          </FormField>
          <FormField label="Website URL">
            <input style={inputStyle} placeholder="e.g. https://www.warmly.ai" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          </FormField>
        </FormModal>
      )}
    </Layout>
  );
}

const primaryBtnStyle = {
  padding: '7px 16px', border: '1px solid #3b82f6', borderRadius: 6,
  background: '#3b82f6', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer',
};

const actionBtnStyle = {
  padding: '3px 10px', border: `1px solid ${colors.border}`, borderRadius: 5,
  background: 'transparent', color: colors.muted, fontSize: 11, fontWeight: 500, cursor: 'pointer',
};
