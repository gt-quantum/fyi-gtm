import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import TabBar from '../../components/TabBar';
import StatusBadge from '../../components/StatusBadge';
import DataTable from '../../components/DataTable';
import { colors, timeAgo } from '../../lib/theme';

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'directory', label: 'Directory Entry' },
  { key: 'newsletter', label: 'Newsletter' },
  { key: 'research', label: 'Research Data' },
];

const NEWSLETTER_STATUSES = ['none', 'queued', 'scheduled', 'sent'];

export default function ToolDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [tool, setTool] = useState(null);
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);
  const [nlStatus, setNlStatus] = useState('none');
  const [nlPriority, setNlPriority] = useState(0);
  const [linkedIssues, setLinkedIssues] = useState([]);
  const [publishingEntry, setPublishingEntry] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // Editable fields
  const [editContent, setEditContent] = useState('');
  const [editMeta, setEditMeta] = useState({});

  useEffect(() => {
    if (!id) return;
    loadTool();
  }, [id]);

  async function loadTool() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/${id}`);
      if (!res.ok) { router.push('/tools'); return; }
      const data = await res.json();
      setTool(data);
      setNlStatus(data.newsletter_status || 'none');
      setNlPriority(data.newsletter_priority || 0);
      setEditMeta({
        primary_category: data.primary_category || '',
        category: data.category || '',
        pricing: data.pricing || '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
        integrations: Array.isArray(data.integrations) ? data.integrations.join(', ') : '',
        company_size: Array.isArray(data.company_size) ? data.company_size.join(', ') : '',
        ai_automation: Array.isArray(data.ai_automation) ? data.ai_automation.join(', ') : '',
        one_liner: data.one_liner || '',
        group_category: data.group_category || '',
        summary: data.summary || '',
        price_note: data.price_note || '',
      });

      // Load directory entry
      const dirRes = await fetch('/api/directory');
      if (dirRes.ok) {
        const entries = await dirRes.json();
        const match = entries.find(e => e.tool_id === data.id);
        if (match) {
          const fullRes = await fetch(`/api/directory/${match.id}`);
          if (fullRes.ok) {
            const full = await fullRes.json();
            setEntry(full);
            setEditContent(full.content || '');
          }
        }
      }

      // Load linked newsletter issues
      const nlRes = await fetch('/api/newsletter/issues');
      if (nlRes.ok) {
        const allIssues = await nlRes.json();
        setLinkedIssues(allIssues.filter(i => i.tool_id === data.id));
      }
    } catch (err) {
      console.error('Failed to load tool:', err);
    }
    setLoading(false);
  }

  async function saveMetadata() {
    setSaving(true);
    try {
      const body = {
        primary_category: editMeta.primary_category,
        category: editMeta.category,
        pricing: editMeta.pricing,
        group_category: editMeta.group_category,
        one_liner: editMeta.one_liner,
        ai_automation: editMeta.ai_automation ? editMeta.ai_automation.split(',').map(s => s.trim()).filter(Boolean) : [],
        tags: editMeta.tags ? editMeta.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        integrations: editMeta.integrations ? editMeta.integrations.split(',').map(s => s.trim()).filter(Boolean) : [],
        company_size: editMeta.company_size ? editMeta.company_size.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      const res = await fetch(`/api/tools/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setTool(updated);
      }
    } catch (err) {
      alert('Failed to save');
    }
    setSaving(false);
  }

  async function saveContent() {
    if (!entry) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/directory/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEntry(updated);
      }
    } catch (err) {
      alert('Failed to save content');
    }
    setSaving(false);
  }

  async function publishEntry() {
    if (!entry) return;
    setPublishingEntry(true);
    setPublishResult(null);
    try {
      const res = await fetch('/api/directory/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: [entry.id] }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishResult({ ok: true, message: `Published. Commit: ${data.commitSha?.slice(0, 7)}` });
        loadTool();
      } else {
        setPublishResult({ ok: false, message: data.error });
      }
    } catch (err) {
      setPublishResult({ ok: false, message: err.message });
    }
    setPublishingEntry(false);
  }

  async function triggerResearch() {
    setResearching(true);
    try {
      const res = await fetch(`/api/tools/${id}/research`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTool(prev => ({ ...prev, research_status: 'researching' }));
      }
    } catch (err) {
      alert('Failed to trigger research');
    }
    setResearching(false);
  }

  async function saveNewsletter() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tools/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsletter_status: nlStatus, newsletter_priority: nlPriority }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTool(updated);
      }
    } catch (err) {
      alert('Failed to save newsletter settings');
    }
    setSaving(false);
  }

  if (loading) return <Layout><p style={{ color: colors.dim, marginTop: 40 }}>Loading...</p></Layout>;
  if (!tool) return <Layout><p style={{ color: colors.error, marginTop: 40 }}>Tool not found</p></Layout>;

  return (
    <Layout>
      {/* Back link */}
      <Link href="/tools" style={{ color: colors.dim, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        All Tools
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>{tool.name}</h1>
        <StatusBadge status={tool.research_status} />
        {tool.url && (
          <a href={tool.url} target="_blank" rel="noopener" style={{ color: colors.accent, fontSize: 12 }}>
            {new URL(tool.url).hostname} &#8599;
          </a>
        )}
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(tool.research_status === 'queued' || tool.research_status === 'failed' || tool.research_status === 'complete') && (
          <button onClick={triggerResearch} disabled={researching} style={actionBtnStyle}>
            {researching ? 'Starting...' : tool.research_status === 'complete' ? 'Re-Research' : 'Research'}
          </button>
        )}
        {tool.research_status === 'researching' && (
          <span style={{ padding: '5px 12px', fontSize: 12, color: colors.warning }}>Research in progress...</span>
        )}
      </div>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Overview tab — Pipeline + Classification */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pipeline stages */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <PipelineStage
              label="Research"
              status={tool.research_status}
              statusColor={tool.research_status === 'complete' ? '#22c55e' : tool.research_status === 'researching' ? '#f59e0b' : tool.research_status === 'failed' ? '#ef4444' : colors.dim}
              detail={tool.research_data?.generated_at ? `Completed ${new Date(tool.research_data.generated_at).toLocaleDateString()}` : null}
            />
            <PipelineStage
              label="Directory"
              status={entry ? entry.status : 'no entry'}
              statusColor={entry?.status === 'published' ? '#22c55e' : entry?.status === 'approved' ? '#3b82f6' : entry ? '#f59e0b' : colors.dim}
              detail={entry ? `${entry.status} entry` : 'Not created yet'}
            />
            <PipelineStage
              label="Newsletter"
              status={tool.newsletter_status || 'none'}
              statusColor={tool.newsletter_status === 'sent' ? '#22c55e' : tool.newsletter_status === 'scheduled' ? '#3b82f6' : tool.newsletter_status === 'queued' ? '#f59e0b' : colors.dim}
              detail={tool.newsletter_priority > 0 ? `Priority: ${tool.newsletter_priority}/10` : null}
            />
          </div>

          {/* Newsletter settings */}
          <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Newsletter Pipeline</h3>
              <button onClick={saveNewsletter} disabled={saving} style={saveBtnStyle}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Newsletter Status</label>
                <select
                  value={nlStatus}
                  onChange={(e) => setNlStatus(e.target.value)}
                  style={selectStyle}
                >
                  {NEWSLETTER_STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Newsletter Priority (0-10)</label>
                <input
                  type="number" min="0" max="10"
                  value={nlPriority}
                  onChange={(e) => setNlPriority(parseInt(e.target.value) || 0)}
                  style={fieldInputStyle}
                />
              </div>
            </div>
          </div>

          {/* Classification fields */}
          <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Classification</h3>
              <button onClick={saveMetadata} disabled={saving} style={saveBtnStyle}>
                {saving ? 'Saving...' : 'Save Metadata'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {Object.entries(editMeta).map(([key, val]) => (
                <div key={key}>
                  <label style={labelStyle}>{key.replace(/_/g, ' ')}</label>
                  <input
                    value={val}
                    onChange={(e) => setEditMeta(prev => ({ ...prev, [key]: e.target.value }))}
                    style={fieldInputStyle}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Directory Entry tab */}
      {activeTab === 'directory' && (
        <div>
          {entry ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <StatusBadge status={entry.status || 'draft'} />
                  {entry.published_at && (
                    <span style={{ fontSize: 12, color: colors.dim }}>
                      Published {new Date(entry.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={publishEntry} disabled={publishingEntry} style={{
                    ...actionBtnStyle,
                    borderColor: '#166534', color: '#4ade80', background: '#052e16',
                  }}>
                    {publishingEntry ? 'Publishing...' : 'Publish to GitHub'}
                  </button>
                  <button onClick={saveContent} disabled={saving} style={saveBtnStyle}>
                    {saving ? 'Saving...' : 'Save Content'}
                  </button>
                </div>
              </div>

              {publishResult && (
                <div style={{
                  padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 12,
                  background: publishResult.ok ? '#052e16' : '#450a0a',
                  color: publishResult.ok ? '#4ade80' : '#f87171',
                  border: `1px solid ${publishResult.ok ? '#14532d' : '#7f1d1d'}`,
                }}>
                  {publishResult.message}
                </div>
              )}

              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{
                  width: '100%', minHeight: 400, padding: 16,
                  background: colors.surface, border: `1px solid ${colors.border}`,
                  borderRadius: 8, color: colors.text, fontSize: 13,
                  fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.6,
                  resize: 'vertical', outline: 'none',
                }}
              />
            </>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}` }}>
              <p style={{ color: colors.dim }}>No directory entry yet.</p>
              <p style={{ color: colors.subtle, fontSize: 12, marginTop: 4 }}>Run the directory agent to generate content from research data.</p>
            </div>
          )}
        </div>
      )}

      {/* Newsletter tab */}
      {activeTab === 'newsletter' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Newsletter settings (duplicated for quick access) */}
          <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Newsletter Settings</h3>
              <button onClick={saveNewsletter} disabled={saving} style={saveBtnStyle}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={nlStatus} onChange={(e) => setNlStatus(e.target.value)} style={selectStyle}>
                  {NEWSLETTER_STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority (0-10)</label>
                <input
                  type="number" min="0" max="10"
                  value={nlPriority}
                  onChange={(e) => setNlPriority(parseInt(e.target.value) || 0)}
                  style={fieldInputStyle}
                />
              </div>
            </div>
          </div>

          {/* Linked issues */}
          <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Linked Newsletter Issues</h3>
            {linkedIssues.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <p style={{ color: colors.dim, fontSize: 13 }}>This tool hasn't been featured in a newsletter yet.</p>
              </div>
            ) : (
              <DataTable
                columns={[
                  { key: 'issue_number', label: 'Issue', width: 80, render: (v) => <span style={{ fontWeight: 500 }}>#{v}</span> },
                  { key: 'newsletter_topics', label: 'Topic', render: (v) => <span style={{ color: colors.muted, fontSize: 13 }}>{v?.topic || '-'}</span> },
                  { key: 'status', label: 'Status', width: 100, render: (v) => <StatusBadge status={v || 'draft'} small /> },
                  { key: 'sent_at', label: 'Sent', width: 110, render: (v) => <span style={{ color: colors.dim, fontSize: 12 }}>{v ? timeAgo(v) : '-'}</span> },
                ]}
                data={linkedIssues}
                emptyMessage="No linked issues."
              />
            )}
          </div>
        </div>
      )}

      {/* Research Data tab */}
      {activeTab === 'research' && (
        <div>
          {tool.research_data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {tool.research_data.scraped && (
                <JsonViewer title="Scraped Website Data" data={tool.research_data.scraped} />
              )}
              {tool.research_data.haiku_research && (
                <TextViewer title="AI Research Summary" text={tool.research_data.haiku_research} />
              )}
              {tool.research_data.pipeline && (
                <JsonViewer title="Pipeline Metadata" data={tool.research_data.pipeline} />
              )}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}` }}>
              <p style={{ color: colors.dim }}>No research data available.</p>
              <p style={{ color: colors.subtle, fontSize: 12, marginTop: 4 }}>Trigger research to populate this tab.</p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

function JsonViewer({ title, data }) {
  return (
    <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${colors.border}` }}>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>{title}</h3>
      </div>
      <pre style={{
        padding: 16, margin: 0, overflow: 'auto', maxHeight: 400,
        fontSize: 12, lineHeight: 1.5, color: colors.muted,
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function TextViewer({ title, text }) {
  return (
    <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${colors.border}` }}>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>{title}</h3>
      </div>
      <div style={{
        padding: 16, maxHeight: 400, overflow: 'auto',
        fontSize: 13, lineHeight: 1.7, color: colors.muted, whiteSpace: 'pre-wrap',
      }}>
        {text}
      </div>
    </div>
  );
}

function PipelineStage({ label, status, statusColor, detail }) {
  return (
    <div style={{
      background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: 11, color: colors.dim, fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{status}</span>
      </div>
      {detail && <div style={{ fontSize: 11, color: colors.dim }}>{detail}</div>}
    </div>
  );
}

const actionBtnStyle = {
  padding: '6px 14px', border: `1px solid ${colors.border}`, borderRadius: 6,
  background: colors.surface, color: colors.muted, fontSize: 12, fontWeight: 500, cursor: 'pointer',
};

const saveBtnStyle = {
  padding: '6px 14px', border: '1px solid #3b82f6', borderRadius: 6,
  background: '#3b82f6', color: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer',
};

const labelStyle = {
  display: 'block', fontSize: 11, color: colors.dim, marginBottom: 3, fontWeight: 500,
};

const selectStyle = {
  width: '100%', padding: '7px 10px',
  border: `1px solid ${colors.border}`, borderRadius: 6,
  background: colors.bg, color: colors.text, fontSize: 13, outline: 'none',
};

const fieldInputStyle = {
  width: '100%', padding: '7px 10px',
  border: `1px solid ${colors.border}`, borderRadius: 6,
  background: colors.bg, color: colors.text, fontSize: 13, outline: 'none',
};
