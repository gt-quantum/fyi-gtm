import { useState, useEffect } from 'react';

export default function RunsHistory({ token }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRun, setSelectedRun] = useState(null);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const response = await fetch('/api/admin/runs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch newsletter runs');
      const data = await response.json();
      setRuns(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'published':
        return 'completed';
      case 'pending':
      case 'running':
      case 'research':
      case 'writing':
        return 'pending';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return '';
    }
  };

  if (loading) {
    return <div className="table-loading">Loading run history...</div>;
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Newsletter Run History</h2>
      </div>

      {error && <div className="form-error">{error}</div>}

      {runs.length === 0 ? (
        <div className="table-empty">No newsletter runs yet.</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Topic</th>
                <th>Status</th>
                <th>Content Preview</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>{new Date(run.run_date).toLocaleDateString()}</td>
                  <td>{run.newsletter_topics?.topic || '-'}</td>
                  <td>
                    <span className={`run-status ${getStatusClass(run.status)}`}>
                      {run.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="run-content-preview">
                    {run.newsletter_content ? run.newsletter_content.substring(0, 100) + '...' : '-'}
                  </td>
                  <td>
                    <button
                      className="action-btn"
                      onClick={() => setSelectedRun(run)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRun && (
        <div className="modal-overlay" onClick={() => setSelectedRun(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>Newsletter Run - {new Date(selectedRun.run_date).toLocaleDateString()}</h2>
              <button className="modal-close" onClick={() => setSelectedRun(null)}>
                &times;
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <strong>Topic:</strong> {selectedRun.newsletter_topics?.topic || 'N/A'}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>Status:</strong>{' '}
                <span className={`run-status ${getStatusClass(selectedRun.status)}`}>
                  {selectedRun.status || 'Unknown'}
                </span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>Content:</strong>
                <div
                  style={{
                    marginTop: '8px',
                    padding: '16px',
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    maxHeight: '400px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.875rem',
                  }}
                >
                  {selectedRun.newsletter_content || 'No content available'}
                </div>
              </div>
              {selectedRun.error_message && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Error:</strong>
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '16px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '0.875rem',
                    }}
                  >
                    {selectedRun.error_message}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
