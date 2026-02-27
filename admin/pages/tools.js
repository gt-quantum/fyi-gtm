import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import FormModal, { FormField, inputStyle } from '../components/FormModal';
import { colors, timeAgo } from '../lib/theme';
import { GROUPS, getGroupLabel, GROUP_COLORS } from '../lib/taxonomy';
import { RESEARCH_STATUSES, ENTRY_FILTER_STATUSES, NEWSLETTER_STATUSES } from '../lib/statuses';

export default function Tools() {
  const router = useRouter();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // Multi-select filters
  const [researchFilters, setResearchFilters] = useState([]);
  const [entryFilters, setEntryFilters] = useState([]);
  const [newsletterFilters, setNewsletterFilters] = useState([]);
  const [groupFilters, setGroupFilters] = useState([]);

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

  function handleSelect(id, checked) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  function handleSelectAll(checked) {
    if (checked) {
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

  // Compute counts for filter dropdowns
  const counts = useMemo(() => {
    const research = {};
    const entry = {};
    const newsletter = {};
    const group = {};
    tools.forEach(t => {
      research[t.research_status] = (research[t.research_status] || 0) + 1;
      const es = t.entry_status || 'no_entry';
      entry[es] = (entry[es] || 0) + 1;
      const ns = t.newsletter_status || 'none';
      newsletter[ns] = (newsletter[ns] || 0) + 1;
      const gn = t.group_name || 'unassigned';
      group[gn] = (group[gn] || 0) + 1;
    });
    return { research, entry, newsletter, group };
  }, [tools]);

  const filtered = useMemo(() => {
    let list = tools;
    if (researchFilters.length > 0)
      list = list.filter(t => researchFilters.includes(t.research_status));
    if (entryFilters.length > 0)
      list = list.filter(t => entryFilters.includes(t.entry_status || 'no_entry'));
    if (newsletterFilters.length > 0)
      list = list.filter(t => newsletterFilters.includes(t.newsletter_status || 'none'));
    if (groupFilters.length > 0)
      list = list.filter(t => groupFilters.includes(t.group_name || 'unassigned'));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || (t.url && t.url.toLowerCase().includes(q)));
    }
    return list;
  }, [tools, researchFilters, entryFilters, newsletterFilters, groupFilters, search]);

  const activeFilterCount = researchFilters.length + entryFilters.length + newsletterFilters.length + groupFilters.length;

  function clearAllFilters() {
    setResearchFilters([]);
    setEntryFilters([]);
    setNewsletterFilters([]);
    setGroupFilters([]);
  }

  const columns = [
    { key: 'name', label: 'Name', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { key: 'url', label: 'URL', width: 130, render: (v) => {
      try { return <span style={{ color: colors.dim, fontSize: 12 }}>{new URL(v).hostname}</span>; }
      catch { return <span style={{ color: colors.dim, fontSize: 12 }}>{v}</span>; }
    }},
    { key: 'group_name', label: 'Group', width: 140, render: (v) => {
      if (!v) return <span style={{ color: colors.subtle, fontSize: 12 }}>—</span>;
      const color = GROUP_COLORS[v] || colors.dim;
      return <span style={{ color, fontSize: 12, fontWeight: 500 }}>{getGroupLabel(v)}</span>;
    }},
    { key: 'research_status', label: 'Research', width: 100, render: (v) => <StatusBadge status={v} small /> },
    { key: 'entry_status', label: 'Entry', width: 100, render: (v) => <StatusBadge status={v || 'no entry'} small /> },
    { key: 'newsletter_status', label: 'Newsletter', width: 110, render: (v, row) => {
      const s = v || 'none';
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <StatusBadge status={s} small />
          {row.newsletter_priority > 0 && <span style={{ color: colors.dim, fontSize: 10 }}>({row.newsletter_priority})</span>}
        </span>
      );
    }},
    { key: 'updated_at', label: 'Updated', width: 90, render: (v) => <span style={{ color: colors.dim, fontSize: 12 }}>{timeAgo(v)}</span> },
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

      {/* Search + filter dropdowns */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 240, padding: '7px 12px' }}
        />

        <MultiSelectDropdown
          label="Research"
          selected={researchFilters}
          onChange={setResearchFilters}
          options={RESEARCH_STATUSES.map(s => ({ ...s, count: counts.research[s.value] }))}
        />
        <MultiSelectDropdown
          label="Entry"
          selected={entryFilters}
          onChange={setEntryFilters}
          options={ENTRY_FILTER_STATUSES.map(s => ({ ...s, count: counts.entry[s.value] }))}
        />
        <MultiSelectDropdown
          label="Newsletter"
          selected={newsletterFilters}
          onChange={setNewsletterFilters}
          options={NEWSLETTER_STATUSES.map(s => ({ ...s, count: counts.newsletter[s.value] }))}
        />
        <MultiSelectDropdown
          label="Group"
          selected={groupFilters}
          onChange={setGroupFilters}
          options={[
            ...GROUPS.map(g => ({ value: g.value, label: g.label, count: counts.group[g.value], color: GROUP_COLORS[g.value] })),
            { value: 'unassigned', label: 'Unassigned', count: counts.group.unassigned },
          ]}
        />

        {activeFilterCount > 0 && (
          <button onClick={clearAllFilters} style={{
            padding: '5px 10px', border: 'none', borderRadius: 5,
            background: 'transparent', color: colors.accent, fontSize: 12, cursor: 'pointer',
          }}>
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: colors.dim }}>{filtered.length} of {tools.length}</span>
          <button onClick={loadTools} style={refreshBtnStyle}>Refresh</button>
        </div>
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

// --- Multi-select dropdown filter component ---

function MultiSelectDropdown({ label, selected, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function toggle(value) {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const hasSelection = selected.length > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          border: `1px solid ${hasSelection ? colors.accent : colors.border}`,
          background: hasSelection ? colors.accent + '18' : 'transparent',
          color: hasSelection ? colors.accent : colors.dim,
          display: 'flex', alignItems: 'center', gap: 4,
          transition: 'all 0.15s',
        }}
      >
        {label}
        {hasSelection && (
          <span style={{
            background: colors.accent, color: 'white', borderRadius: 10,
            padding: '0 5px', fontSize: 10, fontWeight: 600, lineHeight: '16px',
          }}>
            {selected.length}
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 2 }}>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50,
          background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 180, padding: 4,
        }}>
          {options.map(opt => {
            const isChecked = selected.includes(opt.value);
            const count = opt.count || 0;
            if (count === 0 && !isChecked) return null; // hide empty options unless selected
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '6px 10px', border: 'none', borderRadius: 4,
                  background: isChecked ? colors.accent + '18' : 'transparent',
                  color: colors.text, fontSize: 12, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${isChecked ? colors.accent : colors.subtle}`,
                  background: isChecked ? colors.accent : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isChecked && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ flex: 1, color: opt.color || colors.text }}>{opt.label}</span>
                <span style={{ color: colors.subtle, fontSize: 11 }}>{count}</span>
              </button>
            );
          })}
          {hasSelection && (
            <>
              <div style={{ height: 1, background: colors.border, margin: '4px 0' }} />
              <button
                onClick={() => { onChange([]); setOpen(false); }}
                style={{
                  display: 'block', width: '100%', padding: '5px 10px', border: 'none', borderRadius: 4,
                  background: 'transparent', color: colors.dim, fontSize: 11, cursor: 'pointer', textAlign: 'left',
                }}
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --- Styles ---

const primaryBtnStyle = {
  padding: '7px 16px', border: '1px solid #3b82f6', borderRadius: 6,
  background: '#3b82f6', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer',
};

const publishBtnStyle = {
  padding: '7px 16px', border: '1px solid #22c55e', borderRadius: 6,
  background: '#052e16', color: '#4ade80', fontSize: 13, fontWeight: 500, cursor: 'pointer',
};

const refreshBtnStyle = {
  padding: '5px 12px', border: `1px solid ${colors.border}`, borderRadius: 6,
  background: 'transparent', color: colors.muted, fontSize: 12, fontWeight: 500, cursor: 'pointer',
};
