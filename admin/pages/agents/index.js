import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { StatRow } from '../../components/StatCard';
import FilterChips from '../../components/FilterChips';
import StatusBadge from '../../components/StatusBadge';
import { colors, cronToHuman, timeAgo } from '../../lib/theme';

export default function Agents() {
  const [automations, setAutomations] = useState([]);
  const [executions, setExecutions] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const [autoRes, execRes] = await Promise.all([
          fetch('/api/automations').then(r => r.ok ? r.json() : []),
          fetch('/api/executions?limit=100').then(r => r.ok ? r.json() : []),
        ]);
        setAutomations(autoRes);

        // Group latest execution per automation
        const latest = {};
        execRes.forEach(e => { if (!latest[e.automation_id]) latest[e.automation_id] = e; });
        setExecutions(latest);
      } catch (err) {
        console.error('Failed to load agents:', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...automations];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    if (statusFilter === 'active') list = list.filter(a => a.enabled);
    if (statusFilter === 'paused') list = list.filter(a => !a.enabled);
    if (typeFilter !== 'all') list = list.filter(a => a.type === typeFilter);
    return list;
  }, [automations, search, statusFilter, typeFilter]);

  const workers = filtered.filter(a => a.type === 'worker');
  const agents = filtered.filter(a => a.type === 'agent');
  const activeCount = automations.filter(a => a.enabled).length;

  if (loading) return <Layout><p style={{ color: colors.dim, marginTop: 40 }}>Loading agents...</p></Layout>;

  return (
    <Layout>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Agents & Workers</h1>

      <StatRow stats={[
        { label: 'Total', value: automations.length, color: colors.text },
        { label: 'Active', value: activeCount, color: colors.success },
        { label: 'Workers', value: automations.filter(a => a.type === 'worker').length, color: colors.accent },
        { label: 'Agents', value: automations.filter(a => a.type === 'agent').length, color: colors.purple },
      ]} />

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name, description, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: '8px 12px',
            background: colors.surface, border: `1px solid ${colors.border}`,
            borderRadius: 8, color: colors.text, fontSize: 13, outline: 'none',
          }}
        />
        <FilterChips label="Status" value={statusFilter} onChange={setStatusFilter}
          options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }]}
        />
        <FilterChips label="Type" value={typeFilter} onChange={setTypeFilter}
          options={[{ value: 'all', label: 'All' }, { value: 'worker', label: 'Workers' }, { value: 'agent', label: 'Agents' }]}
        />
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}` }}>
          <p style={{ color: colors.dim }}>No automations found.</p>
        </div>
      )}

      {workers.length > 0 && (
        <AutomationGroup title="Workers" items={workers} latestExecs={executions} accent={colors.accent} />
      )}
      {agents.length > 0 && (
        <AutomationGroup title="Agents" items={agents} latestExecs={executions} accent={colors.purple} />
      )}
    </Layout>
  );
}

function AutomationGroup({ title, items, latestExecs, accent }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, paddingLeft: 4 }}>
        <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.muted }}>
          {title}
        </h2>
        <span style={{ fontSize: 11, color: colors.subtle }}>{items.length}</span>
        <div style={{ flex: 1, height: 1, background: colors.border }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(a => (
          <AutomationCard key={a.id} automation={a} lastExec={latestExecs[a.id]} accent={accent} />
        ))}
      </div>
    </div>
  );
}

const statusDotColors = { success: '#22c55e', failure: '#ef4444', running: '#3b82f6' };

function AutomationCard({ automation: a, lastExec, accent }) {
  return (
    <Link href={`/agents/${a.id}`}>
      <div
        style={{
          display: 'flex', alignItems: 'stretch', background: colors.surface,
          borderRadius: 10, border: `1px solid ${colors.border}`, overflow: 'hidden',
          cursor: 'pointer', transition: 'border-color 0.2s, transform 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.borderHover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <div style={{ width: 3, background: accent, flexShrink: 0, opacity: a.enabled ? 1 : 0.3 }} />
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</span>
              {!a.enabled && (
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#422006', color: '#eab308', fontWeight: 500 }}>
                  paused
                </span>
              )}
            </div>
            {a.description && (
              <p style={{ color: colors.muted, fontSize: 13, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.description}
              </p>
            )}
            {a.tags && a.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {a.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#1e1b4b', color: '#818cf8', fontWeight: 500 }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            {lastExec && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDotColors[lastExec.status] || colors.dim }} />
                <span style={{ fontSize: 12, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {timeAgo(lastExec.started_at)}
                </span>
              </div>
            )}
            <span style={{
              fontSize: 12, color: colors.subtle, fontFamily: "'IBM Plex Mono', monospace",
              padding: '2px 8px', background: '#0f0f12', borderRadius: 4,
            }}>
              {cronToHuman(a.schedule)}
            </span>
            <span style={{ fontSize: 11, color: colors.subtle }}>{a.runtime}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
