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
  const [researchFilter, setResearchFilter] = useState('all');
  const [entryFilter, setEntryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

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

  function handleSelect(id, checked) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  function handleSelectAll(checked) {
    if (checked) {
      // Only select tools that have an entry_id (publishable)
      const publishable = filtered.filter(t => t.entry_id).map(t => t.id);
      setSelectedIds(new Set(publishable));
    } else {
      setSelectedIds(new Set());
    }
  }

  async function handleBulkPublish() {
    const entryIds = [];
    for (const toolId of selectedIds) {
      const tool = tools.find(t => t.id === toolId);
      if (tool?.entry_id) entryIds.push(tool.entry_id);
    }
    if (entryIds.length === 0) return;
    if (!confirm(`Publish ${entryIds.length} entries to GitHub?`)) return;

    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await fetch('/api/directory/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishResult({ ok: true, message: `Published ${data.published} entries. Commit: ${data.commitSha?.slice(0, 7)}` });
        setSelectedIds(new Set());
        loadTools();
      } else {
        setPublishResult({ ok: false, message: data.error });
      }
    } catch (err) {
      setPublishResult({ ok: false, message: err.message });
    }
    setPublishing(false);
  }

  const filtered = useMemo(() => {
    let list = tools;
    if (researchFilter !== 'all') list = list.filter(t => t.research_status === researchFilter);
    if (entryFilter !== 'all') {
      if (entryFilter === 'no_entry') {
        list = list.filter(t => !t.entry_status);
      } else {
        list = list.filter(t => t.entry_status === entryFilter);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || (t.url && t.url.toLowerCase().includes(q)));
    }
    return list;
  }, [tools, researchFilter, entryFilter, search]);

  const researchCounts = useMemo(() => {
    const counts = {};
    tools.forEach(t => { counts[t.research_status] = (counts[t.research_status] || 0) + 1; });
    return counts;
  }, [tools]);

  const entryCounts = useMemo(() => {
    const counts = { published: 0, draft: 0, staged: 0, no_entry: 0 };
    tools.forEach(t => {
      if (!t.entry_status) counts.no_entry++;
      else if (t.entry_status === 'published') counts.published++;
      else if (t.entry_status === 'staged') counts.staged++;
      else if (t.entry_status === 'draft') counts.draft++;
    });
    return counts;
  }, [tools]);

  const columns = [
    { key: 'name', label: 'Name', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { key: 'url', label: 'URL', width: 140, render: (v) => {
      try { return <span style={{ color: colors.dim, fontSize: 12 }}>{new URL(v).hostname}</span>; }
      catch { return <span style={{ color: colors.dim, fontSize: 12 }}>{v}</span>; }
    }},
    { key: 'research_status', label: 'Research', width: 100, render: (v) => <StatusBadge status={v} small /> },
    { key: 'entry_status', label: 'Entry', width: 100, render: (v) => <StatusBadge status={v || 'no entry'} small /> },
    { key: 'newsletter_status', label: 'Newsletter', width: 100, render: (v, row) => {
      const s = v || 'none';
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <StatusBadge status={s} small />
          {row.newsletter_priority > 0 && <span style={{ color: colors.dim, fontSize: 10 }}>({row.newsletter_priority})</span>}
        </span>
      );
    }},
    { key: 'primary_category', label: 'Category', width: 140, render: (v) => (
      <span style={{ color: colors.dim, fontSize: 12 }}>{v ? v.replace(/-/g, ' ') : '-'}</span>
    )},
    { key: 'updated_at', label: 'Updated', width: 90, render: (v) => <span style={{ color: colors.dim, fontSize: 12 }}>{timeAgo(v)}</span> },
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
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedIds.size > 0 && (
            <button onClick={handleBulkPublish} disabled={publishing} style={publishBtnStyle}>
              {publishing ? 'Publishing...' : `Publish ${selectedIds.size} to GitHub`}
            </button>
          )}
          <button onClick={() => setShowAdd(true)} style={primaryBtnStyle}>+ Add Tool</button>
        </div>
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

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 260, padding: '7px 12px' }}
        />
        <FilterChips
          value={researchFilter}
          onChange={setResearchFilter}
          options={[
            { value: 'all', label: 'All', count: tools.length },
            { value: 'queued', label: 'Queued', count: researchCounts.queued || 0 },
            { value: 'researching', label: 'Researching', count: researchCounts.researching || 0 },
            { value: 'complete', label: 'Complete', count: researchCounts.complete || 0 },
            { value: 'failed', label: 'Failed', count: researchCounts.failed || 0 },
          ]}
        />
        <button onClick={loadTools} style={{ ...actionBtnStyle, marginLeft: 'auto' }}>Refresh</button>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: colors.dim, fontWeight: 500 }}>Entry:</span>
        <FilterChips
          value={entryFilter}
          onChange={setEntryFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'published', label: 'Published', count: entryCounts.published },
            { value: 'staged', label: 'Staged', count: entryCounts.staged },
            { value: 'draft', label: 'Draft', count: entryCounts.draft },
            { value: 'no_entry', label: 'No Entry', count: entryCounts.no_entry },
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
        onRowClick={(row) => router.push(`/tools/${row.id}?tab=directory`)}
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

const publishBtnStyle = {
  padding: '7px 16px', border: '1px solid #22c55e', borderRadius: 6,
  background: '#052e16', color: '#4ade80', fontSize: 13, fontWeight: 500, cursor: 'pointer',
};

const actionBtnStyle = {
  padding: '3px 10px', border: `1px solid ${colors.border}`, borderRadius: 5,
  background: 'transparent', color: colors.muted, fontSize: 11, fontWeight: 500, cursor: 'pointer',
};
