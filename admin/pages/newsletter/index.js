import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import ConfigEditor from '../../components/ConfigEditor';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { colors, timeAgo } from '../../lib/theme';

export default function Newsletter() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/api/newsletter/issues')
      .then(r => r.ok ? r.json() : [])
      .then(setIssues)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const columns = [
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
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Newsletter</h1>

      {/* Config editor */}
      <div style={{ marginBottom: 28 }}>
        <ConfigEditor scope="agents/newsletter" title="Newsletter Configuration" />
      </div>

      {/* Issue history */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Issue History</h2>
      </div>

      {loading ? (
        <p style={{ color: colors.dim, fontSize: 13 }}>Loading issues...</p>
      ) : (
        <DataTable
          columns={columns}
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
    </Layout>
  );
}
