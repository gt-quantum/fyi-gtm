import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { StatRow } from '../components/StatCard';
import { colors } from '../lib/theme';

const typeBadge = {
  ai: { bg: '#2e1065', text: '#c084fc', label: 'AI', accent: '#7c3aed' },
  database: { bg: '#052e16', text: '#4ade80', label: 'Database', accent: '#16a34a' },
  publish: { bg: '#172554', text: '#60a5fa', label: 'Publish', accent: '#2563eb' },
  email: { bg: '#451a03', text: '#fbbf24', label: 'Email', accent: '#d97706' },
  other: { bg: '#1a1a2e', text: '#818cf8', label: 'Other', accent: '#6366f1' },
};

const typeOptions = ['ai', 'database', 'publish', 'email', 'other'];

const statusMeta = {
  configured: { color: colors.success, label: 'Connected', glow: 'rgba(34,197,94,0.25)' },
  partial: { color: colors.warning, label: 'Partial', glow: 'rgba(234,179,8,0.2)' },
  missing: { color: colors.error, label: 'Missing Keys', glow: 'none' },
  no_keys: { color: colors.dim, label: 'No Keys', glow: 'none' },
};

const serviceIcons = {
  supabase: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M15.8 24.7c-.5.7-1.6.3-1.6-.6V16h8.4c1.2 0 1.8-1.4 1-2.2L12.2 3.3c-.5-.7-1.6-.3-1.6.6V12H2.4c-1.2 0-1.8 1.4-1 2.2l11.4 10.5z" fill="url(#sb1)"/>
      <defs><linearGradient id="sb1" x1="2" y1="3" x2="22" y2="25" gradientUnits="userSpaceOnUse"><stop stopColor="#249361"/><stop offset="1" stopColor="#3ECF8E"/></linearGradient></defs>
    </svg>
  ),
  anthropic: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M16.8 5h3.6L26 23h-3.6l-5.6-18zm-5.6 0H7.6L2 23h3.6l1.4-4.5h6.8L15.2 23h3.6L14 5h-2.8zm-1.4 10.2L12 7.8l2.2 7.4H9.8z" fill="#D4A574"/>
    </svg>
  ),
  openai: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M24.2 11.8a6 6 0 00-.5-5A6.1 6.1 0 0017 3.5a6 6 0 00-4.6 2.1 6 6 0 00-4.4-1.5A6.1 6.1 0 003.5 8a6 6 0 00.8 6.2 6 6 0 00.5 5A6.1 6.1 0 0011.5 22.5a6 6 0 004.4 1.5A6.1 6.1 0 0024.5 20a6 6 0 00-.3-8.2z" stroke="#10A37F" strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  perplexity: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="10" stroke="#20B8CD" strokeWidth="1.5" fill="none"/>
      <path d="M14 4v20M4 14h20M7 7l14 14M21 7L7 21" stroke="#20B8CD" strokeWidth="1" opacity="0.5"/>
      <circle cx="14" cy="14" r="3" fill="#20B8CD"/>
    </svg>
  ),
  github: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M14 3C7.9 3 3 7.9 3 14c0 4.9 3.2 9 7.6 10.5.6.1.8-.2.8-.5v-2c-3.1.7-3.7-1.3-3.7-1.3-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 1.7 2.6 1.2 3.2.9.1-.7.4-1.2.7-1.5-2.5-.3-5.1-1.2-5.1-5.5 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.4.1-3 0 0 .9-.3 3 1.1a10.5 10.5 0 015.6 0c2.1-1.4 3-1.1 3-1.1.6 1.6.2 2.7.1 3 .7.8 1.1 1.8 1.1 3 0 4.3-2.6 5.2-5.1 5.5.4.3.7 1 .7 2v3c0 .3.2.7.8.5A11 11 0 0025 14c0-6.1-4.9-11-11-11z" fill="#E6EDF3"/>
    </svg>
  ),
  kit: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="4" y="7" width="20" height="14" rx="2" stroke="#FB6970" strokeWidth="1.5" fill="none"/>
      <path d="M4 11l10 5 10-5" stroke="#FB6970" strokeWidth="1.5"/>
      <path d="M4 9l10 5 10-5" stroke="#FB6970" strokeWidth="1.5" fill="none"/>
    </svg>
  ),
};

