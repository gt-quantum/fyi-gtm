import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import FilterChips from '../components/FilterChips';
import { colors, timeAgo } from '../lib/theme';

export default function Directory() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  async function loadEntries() {
    try {
      const res = await fetch('/api/directory');
      if (res.ok) setEntries(await res.json());
    } catch (err) {
      console.error('Failed to load entries:', err);
    }
    setLoading(false);
  }

  useEffect(() => { loadEntries(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(e => e.status === filter);
  }, [entries, filter]);

  const statusCounts = useMemo(() => {
    const counts = {};
    entries.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
    return counts;
  }, [entries]);

  function handleSelect(id, checked) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  function handleSelectAll(checked) {
    if (checked) {
      setSelectedIds(new Set(filtered.map(e => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  async function handlePublish() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Publish ${selectedIds.size} entries to GitHub?`)) return;

    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await fetch('/api/directory/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: [...selectedIds] }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishResult({ ok: true, message: `Published ${data.published} entries. Commit: ${data.commitSha?.slice(0, 7)}` });
        setSelectedIds(new Set());
        loadEntries();
      } else {
        setPublishResult({ ok: false, message: data.error });
      }
    } catch (err) {
      setPublishResult({ ok: false, message: err.message });
    }
    setPublishing(false);
  }

  const columns = [
    { key: 'tools', label: 'Tool', render: (v) => (
      <span style={{ fontWeight: 500 }}>{v?.name || 'Unknown'}</span>
    )},
    { key: 'status', label: 'Status', width: 100, render: (v) => <StatusBadge status={v || 'draft'} small /> },
    { key: 'tools_url', label: 'URL', width: 160, render: (_, row) => {
      const url = row.tools?.url;
      if (!url) return '-';
      try { return <span style={{ color: colors.dim, fontSize: 12 }}>{new URL(url).hostname}</span>; }
      catch { return <span style={{ color: colors.dim, fontSize: 12 }}>{url}</span>; }
    }},
    { key: 'updated_at', label: 'Updated', width: 100, render: (v) => (
      <span style={{ color: colors.dim, fontSize: 12 }}>{timeAgo(v)}</span>
    )},
    { key: 'frontmatter', label: 'Has Content', width: 90, render: (v, row) => (
      <span style={{ color: v && row.content ? colors.success : colors.dim, fontSize: 12 }}>
        {v && row.content ? 'Yes' : 'No'}
      </span>
    )},
  ];

  if (loading) return <Layout><p style={{ color: colors.dim, marginTop: 40 }}>Loading...</p></Layout>;

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Directory Entries</h1>
        {selectedIds.size > 0 && (
          <button onClick={handlePublish} disabled={publishing} style={publishBtnStyle}>
            {publishing ? 'Publishing...' : `Publish ${selectedIds.size} Selected`}
          </button>
        )}
      </div>

      {publishResult && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: publishResult.ok ? '#052e16' : '#450a0a',
          color: publishResult.ok ? '#4ade80' : '#f87171',
          border: `1px solid ${publishResult.ok ? '#14532d' : '#7f1d1d'}`,
        }}>
          {publishResult.message}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: entries.length },
            { value: 'published', label: 'Published', count: statusCounts.published || 0 },
            { value: 'draft', label: 'Draft', count: statusCounts.draft || 0 },
            { value: 'approved', label: 'Approved', count: statusCounts.approved || 0 },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        selectable
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        emptyMessage="No directory entries found."
      />
    </Layout>
  );
}

const publishBtnStyle = {
  padding: '7px 16px', border: '1px solid #22c55e', borderRadius: 6,
  background: '#052e16', color: '#4ade80', fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
