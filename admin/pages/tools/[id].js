import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import TabBar from '../../components/TabBar';
import StatusBadge from '../../components/StatusBadge';
import { colors } from '../../lib/theme';

const tabs = [
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'content', label: 'Content' },
  { key: 'metadata', label: 'Metadata' },
  { key: 'research', label: 'Research Data' },
];

const NEWSLETTER_STATUSES = ['none', 'queued', 'scheduled', 'sent'];

export default function ToolDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [tool, setTool] = useState(null);
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);
  const [nlStatus, setNlStatus] = useState('none');
  const [nlPriority, setNlPriority] = useState(0);

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
        ai_automation: data.ai_automation || '',
        one_liner: data.one_liner || '',
        group_category: data.group_category || '',
      });

      // Try loading directory entry for this tool
      const dirRes = await fetch('/api/directory');
      if (dirRes.ok) {
        const entries = await dirRes.json();
        const match = entries.find(e => e.tool_id === data.id);
        if (match) {
          // Fetch full entry with content
          const fullRes = await fetch(`/api/directory/${match.id}`);
          if (fullRes.ok) {
            const full = await fullRes.json();
            setEntry(full);
            setEditContent(full.content || '');
          }
        }
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
        ai_automation: editMeta.ai_automation,
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

      {/* Pipeline tab */}
      {activeTab === 'pipeline' && (
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
                <label style={{ display: 'block', fontSize: 11, color: colors.dim, marginBottom: 3, fontWeight: 500 }}>
                  Newsletter Status
                </label>
                <select
                  value={nlStatus}
                  onChange={(e) => setNlStatus(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px',
                    border: `1px solid ${colors.border}`, borderRadius: 6,
                    background: colors.bg, color: colors.text, fontSize: 13, outline: 'none',
                  }}
                >
                  {NEWSLETTER_STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: colors.dim, marginBottom: 3, fontWeight: 500 }}>
                  Newsletter Priority (0-10)
                </label>
                <input
                  type="number" min="0" max="10"
                  value={nlPriority}
                  onChange={(e) => setNlPriority(parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%', padding: '7px 10px',
                    border: `1px solid ${colors.border}`, borderRadius: 6,
                    background: colors.bg, color: colors.text, fontSize: 13, outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content tab */}
      {activeTab === 'content' && (
        <div>
          {entry ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: colors.muted }}>Directory entry content (Markdown)</span>
                <button onClick={saveContent} disabled={saving} style={saveBtnStyle}>
                  {saving ? 'Saving...' : 'Save Content'}
                </button>
              </div>
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

      {/* Metadata tab */}
      {activeTab === 'metadata' && (
        <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={saveMetadata} disabled={saving} style={saveBtnStyle}>
              {saving ? 'Saving...' : 'Save Metadata'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {Object.entries(editMeta).map(([key, val]) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 11, color: colors.dim, marginBottom: 3, fontWeight: 500 }}>
                  {key.replace(/_/g, ' ')}
                </label>
                <input
                  value={val}
                  onChange={(e) => setEditMeta(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{
                    width: '100%', padding: '7px 10px',
                    border: `1px solid ${colors.border}`, borderRadius: 6,
                    background: colors.bg, color: colors.text, fontSize: 13, outline: 'none',
                  }}
                />
              </div>
            ))}
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
