import { useState, useEffect } from 'react';
import { colors } from '../lib/theme';

export default function ConfigEditor({ scope, title }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [scope]);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch(`/api/config?scope=${encodeURIComponent(scope)}`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data.map(s => ({ ...s, _original: s.value })));
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
    setLoading(false);
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
          settings: changed.map(s => ({ key: s.key, value: s.value, scope }))
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

  if (loading) return <p style={{ color: colors.dim, fontSize: 13 }}>Loading configuration...</p>;

  return (
    <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: `1px solid ${colors.border}`,
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>{title || `Config: ${scope}`}</h3>
        <button
          onClick={saveAll}
          disabled={!dirty || saving}
          style={{
            padding: '5px 14px', fontSize: 12, fontWeight: 500,
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
      <div style={{ padding: 16 }}>
        {settings.length === 0 ? (
          <p style={{ color: colors.dim, fontSize: 13 }}>No settings found for this scope.</p>
        ) : settings.map((s) => (
          <div key={s.key} style={{ marginBottom: 14 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: colors.muted }}>{s.key}</span>
              {s.description && <span style={{ fontSize: 11, color: colors.dim }}>{s.description}</span>}
            </label>
            <input
              type={s.encrypted ? 'password' : 'text'}
              value={s.value || ''}
              onChange={(e) => updateValue(s.key, e.target.value)}
              style={{
                width: '100%', padding: '7px 10px',
                border: `1px solid ${s._dirty ? '#3b82f6' : colors.border}`,
                borderRadius: 6, background: colors.bg, color: colors.text,
                fontSize: 13, outline: 'none', fontFamily: "'IBM Plex Mono', monospace",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
