import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { colors } from '../lib/theme';

const typeBadge = {
  ai: { bg: '#2e1065', text: '#c084fc', label: 'AI' },
  database: { bg: '#052e16', text: '#4ade80', label: 'Database' },
  publish: { bg: '#172554', text: '#60a5fa', label: 'Publish' },
  email: { bg: '#451a03', text: '#fbbf24', label: 'Email' },
};

const statusDot = {
  configured: colors.success,
  partial: colors.warning,
  missing: colors.error,
};

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const [intRes, cfgRes] = await Promise.all([
          fetch('/api/integrations').then(r => r.ok ? r.json() : []),
          fetch('/api/config').then(r => r.ok ? r.json() : []),
        ]);
        setIntegrations(intRes);
        setConfig(cfgRes);
      } catch (err) {
        console.error('Failed to load integrations:', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function runTest(id) {
    setTesting(id);
    try {
      const res = await fetch(`/api/integrations/${id}/test`);
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [id]: data }));
    } catch (err) {
      setTestResults(prev => ({ ...prev, [id]: { ok: false, error: err.message } }));
    }
    setTesting(null);
  }

  // Group config by scope
  const configByScope = {};
  config.forEach(c => {
    if (!configByScope[c.scope]) configByScope[c.scope] = [];
    configByScope[c.scope].push(c);
  });

  if (loading) return <Layout><p style={{ color: colors.dim, marginTop: 40 }}>Loading integrations...</p></Layout>;

  return (
    <Layout>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Integrations</h1>
      <p style={{ color: colors.muted, fontSize: 13, marginBottom: 24 }}>
        External services and API connections used by the platform.
      </p>

      {/* Service Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 12,
        marginBottom: 40,
      }}>
        {integrations.map(svc => {
          const badge = typeBadge[svc.type] || typeBadge.ai;
          const result = testResults[svc.id];
          const isTesting = testing === svc.id;

          return (
            <div key={svc.id} style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: statusDot[svc.status],
                    flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{svc.name}</span>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px',
                  borderRadius: 4, background: badge.bg, color: badge.text,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {badge.label}
                </span>
              </div>

              {/* Description */}
              <p style={{ color: colors.muted, fontSize: 12, margin: 0, lineHeight: 1.4 }}>
                {svc.description}
              </p>

              {/* Env vars */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {svc.envStatus.map(ev => (
                  <span key={ev.name} style={{
                    fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                    padding: '2px 8px', borderRadius: 4,
                    background: ev.configured ? '#052e16' : '#450a0a',
                    color: ev.configured ? '#4ade80' : '#f87171',
                  }}>
                    {ev.name}
                  </span>
                ))}
              </div>

              {/* Model info for AI services */}
              {svc.defaultModel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: colors.dim }}>Model:</span>
                  <span style={{
                    fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                    color: colors.muted, padding: '1px 6px', borderRadius: 3,
                    background: '#0f0f12',
                  }}>
                    {svc.defaultModel}
                  </span>
                </div>
              )}

              {/* Used by */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: colors.dim }}>Used by:</span>
                {svc.usedBy.map(agent => (
                  <span key={agent} style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 3,
                    background: '#1e1b4b', color: '#818cf8',
                  }}>
                    {agent}
                  </span>
                ))}
              </div>

              {/* Test button + result */}
              {svc.testable && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                  <button
                    onClick={() => runTest(svc.id)}
                    disabled={isTesting || svc.status === 'missing'}
                    style={{
                      fontSize: 12, padding: '5px 14px', borderRadius: 6,
                      border: `1px solid ${colors.border}`,
                      background: isTesting ? colors.surfaceHover : 'transparent',
                      color: svc.status === 'missing' ? colors.subtle : colors.muted,
                      cursor: svc.status === 'missing' ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                  {result && (
                    <span style={{
                      fontSize: 11,
                      color: result.ok ? colors.success : colors.error,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      {result.ok
                        ? `OK ${result.latency}ms — ${result.detail}`
                        : `Failed: ${result.error}`}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Config Overview */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.muted }}>
            Agent Configuration
          </h2>
          <span style={{ fontSize: 11, color: colors.subtle }}>{config.length} keys</span>
          <div style={{ flex: 1, height: 1, background: colors.border }} />
        </div>

        {Object.keys(configByScope).length === 0 ? (
          <p style={{ color: colors.dim, fontSize: 13 }}>No config keys found.</p>
        ) : (
          Object.entries(configByScope).map(([scope, keys]) => (
            <div key={scope} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: colors.muted,
                marginBottom: 6, padding: '0 2px',
              }}>
                {scope}
              </div>
              <div style={{
                background: colors.surface, border: `1px solid ${colors.border}`,
                borderRadius: 8, overflow: 'hidden',
              }}>
                {keys.map((cfg, i) => (
                  <div key={cfg.key} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 14px', fontSize: 12,
                    borderTop: i > 0 ? `1px solid ${colors.border}` : 'none',
                  }}>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      color: colors.text, fontWeight: 500, minWidth: 200,
                    }}>
                      {cfg.key}
                    </span>
                    <span style={{
                      color: colors.muted, flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {cfg.encrypted ? '••••••' : (
                        typeof cfg.value === 'string' && cfg.value.length > 80
                          ? cfg.value.slice(0, 80) + '...'
                          : String(cfg.value ?? '')
                      )}
                    </span>
                    {cfg.description && (
                      <span style={{ color: colors.dim, fontSize: 11, flexShrink: 0 }}>
                        {cfg.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
