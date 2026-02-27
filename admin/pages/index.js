import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function Dashboard() {
  const [tools, setTools] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/tools').then(r => r.ok ? r.json() : []),
      fetch('/api/executions').then(r => r.ok ? r.json() : [])
    ]).then(([t, e]) => {
      setTools(t);
      setExecutions(e);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Layout><p className="text-dim mt-4">Loading...</p></Layout>;

  const queued = tools.filter(t => t.research_status === 'queued').length;
  const researching = tools.filter(t => t.research_status === 'researching').length;
  const complete = tools.filter(t => t.research_status === 'complete').length;
  const failed = tools.filter(t => t.research_status === 'failed').length;

  return (
    <Layout>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: '20px 0' }}>Dashboard</h1>

      <div className="grid grid-4 mb-6">
        <div className="card stat">
          <div className="stat-value">{queued}</div>
          <div className="stat-label">Queued</div>
        </div>
        <div className="card stat">
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{researching}</div>
          <div className="stat-label">Researching</div>
        </div>
        <div className="card stat">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{complete}</div>
          <div className="stat-label">Complete</div>
        </div>
        <div className="card stat">
          <div className="stat-value" style={{ color: 'var(--error)' }}>{failed}</div>
          <div className="stat-label">Failed</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Recent Executions</h2>
        </div>
        {executions.length === 0 ? (
          <p className="text-dim text-sm">No executions yet</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {executions.map(ex => (
                  <tr key={ex.id}>
                    <td>{ex.automation_id}</td>
                    <td><span className={`badge badge-${ex.status}`}>{ex.status}</span></td>
                    <td className="text-dim text-xs">{new Date(ex.started_at).toLocaleString()}</td>
                    <td className="text-dim text-xs">{ex.duration_ms ? `${(ex.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                    <td className="text-xs truncate" style={{ color: 'var(--error)' }}>{ex.error || ''}</td>
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
