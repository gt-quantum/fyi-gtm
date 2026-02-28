import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import TabBar from '../../components/TabBar';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { colors, timeAgo } from '../../lib/theme';

const tabs = [
  { key: 'issues', label: 'Issues' },
  { key: 'config', label: 'Configuration' },
];

export default function Newsletter() {
  const router = useRouter();
  const { tab } = router.query;
  const [activeTab, setActiveTab] = useState('issues');
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  // Config state
  const [settings, setSettings] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (tab && tabs.some(t => t.key === tab)) setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    fetch('/api/newsletter/issues')
      .then(r => r.ok ? r.json() : [])
      .then(setIssues)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setConfigLoading(true);
    try {
      const res = await fetch('/api/config?scope=agents/newsletter');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.map(s => ({ ...s, _original: s.value })));
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
          settings: changed.map(s => ({ key: s.key, value: s.value, scope: 'agents/newsletter' }))
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

  // Detect if a value is multiline or long (JSON, templates, etc.)
  function isLongValue(val) {
    if (!val) return false;
    if (val.includes('\n')) return true;
    if (val.length > 80) return true;
    // Try to detect JSON
    const trimmed = val.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) return true;
    return false;
  }

  // Pretty-format JSON for display
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

  const issueColumns = [
    { key: 'subject', label: 'Subject', render: (v, row) => {
      const display = v || (row.issue_number ? `Issue #${row.issue_number}` + (row.newsletter_topics?.topic ? ` — ${row.newsletter_topics.topic}` : '') : 'Untitled');
      return <span style={{ fontWeight: 500, fontSize: 13 }}>{display}</span>;
    }},
    { key: 'newsletter_topics', label: 'Topic', width: 160, render: (v) => (
      <span style={{ color: colors.muted, fontSize: 12 }}>{v?.topic || '-'}</span>
    )},
    { key: 'status', label: 'Status', width: 100, render: (v) => <StatusBadge status={v || 'draft'} small /> },
    { key: 'created_at', label: 'Created', width: 110, render: (v) => <span style={{ color: colors.dim, fontSize: 12 }}>{timeAgo(v)}</span> },
    { key: 'sent_at', label: 'Sent', width: 110, render: (v) => <span style={{ color: colors.dim, fontSize: 12 }}>{v ? timeAgo(v) : '-'}</span> },
  ];

  return (
    <Layout>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Newsletter</h1>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div style={{ marginTop: 20 }}>
        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <>
            {loading ? (
              <p style={{ color: colors.dim, fontSize: 13 }}>Loading issues...</p>
            ) : (
              <DataTable
                columns={issueColumns}
                data={issues}
                onRowClick={(row) => setSelected(selected?.id === row.id ? null : row)}
                emptyMessage="No newsletter issues yet."
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
                onClick={() => setSelected(null)}
              >
                <div
                  style={{
                    background: colors.surface, border: `1px solid ${colors.border}`,
                    borderRadius: 12, padding: 24, width: '100%', maxWidth: 640,
                    maxHeight: '80vh', overflow: 'auto',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600 }}>{selected.subject || (selected.issue_number ? `Issue #${selected.issue_number}` + (selected.newsletter_topics?.topic ? ` — ${selected.newsletter_topics.topic}` : '') : 'Untitled')}</h2>
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: colors.dim, fontSize: 20, cursor: 'pointer' }}>&times;</button>
                  </div>
                  <div style={{ fontSize: 12, color: colors.dim, marginBottom: 12 }}>
                    Topic: {selected.newsletter_topics?.topic || '-'} &middot; Status: {selected.status || 'draft'}
                  </div>
                  {selected.content && (
                    <div style={{
                      padding: 16, background: colors.bg, borderRadius: 8,
                      border: `1px solid ${colors.border}`, fontSize: 13,
                      lineHeight: 1.7, color: colors.muted, whiteSpace: 'pre-wrap',
                      maxHeight: 400, overflow: 'auto',
                    }}>
                      {selected.content}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div>
            {/* Save bar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 20,
            }}>
              <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>
                Scope: <code style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: colors.text, background: colors.bg, padding: '2px 6px', borderRadius: 4 }}>agents/newsletter</code>
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
                {settings.map((s) => {
                  const long = isLongValue(s.value);
                  const displayValue = long ? formatForEdit(s.value) : (s.value || '');

                  return (
                    <div
                      key={s.key}
                      style={{
                        background: colors.surface,
                        border: `1px solid ${s._dirty ? '#3b82f6' : colors.border}`,
                        borderRadius: 10,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Key header */}
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

                      {/* Value editor */}
                      <div style={{ padding: 12 }}>
                        {long ? (
                          <textarea
                            value={displayValue}
                            onChange={(e) => updateValue(s.key, e.target.value)}
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
                            type={s.encrypted ? 'password' : 'text'}
                            value={displayValue}
                            onChange={(e) => updateValue(s.key, e.target.value)}
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
