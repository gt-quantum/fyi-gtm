import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import TabBar from '../../components/TabBar';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { colors, timeAgo } from '../../lib/theme';

const tabs = [
  { key: 'entries', label: 'Entries' },
  { key: 'config', label: 'Configuration' },
];

const STATUS_FILTERS = ['all', 'draft', 'review', 'published'];

export default function Directory() {
  const router = useRouter();
  const { tab } = router.query;
  const [activeTab, setActiveTab] = useState('entries');

  // Entries state
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [writing, setWriting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  // Detail modal state
  const [detailEntry, setDetailEntry] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [contentDraft, setContentDraft] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);

  // Config state
  const [settings, setSettings] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (tab && tabs.some(t => t.key === tab)) setActiveTab(tab);
  }, [tab]);

  useEffect(() => { loadEntries(); }, []);
  useEffect(() => { loadSettings(); }, []);

  async function loadEntries() {
    setLoading(true);
    try {
      const res = await fetch('/api/directory');
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error('Failed to load entries:', err);
    }
    setLoading(false);
  }

  async function loadDetail(entryId) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/directory/${entryId}`);
      if (res.ok) {
        const data = await res.json();
        setDetailEntry(data);
        setContentDraft(data.content || '');
      }
    } catch (err) {
      console.error('Failed to load entry detail:', err);
    }
    setDetailLoading(false);
  }

  async function saveEntry(entryId, updates) {
    setSavingEntry(true);
    try {
      const res = await fetch(`/api/directory/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setDetailEntry(data);
        setEditingContent(false);
        await loadEntries();
      }
    } catch (err) {
      console.error('Failed to save entry:', err);
    }
    setSavingEntry(false);
  }

  // Bulk write action
  async function handleBulkWrite() {
    if (selectedIds.length === 0) return;
    setWriting(true);
    setActionResult(null);
    try {
      // Get tool_ids from selected entries
      const toolIds = entries
        .filter(e => selectedIds.includes(e.id))
        .map(e => e.tool_id)
        .filter(Boolean);

      const res = await fetch('/api/directory/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionResult({ type: 'success', message: `Writing triggered for ${data.count} tool(s)` });
        setSelectedIds([]);
        setTimeout(loadEntries, 3000);
      } else {
        setActionResult({ type: 'error', message: data.error || 'Write failed' });
      }
    } catch (err) {
      setActionResult({ type: 'error', message: err.message });
    }
    setWriting(false);
  }

  // Bulk publish action
  async function handleBulkPublish() {
    if (selectedIds.length === 0) return;
    setPublishing(true);
    setActionResult(null);
    try {
      const res = await fetch('/api/directory/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: selectedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionResult({ type: 'success', message: `Published ${data.published} entries` });
        setSelectedIds([]);
        await loadEntries();
      } else {
        setActionResult({ type: 'error', message: data.error || 'Publish failed' });
      }
    } catch (err) {
      setActionResult({ type: 'error', message: err.message });
    }
    setPublishing(false);
  }

  function toggleSelect(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    const filtered = filteredEntries();
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(e => e.id));
    }
  }

  function filteredEntries() {
    if (statusFilter === 'all') return entries;
    return entries.filter(e => e.status === statusFilter);
  }

  // Config tab
  const CONFIG_ORDER = [
    'review_template', 'review_sections', 'tone', 'emphasize',
    'avoid', 'word_count_target', 'review_sources',
  ];

  async function loadSettings() {
    setConfigLoading(true);
    try {
      const res = await fetch('/api/config?scope=agents/directory');
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map(s => ({ ...s, _original: s.value }));
        mapped.sort((a, b) => {
          const ai = CONFIG_ORDER.indexOf(a.key);
          const bi = CONFIG_ORDER.indexOf(b.key);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });
        setSettings(mapped);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
    setConfigLoading(false);
  }

  function updateValue(key, value) {
    setSettings(prev => prev.map(s =>
      s.key === key ? { ...s, value, _dirty: value !== s._original } : s
    ));
    setDirty(true);
  }

  async function saveAll() {
    const changed = settings.filter(s => s._dirty);
    if (changed.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/config/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: changed.map(s => ({ key: s.key, value: s.value, scope: 'agents/directory' }))
        })
      });
      if (res.ok) {
        setDirty(false);
        await loadSettings();
      }
    } catch (err) {
      console.error('Failed to save config:', err);
    }
    setSaving(false);
  }

  function isLongValue(val) {
    if (!val) return false;
    if (val.includes('\n')) return true;
    if (val.length > 80) return true;
    const trimmed = val.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) return true;
    return false;
  }

  function formatForEdit(val) {
    if (!val) return '';
    const trimmed = val.trim();
    try {
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      }
    } catch {}
    return val;
  }

  // Table columns
  const entryColumns = [
    {
      key: '_select', label: '', width: 36, render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleSelect(row.id)}
          onClick={e => e.stopPropagation()}
          style={{ cursor: 'pointer' }}
        />
      ),
    },
    {
      key: 'tools', label: 'Tool', render: (v) => (
        <span style={{ fontWeight: 500, fontSize: 13 }}>{v?.name || 'Unknown'}</span>
      ),
    },
    {
      key: 'status', label: 'Entry Status', width: 110, render: (v) => (
        <StatusBadge status={v || 'draft'} small />
      ),
    },
    {
      key: 'frontmatter', label: 'Category', width: 160, render: (v) => (
        <span style={{ color: colors.muted, fontSize: 12 }}>{v?.primaryCategory || '-'}</span>
      ),
    },
    {
      key: 'updated_at', label: 'Updated', width: 100, render: (v) => (
        <span style={{ color: colors.dim, fontSize: 12 }}>{timeAgo(v)}</span>
      ),
    },
  ];

  const filtered = filteredEntries();

  return (
    <Layout>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Directory</h1>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div style={{ marginTop: 20 }}>
        {/* Entries Tab */}
        {activeTab === 'entries' && (
          <>
            {/* Filter chips + bulk actions */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 16, flexWrap: 'wrap', gap: 8,
            }}>
              {/* Filters */}
              <div style={{ display: 'flex', gap: 6 }}>
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => { setStatusFilter(f); setSelectedIds([]); }}
                    style={{
                      padding: '4px 12px', fontSize: 12, borderRadius: 6,
                      border: `1px solid ${statusFilter === f ? colors.accent : colors.border}`,
                      background: statusFilter === f ? 'rgba(59,130,246,0.15)' : 'transparent',
                      color: statusFilter === f ? colors.accent : colors.dim,
                      cursor: 'pointer', textTransform: 'capitalize',
                    }}
                  >
                    {f} {f !== 'all' && `(${entries.filter(e => e.status === f).length})`}
                    {f === 'all' && `(${entries.length})`}
                  </button>
                ))}
              </div>

              {/* Bulk actions */}
              {selectedIds.length > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: colors.muted }}>{selectedIds.length} selected</span>
                  <button
                    onClick={handleBulkWrite}
                    disabled={writing}
                    style={{
                      padding: '5px 14px', fontSize: 12, fontWeight: 500, borderRadius: 6,
                      border: '1px solid #164e63', background: 'rgba(22,78,99,0.3)',
                      color: '#22d3ee', cursor: writing ? 'wait' : 'pointer',
                      opacity: writing ? 0.5 : 1,
                    }}
                  >
                    {writing ? 'Writing...' : 'Write Selected'}
                  </button>
                  <button
                    onClick={handleBulkPublish}
                    disabled={publishing}
                    style={{
                      padding: '5px 14px', fontSize: 12, fontWeight: 500, borderRadius: 6,
                      border: '1px solid #14532d', background: 'rgba(5,46,22,0.3)',
                      color: '#4ade80', cursor: publishing ? 'wait' : 'pointer',
                      opacity: publishing ? 0.5 : 1,
                    }}
                  >
                    {publishing ? 'Publishing...' : 'Publish Selected'}
                  </button>
                </div>
              )}
            </div>

            {/* Action result toast */}
            {actionResult && (
              <div style={{
                padding: '8px 14px', marginBottom: 12, borderRadius: 8, fontSize: 12,
                background: actionResult.type === 'success' ? 'rgba(5,46,22,0.3)' : 'rgba(69,10,10,0.3)',
                border: `1px solid ${actionResult.type === 'success' ? '#14532d' : '#450a0a'}`,
                color: actionResult.type === 'success' ? '#4ade80' : '#f87171',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>{actionResult.message}</span>
                <button
                  onClick={() => setActionResult(null)}
                  style={{ background: 'none', border: 'none', color: colors.dim, cursor: 'pointer', fontSize: 14 }}
                >&times;</button>
              </div>
            )}

            {/* Select all checkbox */}
            {!loading && filtered.length > 0 && (
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.length === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: 11, color: colors.dim }}>Select all</span>
              </div>
            )}

            {loading ? (
              <p style={{ color: colors.dim, fontSize: 13 }}>Loading entries...</p>
            ) : (
              <DataTable
                columns={entryColumns}
                data={filtered}
                onRowClick={(row) => {
                  loadDetail(row.id);
                  setSelected(row);
                  setEditingContent(false);
                }}
                emptyMessage="No directory entries yet."
              />
            )}

            {/* Detail modal */}
            {selected && (
              <div
                style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                }}
                onClick={() => { setSelected(null); setDetailEntry(null); setEditingContent(false); }}
              >
                <div
                  style={{
                    background: colors.surface, border: `1px solid ${colors.border}`,
                    borderRadius: 12, padding: 24, width: '100%', maxWidth: 800,
                    maxHeight: '85vh', overflow: 'auto',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                        {selected.tools?.name || 'Entry'}
                      </h2>
                      <StatusBadge status={detailEntry?.status || selected.status || 'draft'} small />
                    </div>
                    <button
                      onClick={() => { setSelected(null); setDetailEntry(null); setEditingContent(false); }}
                      style={{ background: 'none', border: 'none', color: colors.dim, fontSize: 20, cursor: 'pointer' }}
                    >&times;</button>
                  </div>

                  {detailLoading ? (
                    <p style={{ color: colors.dim, fontSize: 13 }}>Loading...</p>
                  ) : detailEntry ? (
                    <>
                      {/* Status controls */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        {['draft', 'review', 'published'].map(s => (
                          <button
                            key={s}
                            onClick={() => saveEntry(detailEntry.id, { status: s })}
                            disabled={savingEntry || detailEntry.status === s}
                            style={{
                              padding: '4px 12px', fontSize: 11, borderRadius: 6,
                              border: `1px solid ${detailEntry.status === s ? colors.accent : colors.border}`,
                              background: detailEntry.status === s ? 'rgba(59,130,246,0.15)' : 'transparent',
                              color: detailEntry.status === s ? colors.accent : colors.dim,
                              cursor: detailEntry.status === s ? 'default' : 'pointer',
                              textTransform: 'capitalize',
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      {/* Frontmatter (read-only JSON viewer) */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{
                          fontSize: 11, fontWeight: 600, color: colors.dim,
                          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
                        }}>
                          Frontmatter
                        </div>
                        <div style={{
                          padding: 12, background: colors.bg, borderRadius: 8,
                          border: `1px solid ${colors.border}`, fontSize: 11,
                          fontFamily: "'IBM Plex Mono', monospace", color: colors.muted,
                          maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap',
                        }}>
                          {JSON.stringify(detailEntry.frontmatter, null, 2)}
                        </div>
                      </div>

                      {/* Content (markdown preview + editor) */}
                      <div>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
                        }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, color: colors.dim,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>
                            Content
                          </span>
                          <button
                            onClick={() => {
                              if (editingContent) {
                                saveEntry(detailEntry.id, { content: contentDraft });
                              } else {
                                setEditingContent(true);
                                setContentDraft(detailEntry.content || '');
                              }
                            }}
                            disabled={savingEntry}
                            style={{
                              padding: '3px 10px', fontSize: 11, borderRadius: 4,
                              border: `1px solid ${colors.border}`, background: 'transparent',
                              color: editingContent ? '#3b82f6' : colors.dim, cursor: 'pointer',
                            }}
                          >
                            {savingEntry ? 'Saving...' : editingContent ? 'Save' : 'Edit'}
                          </button>
                        </div>
                        {editingContent ? (
                          <textarea
                            value={contentDraft}
                            onChange={e => setContentDraft(e.target.value)}
                            spellCheck={false}
                            style={{
                              width: '100%', minHeight: 300, maxHeight: 500, padding: 12,
                              border: `1px solid ${colors.border}`, borderRadius: 8,
                              background: colors.bg, color: colors.text, fontSize: 12,
                              lineHeight: 1.7, fontFamily: "'IBM Plex Mono', monospace",
                              resize: 'vertical', outline: 'none',
                            }}
                          />
                        ) : (
                          <div style={{
                            padding: 12, background: colors.bg, borderRadius: 8,
                            border: `1px solid ${colors.border}`, fontSize: 13,
                            lineHeight: 1.7, color: colors.muted, whiteSpace: 'pre-wrap',
                            maxHeight: 400, overflow: 'auto',
                          }}>
                            {detailEntry.content || 'No content yet.'}
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 20,
            }}>
              <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>
                Scope: <code style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: colors.text, background: colors.bg, padding: '2px 6px', borderRadius: 4 }}>agents/directory</code>
                {' '}&middot; {settings.length} setting{settings.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={saveAll}
                disabled={!dirty || saving}
                style={{
                  padding: '6px 16px', fontSize: 12, fontWeight: 500,
                  border: '1px solid', borderRadius: 6, cursor: dirty ? 'pointer' : 'default',
                  background: dirty ? '#3b82f6' : 'transparent',
                  borderColor: dirty ? '#3b82f6' : colors.border,
                  color: dirty ? 'white' : colors.dim,
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {configLoading ? (
              <p style={{ color: colors.dim, fontSize: 13 }}>Loading configuration...</p>
            ) : settings.length === 0 ? (
              <p style={{ color: colors.dim, fontSize: 13 }}>No settings found for this scope.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {settings.map(s => {
                  const long = isLongValue(s.value);
                  const displayValue = long ? formatForEdit(s.value) : (s.value || '');

                  return (
                    <div
                      key={s.key}
                      style={{
                        background: colors.surface,
                        border: `1px solid ${s._dirty ? '#3b82f6' : colors.border}`,
                        borderRadius: 10, overflow: 'hidden',
                      }}
                    >
                      <div style={{
                        padding: '10px 14px',
                        borderBottom: `1px solid ${s._dirty ? 'rgba(59,130,246,0.2)' : colors.border}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{
                          fontSize: 12, fontWeight: 600, color: colors.text,
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}>
                          {s.key}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {s._dirty && (
                            <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 500 }}>modified</span>
                          )}
                          {s.description && (
                            <span style={{ fontSize: 11, color: colors.dim }}>{s.description}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ padding: 12 }}>
                        {long ? (
                          <textarea
                            value={displayValue}
                            onChange={e => updateValue(s.key, e.target.value)}
                            spellCheck={false}
                            style={{
                              width: '100%', minHeight: 180, maxHeight: 500, padding: '10px 12px',
                              border: `1px solid ${colors.border}`,
                              borderRadius: 6, background: colors.bg, color: colors.text,
                              fontSize: 12, lineHeight: 1.6, outline: 'none', resize: 'vertical',
                              fontFamily: "'IBM Plex Mono', monospace",
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={displayValue}
                            onChange={e => updateValue(s.key, e.target.value)}
                            style={{
                              width: '100%', padding: '8px 10px',
                              border: `1px solid ${colors.border}`,
                              borderRadius: 6, background: colors.bg, color: colors.text,
                              fontSize: 13, outline: 'none',
                              fontFamily: "'IBM Plex Mono', monospace",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