// Fallback icon for user-created integrations
const defaultIcon = (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="4" y="4" width="20" height="20" rx="4" stroke={colors.dim} strokeWidth="1.3" fill="none"/>
    <path d="M10 14h8M14 10v8" stroke={colors.dim} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const emptyForm = { id: '', name: '', type: 'other', description: '', envVars: '', models: '', defaultModel: '', testable: false };

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [expandedScopes, setExpandedScopes] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [intRes, cfgRes] = await Promise.all([
        fetch('/api/integrations').then(r => r.ok ? r.json() : []),
        fetch('/api/config').then(r => r.ok ? r.json() : []),
      ]);
      setIntegrations(intRes);
      setConfig(cfgRes);
      const scopes = {};
      cfgRes.forEach(c => { scopes[c.scope] = true; });
      setExpandedScopes(scopes);
    } catch (err) {
      console.error('Failed to load integrations:', err);
    }
  }, []);

  useEffect(() => {
    reload().then(() => setLoading(false));
  }, [reload]);

  const runTest = useCallback(async (id) => {
    setTesting(id);
    setTestResults(prev => ({ ...prev, [id]: undefined }));
    try {
      const res = await fetch(`/api/integrations/${id}/test`);
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [id]: data }));
    } catch (err) {
      setTestResults(prev => ({ ...prev, [id]: { ok: false, error: err.message } }));
    }
    setTesting(null);
  }, []);

  const toggleScope = useCallback((scope) => {
    setExpandedScopes(prev => ({ ...prev, [scope]: !prev[scope] }));
  }, []);

  function openAdd() {
    setEditForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(svc) {
    setEditForm({
      id: svc.id,
      name: svc.name || '',
      type: svc.type || 'other',
      description: svc.description || '',
      envVars: (svc.envVars || []).join(', '),
      models: (svc.models || []).join(', '),
      defaultModel: svc.defaultModel || '',
      testable: !!svc.testable,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!editForm.id.trim() || !editForm.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        id: editForm.id.trim().toLowerCase().replace(/\s+/g, '-'),
        name: editForm.name.trim(),
        type: editForm.type,
        description: editForm.description.trim(),
        envVars: editForm.envVars ? editForm.envVars.split(',').map(s => s.trim()).filter(Boolean) : [],
        testable: editForm.testable,
      };
      if (editForm.models) {
        body.models = editForm.models.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (editForm.defaultModel) {
        body.defaultModel = editForm.defaultModel.trim();
      }
      await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setModalOpen(false);
      await reload();
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  }

  // Group config by scope
  const configByScope = {};
  config.forEach(c => {
    if (!configByScope[c.scope]) configByScope[c.scope] = [];
    configByScope[c.scope].push(c);
  });

  const connected = integrations.filter(s => s.status === 'configured').length;
  const aiCount = integrations.filter(s => s.type === 'ai').length;
  const testableCount = integrations.filter(s => s.testable).length;

  if (loading) return <Layout><p style={{ color: colors.dim, marginTop: 40 }}>Loading integrations...</p></Layout>;

  return (
    <Layout>
      <style>{`
        @keyframes integPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes integSpin { to { transform: rotate(360deg); } }
        @keyframes integFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Integrations</h1>
          <p style={{ color: colors.dim, fontSize: 13, margin: 0 }}>
            External services, API keys, and agent configuration
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{
            fontSize: 12, fontWeight: 500, padding: '8px 16px', borderRadius: 8,
            background: colors.accent, color: '#fff', border: 'none',
            cursor: 'pointer', transition: 'background 0.15s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.accentHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = colors.accent; }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Add Integration
        </button>
      </div>

      {/* Summary stats */}
      <StatRow stats={[
        { label: 'Services', value: integrations.length, color: colors.text },
        { label: 'Connected', value: connected, color: colors.success },
        { label: 'AI Providers', value: aiCount, color: colors.purple },
        { label: 'Testable', value: testableCount, color: colors.accent },
        { label: 'Config Keys', value: config.length, color: colors.muted },
      ]} />

      {/* Service Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 14,
        marginBottom: 44,
      }}>
        {integrations.map((svc, i) => (
          <ServiceCard
            key={svc.id}
            svc={svc}
            index={i}
            hovered={hoveredCard === svc.id}
            onHover={setHoveredCard}
            testing={testing === svc.id}
            testResult={testResults[svc.id]}
            onTest={runTest}
            onEdit={openEdit}
          />
        ))}
      </div>

      {/* Config Overview */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: colors.muted, margin: 0,
          }}>
            Agent Configuration
          </h2>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 10,
            background: colors.surface, color: colors.dim,
            border: `1px solid ${colors.border}`,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {config.length}
          </span>
          <div style={{ flex: 1, height: 1, background: colors.border }} />
        </div>

        {Object.keys(configByScope).length === 0 ? (
          <div style={{
            padding: 32, textAlign: 'center', background: colors.surface,
            borderRadius: 10, border: `1px solid ${colors.border}`,
          }}>
            <p style={{ color: colors.dim, fontSize: 13, margin: 0 }}>No configuration keys found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(configByScope).map(([scope, keys]) => (
              <ConfigScope
                key={scope}
                scope={scope}
                keys={keys}
                expanded={expandedScopes[scope]}
                onToggle={toggleScope}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <IntegrationModal
          form={editForm}
          onChange={setEditForm}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          saving={saving}
        />
      )}
    </Layout>
  );
}

function ServiceCard({ svc, index, hovered, onHover, testing, testResult, onTest, onEdit }) {
  const badge = typeBadge[svc.type] || typeBadge.other;
  const status = statusMeta[svc.status] || statusMeta.missing;
  const icon = serviceIcons[svc.id] || defaultIcon;

  return (
    <div
      onMouseEnter={() => onHover(svc.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        background: colors.surface,
        border: `1px solid ${hovered ? colors.borderHover : colors.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? `0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px ${colors.borderHover}` : 'none',
        animation: 'integFadeUp 0.3s ease both',
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${badge.accent}, transparent 80%)` }} />

      <div style={{ padding: '18px 20px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#0f0f12', border: `1px solid ${colors.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{svc.name}</span>
              </div>
              <p style={{ color: colors.dim, fontSize: 11, margin: '2px 0 0', lineHeight: 1.3 }}>
                {svc.description}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginTop: 2 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '3px 8px',
              borderRadius: 5, background: badge.bg, color: badge.text,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {badge.label}
            </span>
            {/* Edit button */}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(svc); }}
              style={{
                width: 24, height: 24, borderRadius: 5, border: 'none',
                background: 'transparent', color: colors.subtle,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = colors.muted; e.currentTarget.style.background = colors.surfaceHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = colors.subtle; e.currentTarget.style.background = 'transparent'; }}
              title="Edit integration"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8.5 1.5l2 2-7 7H1.5V8.5l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: colors.border, margin: '0 -20px', marginBottom: 14 }} />

        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: status.color, flexShrink: 0,
              boxShadow: svc.status === 'configured' ? `0 0 6px ${status.glow}` : 'none',
              animation: svc.status === 'configured' ? 'integPulse 2.5s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: status.color, letterSpacing: '0.02em' }}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Env var chips */}
        {svc.envStatus && svc.envStatus.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {svc.envStatus.map(ev => (
              <span key={ev.name} style={{
                fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                padding: '3px 8px', borderRadius: 5,
                background: ev.configured ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                color: ev.configured ? '#4ade80' : '#f87171',
                border: `1px solid ${ev.configured ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {ev.configured ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M3 3l4 4M7 3l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                )}
                {ev.name}
              </span>
            ))}
          </div>
        )}

        {/* Models list for AI services */}
        {svc.models && svc.models.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 10, color: colors.subtle, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 5 }}>
              Models
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {svc.models.map(model => {
                const isDefault = model === svc.defaultModel;
                return (
                  <span key={model} style={{
                    fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                    padding: '2px 8px', borderRadius: 4,
                    background: isDefault ? 'rgba(124,58,237,0.12)' : '#0c0c0f',
                    color: isDefault ? '#c084fc' : colors.dim,
                    border: `1px solid ${isDefault ? 'rgba(124,58,237,0.25)' : colors.border}`,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {isDefault && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <circle cx="4" cy="4" r="2.5" fill="#c084fc"/>
                      </svg>
                    )}
                    {model}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Test Connection */}
        {svc.testable && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 2 }}>
            <button
              onClick={() => onTest(svc.id)}
              disabled={testing || svc.status === 'missing'}
              onMouseEnter={(e) => { if (svc.status !== 'missing') e.currentTarget.style.borderColor = colors.borderHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; }}
              style={{
                fontSize: 11, padding: '6px 14px', borderRadius: 6,
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: svc.status === 'missing' ? colors.subtle : colors.muted,
                cursor: svc.status === 'missing' ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'inherit', fontWeight: 500,
                opacity: svc.status === 'missing' ? 0.5 : 1,
              }}
            >
              {testing && (
                <svg width="12" height="12" viewBox="0 0 12 12" style={{ animation: 'integSpin 0.8s linear infinite' }}>
                  <circle cx="6" cy="6" r="4.5" stroke={colors.subtle} strokeWidth="1.5" fill="none" strokeDasharray="14 14" strokeLinecap="round"/>
                </svg>
              )}
              {testing ? 'Testing...' : 'Test Connection'}
            </button>

            {testResult && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, animation: 'integFadeUp 0.2s ease' }}>
                {testResult.ok ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" fill="rgba(34,197,94,0.15)" stroke={colors.success} strokeWidth="1"/>
                    <path d="M4.5 7l2 2 3.5-3.5" stroke={colors.success} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" fill="rgba(239,68,68,0.15)" stroke={colors.error} strokeWidth="1"/>
                    <path d="M5 5l4 4M9 5l-4 4" stroke={colors.error} strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                )}
                <span style={{
                  fontSize: 10, color: testResult.ok ? colors.success : colors.error,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {testResult.ok ? `${testResult.latency}ms — ${testResult.detail}` : testResult.error}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigScope({ scope, keys, expanded, onToggle }) {
  const scopeLabel = scope === '_global' ? 'Global' : scope;

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div
        onClick={() => onToggle(scope)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = colors.surfaceHover; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            <path d="M4.5 2.5l3.5 3.5-3.5 3.5" stroke={colors.dim} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: colors.text, fontFamily: "'IBM Plex Mono', monospace" }}>
            {scopeLabel}
          </span>
        </div>
        <span style={{ fontSize: 10, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
          {keys.length} {keys.length === 1 ? 'key' : 'keys'}
        </span>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${colors.border}` }}>
          {keys.map((cfg, i) => (
            <div key={cfg.key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 16px 9px 38px', fontSize: 12,
              borderTop: i > 0 ? '1px solid rgba(39,39,42,0.5)' : 'none',
              transition: 'background 0.1s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                color: colors.muted, fontWeight: 500, minWidth: 200, fontSize: 11,
              }}>
                {cfg.key}
              </span>
              <span style={{
                color: colors.dim, flex: 1, fontSize: 11,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {cfg.encrypted ? '••••••••' : (
                  typeof cfg.value === 'string' && cfg.value.length > 60
                    ? cfg.value.slice(0, 60) + '...'
                    : String(cfg.value ?? '—')
                )}
              </span>
              {cfg.description && (
                <span style={{ color: colors.subtle, fontSize: 10, flexShrink: 0, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cfg.description}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrationModal({ form, onChange, onSave, onClose, saving }) {
  const isEdit = !!form.id && form.name;

  function set(field, value) {
    onChange(prev => ({ ...prev, [field]: value }));
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.surface, border: `1px solid ${colors.border}`,
          borderRadius: 14, width: 480, maxHeight: '85vh', overflow: 'auto',
          animation: 'modalIn 0.2s ease',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: `1px solid ${colors.border}`,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
            {isEdit ? 'Edit Integration' : 'Add Integration'}
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: 'transparent', color: colors.dim, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = colors.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = colors.dim; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ID + Name row */}
          <div style={{ display: 'flex', gap: 10 }}>
            <FieldGroup label="ID" flex={1}>
              <input
                value={form.id}
                onChange={(e) => set('id', e.target.value)}
                placeholder="e.g. my-service"
                disabled={isEdit}
                style={inputStyle(isEdit)}
              />
            </FieldGroup>
            <FieldGroup label="Name" flex={2}>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. My Service"
                style={inputStyle()}
              />
            </FieldGroup>
          </div>

          {/* Type */}
          <FieldGroup label="Type">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {typeOptions.map(t => {
                const b = typeBadge[t];
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    onClick={() => set('type', t)}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
                      border: `1px solid ${active ? b.accent : colors.border}`,
                      background: active ? b.bg : 'transparent',
                      color: active ? b.text : colors.dim,
                      cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
                      transition: 'all 0.15s',
                    }}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </FieldGroup>

          {/* Description */}
          <FieldGroup label="Description">
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What this service does..."
              style={inputStyle()}
            />
          </FieldGroup>

          {/* Env Vars */}
          <FieldGroup label="Environment Variables" hint="Comma-separated var names (checked at runtime)">
            <input
              value={form.envVars}
              onChange={(e) => set('envVars', e.target.value)}
              placeholder="e.g. MY_API_KEY, MY_SECRET"
              style={{ ...inputStyle(), fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}
            />
          </FieldGroup>

          {/* Models (for AI type) */}
          {form.type === 'ai' && (
            <>
              <FieldGroup label="Available Models" hint="Comma-separated model IDs">
                <input
                  value={form.models}
                  onChange={(e) => set('models', e.target.value)}
                  placeholder="e.g. model-a, model-b"
                  style={{ ...inputStyle(), fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}
                />
              </FieldGroup>
              <FieldGroup label="Default Model">
                {form.models ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {form.models.split(',').map(m => m.trim()).filter(Boolean).map(m => {
                      const active = form.defaultModel === m;
                      return (
                        <button
                          key={m}
                          onClick={() => set('defaultModel', m)}
                          style={{
                            fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                            padding: '3px 10px', borderRadius: 5,
                            border: `1px solid ${active ? 'rgba(124,58,237,0.4)' : colors.border}`,
                            background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
                            color: active ? '#c084fc' : colors.dim,
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {active && '● '}{m}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: colors.subtle }}>Add models above first</span>
                )}
              </FieldGroup>
            </>
          )}

          {/* Testable toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => set('testable', !form.testable)}
              style={{
                width: 36, height: 20, borderRadius: 10, border: 'none',
                background: form.testable ? colors.accent : colors.border,
                cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: form.testable ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%',
                background: form.testable ? '#fff' : colors.dim,
                transition: 'left 0.2s, background 0.2s',
              }} />
            </button>
            <span style={{ fontSize: 12, color: colors.muted }}>
              Connection testable
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '12px 20px', borderTop: `1px solid ${colors.border}`,
        }}>
          <button
            onClick={onClose}
            style={{
              fontSize: 12, padding: '7px 16px', borderRadius: 7,
              border: `1px solid ${colors.border}`, background: 'transparent',
              color: colors.muted, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.id.trim() || !form.name.trim()}
            style={{
              fontSize: 12, fontWeight: 500, padding: '7px 20px', borderRadius: 7,
              border: 'none', background: colors.accent, color: '#fff',
              cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit',
              opacity: (!form.id.trim() || !form.name.trim()) ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {saving ? 'Saving...' : 'Save Integration'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ label, hint, children, flex }) {
  return (
    <div style={{ flex }}>
      <label style={{
        fontSize: 11, fontWeight: 600, color: colors.muted,
        display: 'block', marginBottom: 5, letterSpacing: '0.02em',
      }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: colors.subtle, marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function inputStyle(disabled) {
  return {
    width: '100%', padding: '7px 10px', fontSize: 12,
    background: disabled ? '#0c0c0f' : colors.bg,
    border: `1px solid ${colors.border}`, borderRadius: 6,
    color: disabled ? colors.subtle : colors.text, outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
    opacity: disabled ? 0.6 : 1,
    boxSizing: 'border-box',
  };
}
