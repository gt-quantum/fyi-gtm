import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import { StatRow } from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { colors, timeAgo, formatDuration } from '../lib/theme';

export default function Dashboard() {
  const [tools, setTools] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/tools').then(r => r.ok ? r.json() : []),
      fetch('/api/executions').then(r => r.ok ? r.json() : []),
      fetch('/api/directory').then(r => r.ok ? r.json() : []),
      fetch('/api/newsletter/issues').then(r => r.ok ? r.json() : []),
    ]).then(([t, e, d, i]) => {
      setTools(t);
      setExecutions(e);
      setDirectory(d);
      setIssues(i);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <Layout><p style={{ color: colors.dim, marginTop: 40 }}>Loading dashboard...</p></Layout>;
  }

  const queued = tools.filter(t => t.research_status === 'queued').length;
  const researching = tools.filter(t => t.research_status === 'researching').length;
  const complete = tools.filter(t => t.research_status === 'complete').length;
  const failed = tools.filter(t => t.research_status === 'failed').length;

  const published = directory.filter(d => d.status === 'published').length;
  const drafts = directory.filter(d => d.status === 'draft').length;

  return (
    <Layout>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Dashboard</h1>

      {/* Pipeline stats */}
      <StatRow stats={[
        { label: 'Total Tools', value: tools.length, color: colors.text },
        { label: 'Queued', value: queued, color: colors.accent },
        { label: 'Researching', value: researching, color: colors.warning },
        { label: 'Complete', value: complete, color: colors.success },
        { label: 'Failed', value: failed, color: failed > 0 ? colors.error : colors.subtle },
      ]} />

      <StatRow stats={[
        { label: 'Directory Published', value: published, color: colors.success },
        { label: 'Directory Drafts', value: drafts, color: colors.purple },
        { label: 'Newsletter Issues', value: issues.length, color: colors.accent },
      ]} />

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <QuickLink href="/tools" label="Manage Tools" />
        <QuickLink href="/directory" label="Directory Entries" />
        <QuickLink href="/newsletter" label="Newsletter" />
        <QuickLink href="/agents" label="View Agents" />
      </div>

      {/* Recent executions */}
      <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600 }}>Recent Executions</h2>
          <span style={{ fontSize: 11, color: colors.dim }}>{executions.length} shown</span>
        </div>
        {executions.length === 0 ? (
          <p style={{ color: colors.dim, fontSize: 13, padding: 24, textAlign: 'center' }}>No executions yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Agent</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Started</th>
                  <th style={thStyle}>Duration</th>
                  <th style={thStyle}>Error</th>
                </tr>
              </thead>
              <tbody>
                {executions.map(ex => (
                  <tr key={ex.id} style={{ transition: 'background 0.1s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={tdStyle}>
                      <Link href={`/agents/${ex.automation_id}`} style={{ color: colors.accent, fontSize: 13 }}>
                        {ex.automation_id}
                      </Link>
                    </td>
                    <td style={tdStyle}><StatusBadge status={ex.status} small /></td>
                    <td style={{ ...tdStyle, color: colors.dim, fontSize: 12 }}>{timeAgo(ex.started_at)}</td>
                    <td style={{ ...tdStyle, color: colors.dim, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {formatDuration(ex.duration_ms)}
                    </td>
                    <td style={{ ...tdStyle, color: colors.error, fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ex.error || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

function QuickLink({ href, label }) {
  return (
    <Link href={href}>
      <div style={{
        padding: '8px 16px', borderRadius: 8,
        border: `1px solid ${colors.border}`, background: colors.surface,
        fontSize: 12, fontWeight: 500, color: colors.muted,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.borderHover; e.currentTarget.style.color = colors.text; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted; }}
      >
        {label}
      </div>
    </Link>
  );
}

const thStyle = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a',
  borderBottom: '1px solid #27272a', whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '10px 14px', borderBottom: '1px solid #27272a', verticalAlign: 'middle',
};
