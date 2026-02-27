import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import TabBar from '../../components/TabBar';
import { colors, typeColors, cronToHuman, formatDuration, timeAgo } from '../../lib/theme';
import dagre from 'dagre';
import {
  Background, BackgroundVariant, BaseEdge, Controls,
  EdgeLabelRenderer, Handle, Position,
} from '@xyflow/react';

const ReactFlow = dynamic(
  () => import('@xyflow/react').then((mod) => mod.ReactFlow),
  { ssr: false }
);

// Status overlay icons
const statusIcons = {
  completed: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="#22c55e" /><path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  failed: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="#ef4444" /><path d="M5 5l4 4M9 5l-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  started: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="#3b82f6"><animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" /></circle><circle cx="7" cy="7" r="3" fill="white" /></svg>,
};

const stepIcons = {
  play: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 3l9 5-9 5V3z" fill="currentColor" /></svg>,
  gear: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6.5 1.5l-.2 1.4a4.5 4.5 0 0 0-1.6.9L3.4 3.2l-1.5 2.6 1.1.9a4.5 4.5 0 0 0 0 1.8l-1.1.9 1.5 2.6 1.3-.6a4.5 4.5 0 0 0 1.6.9l.2 1.4h3l.2-1.4a4.5 4.5 0 0 0 1.6-.9l1.3.6 1.5-2.6-1.1-.9a4.5 4.5 0 0 0 0-1.8l1.1-.9-1.5-2.6-1.3.6a4.5 4.5 0 0 0-1.6-.9L9.5 1.5h-3zM8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" fill="currentColor" /></svg>,
  sparkle: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" fill="currentColor" /></svg>,
  check: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  database: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="4" rx="5" ry="2" fill="currentColor" /><path d="M3 4v3c0 1.1 2.2 2 5 2s5-.9 5-2V4" stroke="currentColor" strokeWidth="1.2" fill="none" /><path d="M3 7v3c0 1.1 2.2 2 5 2s5-.9 5-2V7" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>,
  globe: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" fill="none" /><ellipse cx="8" cy="8" rx="2.5" ry="5.5" stroke="currentColor" strokeWidth="1.2" fill="none" /><line x1="2.5" y1="8" x2="13.5" y2="8" stroke="currentColor" strokeWidth="1.2" /></svg>,
  mail: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M2 5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" /></svg>,
  wrench: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.7 1.3a4 4 0 0 0-4.5 6.3L2.5 12.3a1 1 0 0 0 0 1.4l.8.8a1 1 0 0 0 1.4 0l4.7-4.7a4 4 0 0 0 6.3-4.5l-2.3 2.3-1.8-.4-.4-1.8 2.3-2.3z" fill="currentColor" /></svg>,
};

// Loop-back edge
function LoopBackEdge({ id, sourceX, sourceY, targetX, targetY, label, style }) {
  const clearance = 70;
  const r = 10;
  const topY = Math.min(sourceY, targetY) - clearance;
  const edgePath = [
    `M ${sourceX} ${sourceY}`, `L ${sourceX} ${topY + r}`,
    `Q ${sourceX} ${topY} ${sourceX - r} ${topY}`,
    `L ${targetX + r} ${topY}`, `Q ${targetX} ${topY} ${targetX} ${topY + r}`,
    `L ${targetX} ${targetY}`,
  ].join(' ');
  const labelX = (sourceX + targetX) / 2;
  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div style={{
            position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${topY}px)`,
            background: '#1e1b4b', color: '#e0e7ff', fontSize: 12, fontWeight: 600,
            padding: '3px 8px', borderRadius: 4, pointerEvents: 'none',
          }}>{label}</div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { loopBack: LoopBackEdge };

// Dagre layout
function getLayoutedElements(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 140 });
  nodes.forEach(n => g.setNode(n.id, { width: 180, height: 60 }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return {
    nodes: nodes.map(n => { const p = g.node(n.id); return { ...n, position: { x: p.x - 90, y: p.y - 30 } }; }),
    edges,
  };
}

// Custom node
function FlowNode({ data }) {
  const tc = typeColors[data.nodeType] || typeColors.action;
  const icon = stepIcons[data.icon] || stepIcons.gear;
  return (
    <div style={{
      background: tc.bg, border: `1.5px solid ${data.isHighlighted ? '#fafafa' : tc.border}`,
      borderRadius: 10, padding: '10px 14px', minWidth: 160, color: tc.text, fontSize: '0.8rem',
      position: 'relative', opacity: data.stepStatus === 'pending' ? 0.4 : 1,
      boxShadow: data.isHighlighted ? '0 0 16px rgba(255,255,255,0.2)' : data.stepStatus === 'started' ? '0 0 12px rgba(59,130,246,0.25)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: tc.border, border: 'none', width: 6, height: 6 }} />
      <Handle type="source" position={Position.Right} style={{ background: tc.border, border: 'none', width: 6, height: 6 }} />
      <Handle type="source" position={Position.Top} id="top-source" style={{ background: tc.border, border: 'none', width: 4, height: 4, opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="top-target" style={{ background: tc.border, border: 'none', width: 4, height: 4, opacity: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
        <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{data.label}</span>
      </div>
      {data.nodeType === 'external' && <div style={{ fontSize: '0.65rem', marginTop: 4, opacity: 0.7 }}>External automation</div>}
      {data.stepStatus && data.stepStatus !== 'pending' && statusIcons[data.stepStatus] && (
        <div style={{ position: 'absolute', top: -6, right: -6 }}>{statusIcons[data.stepStatus]}</div>
      )}
    </div>
  );
}

const nodeTypes = { flowNode: FlowNode };

function buildGraph(flowDef, stepStatuses, highlightedNode) {
  if (!flowDef?.steps) return { nodes: [], edges: [] };
  const nodes = flowDef.steps.map(step => ({
    id: step.id, type: 'flowNode', position: { x: 0, y: 0 },
    data: { label: step.label, nodeType: step.type || 'action', icon: step.icon || 'gear', stepStatus: stepStatuses?.[step.id] || null, isHighlighted: highlightedNode === step.id },
  }));
  if (flowDef.triggeredBy) flowDef.triggeredBy.forEach(extId => nodes.push({ id: `ext_from_${extId}`, type: 'flowNode', position: { x: 0, y: 0 }, data: { label: extId.split('/').pop(), nodeType: 'external', icon: 'play' } }));
  if (flowDef.triggers) flowDef.triggers.forEach(extId => nodes.push({ id: `ext_to_${extId}`, type: 'flowNode', position: { x: 0, y: 0 }, data: { label: extId.split('/').pop(), nodeType: 'external', icon: 'check' } }));

  const stepIndex = {};
  flowDef.steps.forEach((step, i) => { stepIndex[step.id] = i; });
  const edges = [];
  if (flowDef.edges) flowDef.edges.forEach((edge, i) => {
    const isBackEdge = stepIndex[edge.from] !== undefined && stepIndex[edge.to] !== undefined && stepIndex[edge.from] > stepIndex[edge.to];
    edges.push({
      id: `e-${i}`, source: edge.from, target: edge.to,
      ...(isBackEdge ? { sourceHandle: 'top-source', targetHandle: 'top-target', type: 'loopBack' } : {}),
      label: edge.label || '', animated: stepStatuses?.[edge.from] === 'started',
      style: { stroke: edge.label ? '#6366f1' : '#525252', strokeWidth: edge.label ? 2 : 1.5, strokeDasharray: edge.label ? '6,3' : 'none' },
      labelStyle: { fill: '#e0e7ff', fontSize: 12, fontWeight: 600 },
      labelBgStyle: { fill: '#1e1b4b', fillOpacity: 0.9 },
      labelBgPadding: [6, 4], labelBgBorderRadius: 4,
    });
  });
  if (flowDef.triggeredBy && flowDef.steps.length > 0) flowDef.triggeredBy.forEach(extId => edges.push({ id: `ext_from_${extId}`, source: `ext_from_${extId}`, target: flowDef.steps[0].id, style: { stroke: '#525252', strokeWidth: 1.5, strokeDasharray: '5,5' } }));
  if (flowDef.triggers && flowDef.steps.length > 0) flowDef.triggers.forEach(extId => edges.push({ id: `ext_to_${extId}`, source: flowDef.steps[flowDef.steps.length - 1].id, target: `ext_to_${extId}`, style: { stroke: '#525252', strokeWidth: 1.5, strokeDasharray: '5,5' } }));
  return getLayoutedElements(nodes, edges);
}

function deduplicateSteps(rawSteps) {
  const seen = new Map();
  const order = [];
  for (const step of rawSteps) {
    if (!seen.has(step.step_name)) order.push(step.step_name);
    seen.set(step.step_name, step);
  }
  return order.map(name => seen.get(name));
}

function buildProgressiveStatuses(uniqueSteps, upToIndex) {
  const map = {};
  for (let i = 0; i <= upToIndex && i < uniqueSteps.length; i++) {
    map[uniqueSteps[i].step_name] = uniqueSteps[i].status;
  }
  return map;
}

const execStatusColors = { completed: '#22c55e', failed: '#ef4444', started: '#3b82f6', running: '#3b82f6', success: '#22c55e', failure: '#ef4444' };

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'executions', label: 'Executions' },
  { key: 'configuration', label: 'Configuration' },
];

export default function AgentDetail() {
  const router = useRouter();
  const automationId = router.query.id ? router.query.id.join('/') : null;

  const [activeTab, setActiveTab] = useState('overview');
  const [automation, setAutomation] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [rawSteps, setRawSteps] = useState([]);
  const [playbackIndex, setPlaybackIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [configKeys, setConfigKeys] = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [metadataLoading, setMetadataLoading] = useState(false);

  const uniqueSteps = useMemo(() => deduplicateSteps(rawSteps), [rawSteps]);

  useEffect(() => {
    if (!automationId) return;
    async function fetchData() {
      setLoading(true);
      try {
        const [autoRes, execRes] = await Promise.all([
          fetch(`/api/automations/${automationId}`),
          fetch(`/api/executions?automation_id=${encodeURIComponent(automationId)}&limit=20`),
        ]);
        if (autoRes.ok) setAutomation(await autoRes.json());
        else setError('Automation not found');
        if (execRes.ok) setExecutions(await execRes.json());
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }
    fetchData();
  }, [automationId]);

  useEffect(() => {
    if (!selectedExecution) { setRawSteps([]); setPlaybackIndex(-1); return; }
    async function fetchSteps() {
      try {
        const res = await fetch(`/api/executions/${selectedExecution}/steps`);
        if (res.ok) {
          const steps = await res.json();
          setRawSteps(steps);
          const unique = deduplicateSteps(steps);
          setPlaybackIndex(unique.length - 1);
        }
      } catch (err) {
        console.error('Failed to load steps:', err);
      }
    }
    fetchSteps();
  }, [selectedExecution]);

  // Fetch config and metadata when tab switches to configuration
  useEffect(() => {
    if (activeTab !== 'configuration' || !automationId) return;
    async function fetchConfig() {
      setConfigLoading(true);
      setMetadataLoading(true);
      try {
        const [configRes, metaRes] = await Promise.all([
          fetch(`/api/config/scope/${automationId}`),
          fetch(`/api/automations/${automationId}/metadata`),
        ]);
        if (configRes.ok) setConfigKeys(await configRes.json());
        if (metaRes.ok) setMetadata(await metaRes.json());
      } catch (err) {
        console.error('Failed to load config:', err);
      }
      setConfigLoading(false);
      setMetadataLoading(false);
    }
    fetchConfig();
  }, [activeTab, automationId]);

  const stepStatuses = useMemo(() => {
    if (playbackIndex < 0 || uniqueSteps.length === 0) return null;
    return buildProgressiveStatuses(uniqueSteps, playbackIndex);
  }, [uniqueSteps, playbackIndex]);

  const highlightedNode = useMemo(() => {
    if (playbackIndex < 0 || playbackIndex >= uniqueSteps.length) return null;
    return uniqueSteps[playbackIndex].step_name;
  }, [uniqueSteps, playbackIndex]);

  const { nodes, edges } = useMemo(() => {
    if (!automation?.flow_definition) return { nodes: [], edges: [] };
    return buildGraph(automation.flow_definition, stepStatuses, highlightedNode);
  }, [automation, stepStatuses, highlightedNode]);

  function goToStep(i) { setPlaybackIndex(Math.max(-1, Math.min(i, uniqueSteps.length - 1))); }

  async function handleTrigger() {
    setTriggering(true); setTriggerResult(null);
    try {
      const res = await fetch(`/api/automations/${automationId}/trigger`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) setTriggerResult({ ok: false, message: data.error || 'Failed' });
      else {
        setTriggerResult({ ok: true, message: 'Triggered successfully' });
        setTimeout(async () => {
          const r = await fetch(`/api/executions?automation_id=${encodeURIComponent(automationId)}&limit=20`);
          if (r.ok) setExecutions(await r.json());
        }, 2000);
      }
    } catch (err) { setTriggerResult({ ok: false, message: err.message }); }
    setTriggering(false);
  }

  async function handleToggle() {
    if (!automation) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/automations/${automationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !automation.enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setAutomation(prev => ({ ...prev, enabled: data.enabled }));
      }
    } catch (err) { console.error('Toggle failed:', err); }
    setToggling(false);
  }

  async function handleConfigSave(key, value, scope) {
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, scope }),
      });
      if (res.ok) {
        setConfigKeys(prev => prev.map(k => k.key === key && k.scope === scope ? { ...k, value } : k));
      }
    } catch (err) { console.error('Config save failed:', err); }
  }

  if (loading) return <Layout><p style={{ color: colors.dim, marginTop: 40 }}>Loading...</p></Layout>;
  if (error || !automation) return (
    <Layout>
      <Link href="/agents" style={{ color: colors.dim, fontSize: 12 }}>&larr; All Agents</Link>
      <p style={{ color: colors.error, marginTop: 16 }}>{error || 'Not found'}</p>
    </Layout>
  );

  const flowDef = automation.flow_definition;

  return (
    <Layout>
      {/* Back link */}
      <Link href="/agents" style={{ color: colors.dim, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        All Agents
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>{automation.name}</h1>
        <StatusBadge status={automation.type} />
        <StatusBadge status={automation.runtime || 'railway'} />
        <StatusBadge status={automation.enabled ? 'active' : 'paused'} />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={handleToggle} disabled={toggling} style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: toggling ? 'default' : 'pointer',
            background: automation.enabled ? '#1a1a1a' : '#052e16',
            border: `1px solid ${automation.enabled ? '#525252' : '#166534'}`,
            color: automation.enabled ? colors.muted : '#4ade80', opacity: toggling ? 0.5 : 1,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {automation.enabled ? (toggling ? 'Pausing...' : 'Pause') : (toggling ? 'Resuming...' : 'Resume')}
          </button>
          <button onClick={handleTrigger} disabled={triggering || !automation.enabled} style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: '#1e3a5f', border: '1px solid #2563eb', color: '#60a5fa',
            cursor: triggering || !automation.enabled ? 'default' : 'pointer',
            opacity: triggering || !automation.enabled ? 0.5 : 1,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {triggering ? 'Triggering...' : 'Run Now'}
          </button>
        </div>
      </div>

      {triggerResult && (
        <div style={{ fontSize: 12, color: triggerResult.ok ? '#4ade80' : '#ef4444', marginBottom: 8 }}>{triggerResult.message}</div>
      )}

      <div style={{ marginBottom: 20 }} />

      {/* Tabs */}
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Details */}
          <Section title="Details">
            {automation.description && <p style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>{automation.description}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              <DetailItem label="Schedule" value={cronToHuman(automation.schedule)} />
              <DetailItem label="ID" value={automation.id} mono />
              <DetailItem label="Runtime" value={automation.runtime || 'railway'} />
              {automation.tags?.length > 0 && (
                <DetailItem label="Tags" value={
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {automation.tags.map(t => (
                      <span key={t} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: '#1a1a2e', color: '#818cf8' }}>{t}</span>
                    ))}
                  </div>
                } />
              )}
            </div>
          </Section>

          {/* Workflow Diagram */}
          <Section title="Workflow">
            {nodes.length > 0 ? (
              <div style={{ height: 340, background: '#0c0c0e', borderRadius: 12, border: `1px solid ${colors.border}`, position: 'relative' }}>
                <ReactFlow
                  nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
                  fitView fitViewOptions={{ padding: 0.3 }}
                  nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
                  panOnDrag zoomOnScroll zoomOnPinch zoomOnDoubleClick minZoom={0.3} maxZoom={3}
                >
                  <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1a1a1a" />
                  <Controls showInteractive={false} position="top-right" />
                </ReactFlow>
                <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, color: colors.dim, pointerEvents: 'none' }}>
                  Scroll to zoom &middot; Drag to pan
                </div>
              </div>
            ) : (
              <div style={{ padding: 32, textAlign: 'center', background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}` }}>
                <p style={{ color: colors.dim }}>No workflow definition</p>
                <p style={{ color: colors.subtle, fontSize: 12, marginTop: 4 }}>
                  Add a <code style={{ background: '#1a1a1a', padding: '1px 5px', borderRadius: 3 }}>flow</code> export to see the diagram.
                </p>
              </div>
            )}
          </Section>

          {/* Process Steps */}
          {flowDef?.steps?.length > 0 && (
            <Section title="Process Steps">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {flowDef.steps.map((step, i) => {
                  const tc = typeColors[step.type] || typeColors.action;
                  const icon = stepIcons[step.icon] || stepIcons.gear;
                  const inEdges = flowDef.edges?.filter(e => e.to === step.id) || [];
                  const outEdges = flowDef.edges?.filter(e => e.from === step.id) || [];
                  return (
                    <div key={step.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px',
                      background: colors.surface, borderRadius: 8, border: `1px solid ${colors.border}`,
                    }}>
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: tc.bg, color: tc.text, fontSize: 12, fontWeight: 700,
                      }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ display: 'flex', color: tc.text }}>{icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{step.label}</span>
                          <span style={{
                            fontSize: 10, padding: '1px 6px', borderRadius: 3,
                            background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`,
                          }}>{step.type || 'action'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: colors.dim, marginTop: 4 }}>
                          {inEdges.length > 0 && (
                            <span>From: {inEdges.map(e => {
                              const src = flowDef.steps.find(s => s.id === e.from);
                              return src ? src.label : e.from;
                            }).join(', ')}{inEdges.some(e => e.label) ? ` (${inEdges.find(e => e.label)?.label})` : ''}</span>
                          )}
                          {outEdges.length > 0 && (
                            <span>To: {outEdges.map(e => {
                              const tgt = flowDef.steps.find(s => s.id === e.to);
                              return tgt ? tgt.label : e.to;
                            }).join(', ')}{outEdges.some(e => e.label) ? ` (${outEdges.find(e => e.label)?.label})` : ''}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </>
      )}

      {/* Executions Tab */}
      {activeTab === 'executions' && (
        <>
          {/* Execution Walkthrough */}
          {selectedExecution && uniqueSteps.length > 0 && (
            <Section title="Execution Walkthrough">
              <div style={{ background: '#0c0c0e', borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                {/* Playback controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${colors.border}` }}>
                  <PbBtn onClick={() => goToStep(0)} disabled={playbackIndex <= 0}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3v8M5 7l6-4v8L5 7z" fill="currentColor" transform="scale(-1,1) translate(-14,0)" /></svg>
                  </PbBtn>
                  <PbBtn onClick={() => goToStep(playbackIndex - 1)} disabled={playbackIndex <= 0}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L4 7l5 4V3z" fill="currentColor" /></svg>
                  </PbBtn>
                  <span style={{ fontSize: 12, color: colors.text, minWidth: 80, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    Step {playbackIndex + 1} / {uniqueSteps.length}
                  </span>
                  <PbBtn onClick={() => goToStep(playbackIndex + 1)} disabled={playbackIndex >= uniqueSteps.length - 1}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l5 4-5 4V3z" fill="currentColor" /></svg>
                  </PbBtn>
                  <PbBtn onClick={() => goToStep(uniqueSteps.length - 1)} disabled={playbackIndex >= uniqueSteps.length - 1}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3v8M5 7l6-4v8L5 7z" fill="currentColor" /></svg>
                  </PbBtn>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', gap: 2, padding: '8px 14px' }}>
                  {uniqueSteps.map((step, i) => (
                    <div key={step.id} onClick={() => goToStep(i)} style={{
                      flex: 1, height: 4, borderRadius: 2, cursor: 'pointer', transition: 'background 0.2s',
                      background: i <= playbackIndex ? (step.status === 'failed' ? '#ef4444' : step.status === 'started' ? '#3b82f6' : '#22c55e') : '#262626',
                      outline: i === playbackIndex ? '2px solid rgba(255,255,255,0.3)' : 'none', outlineOffset: 1,
                    }} title={step.step_name} />
                  ))}
                </div>

                {/* Step list */}
                <div style={{ padding: 8 }}>
                  {uniqueSteps.map((step, i) => (
                    <div key={step.id} onClick={() => goToStep(i)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                      background: i === playbackIndex ? '#1a1a2e' : 'transparent',
                      border: i === playbackIndex ? '1px solid #312e81' : '1px solid transparent',
                      transition: 'all 0.15s', opacity: i <= playbackIndex ? 1 : 0.4,
                    }}>
                      <span style={{ display: 'flex', marginTop: 1, flexShrink: 0 }}>
                        {i <= playbackIndex ? (statusIcons[step.status] || <span style={{ width: 14, height: 14, borderRadius: '50%', background: colors.dim, display: 'inline-block' }} />)
                          : <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#262626', display: 'inline-block' }} />}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{step.step_name}</span>
                          <span style={{
                            fontSize: 10, padding: '1px 6px', borderRadius: 3,
                            background: step.status === 'completed' ? '#052e16' : step.status === 'failed' ? '#450a0a' : '#172554',
                            color: step.status === 'completed' ? '#4ade80' : step.status === 'failed' ? '#fca5a5' : '#60a5fa',
                          }}>{step.status}</span>
                          {step.duration_ms != null && (
                            <span style={{ fontSize: 11, color: colors.dim, marginLeft: 'auto' }}>{formatDuration(step.duration_ms)}</span>
                          )}
                        </div>
                        {i === playbackIndex && step.metadata && Object.keys(step.metadata).length > 0 && (
                          <div style={{ marginTop: 6, padding: '6px 8px', background: '#111', borderRadius: 4, border: `1px solid ${colors.border}` }}>
                            {Object.entries(step.metadata).map(([key, val]) => (
                              <div key={key} style={{ display: 'flex', gap: 8, fontSize: 11, padding: '2px 0' }}>
                                <span style={{ color: colors.muted, minWidth: 80 }}>{key}:</span>
                                <span style={{ color: colors.text, wordBreak: 'break-all' }}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* Execution History */}
          <Section title="Execution History">
            {executions.length === 0 ? (
              <p style={{ color: colors.dim, fontSize: 13 }}>No executions yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '40px 80px 1fr 100px 1fr', gap: 12, padding: '6px 12px', fontSize: 10, color: colors.dim, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span></span><span>Status</span><span>Started</span><span>Duration</span><span>Error</span>
                </div>
                {executions.map(exec => (
                  <div key={exec.id} onClick={() => setSelectedExecution(selectedExecution === exec.id ? null : exec.id)} style={{
                    display: 'grid', gridTemplateColumns: '40px 80px 1fr 100px 1fr', gap: 12, padding: '8px 12px',
                    background: selectedExecution === exec.id ? '#1a1a2e' : colors.surface, borderRadius: 6, cursor: 'pointer',
                    fontSize: 13, alignItems: 'center',
                    border: selectedExecution === exec.id ? '1px solid #312e81' : '1px solid transparent', transition: 'background 0.15s',
                  }}
                    onMouseEnter={(e) => { if (selectedExecution !== exec.id) e.currentTarget.style.background = '#1a1a1a'; }}
                    onMouseLeave={(e) => { if (selectedExecution !== exec.id) e.currentTarget.style.background = colors.surface; }}
                  >
                    <span style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: execStatusColors[exec.status] || colors.dim, animation: exec.status === 'running' ? 'pulse 1.5s infinite' : 'none' }} />
                    </span>
                    <span style={{ color: execStatusColors[exec.status] || colors.dim, fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>{exec.status || 'unknown'}</span>
                    <span>{timeAgo(exec.started_at)}</span>
                    <span style={{ color: colors.muted }}>{formatDuration(exec.duration_ms)}</span>
                    <span style={{ color: exec.error ? '#ef4444' : colors.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exec.error || '-'}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {/* Configuration Tab */}
      {activeTab === 'configuration' && (
        <>
          {(configLoading || metadataLoading) ? (
            <p style={{ color: colors.dim, fontSize: 13 }}>Loading configuration...</p>
          ) : (
            <>
              {/* Operational Parameters */}
              <Section title="Operational Parameters">
                {metadata?.operationalParams && Object.keys(metadata.operationalParams).length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {Object.entries(metadata.operationalParams).map(([key, val]) => (
                      <div key={key} style={{
                        padding: '10px 14px', background: colors.surface, borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.dim, marginBottom: 4 }}>
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: 13, color: colors.text, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {String(val)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: colors.dim, fontSize: 13 }}>No operational parameters exported by this agent.</p>
                )}
              </Section>

              {/* Configuration Keys */}
              <Section title="Configuration Keys">
                {configKeys.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}` }}>
                    <p style={{ color: colors.dim }}>No configuration keys</p>
                    <p style={{ color: colors.subtle, fontSize: 12, marginTop: 4 }}>
                      Config keys scoped to <code style={{ background: '#1a1a1a', padding: '1px 5px', borderRadius: 3 }}>{automationId}</code> or <code style={{ background: '#1a1a1a', padding: '1px 5px', borderRadius: 3 }}>_global</code> will appear here.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {configKeys.map(cfg => (
                      <ConfigRow key={`${cfg.scope}:${cfg.key}`} cfg={cfg} onSave={handleConfigSave} />
                    ))}
                  </div>
                )}
              </Section>

              {/* Agent Prompts */}
              <Section title="Agent Prompts">
                {metadata?.prompts && Object.keys(metadata.prompts).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Object.entries(metadata.prompts).map(([key, val]) => (
                      <PromptBlock key={key} name={key} content={val} />
                    ))}
                  </div>
                ) : (
                  <p style={{ color: colors.dim, fontSize: 13 }}>No prompts exported by this agent.</p>
                )}
              </Section>
            </>
          )}
        </>
      )}
    </Layout>
  );
}

function ConfigRow({ cfg, onSave }) {
  const [value, setValue] = useState(typeof cfg.value === 'string' ? cfg.value : JSON.stringify(cfg.value));
  const [dirty, setDirty] = useState(false);

  function handleChange(e) {
    setValue(e.target.value);
    setDirty(true);
  }

  function handleSave() {
    let parsed = value;
    try { parsed = JSON.parse(value); } catch {}
    onSave(cfg.key, parsed, cfg.scope);
    setDirty(false);
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      background: colors.surface, borderRadius: 8, border: `1px solid ${colors.border}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{cfg.key}</span>
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 3,
            background: cfg.scope === '_global' ? '#1e3a5f' : '#1a1a2e',
            color: cfg.scope === '_global' ? '#60a5fa' : '#818cf8',
          }}>{cfg.scope}</span>
        </div>
        {cfg.description && <p style={{ fontSize: 11, color: colors.dim, margin: 0 }}>{cfg.description}</p>}
      </div>
      <input
        value={value}
        onChange={handleChange}
        style={{
          width: 260, padding: '5px 8px', fontSize: 12, borderRadius: 4,
          background: '#111', border: `1px solid ${dirty ? '#2563eb' : colors.border}`,
          color: colors.text, fontFamily: "'IBM Plex Mono', monospace",
          outline: 'none',
        }}
      />
      {dirty && (
        <button onClick={handleSave} style={{
          padding: '4px 10px', fontSize: 11, fontWeight: 500, borderRadius: 4,
          background: '#1e3a5f', border: '1px solid #2563eb', color: '#60a5fa', cursor: 'pointer',
        }}>Save</button>
      )}
    </div>
  );
}

function DetailItem({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.dim, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: colors.muted, ...(mono ? { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 } : {}) }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.muted }}>{title}</h2>
        <div style={{ flex: 1, height: 1, background: colors.border }} />
      </div>
      {children}
    </div>
  );
}

function PromptBlock({ name, content }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: colors.surface, borderRadius: 8, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: expanded ? `1px solid ${colors.border}` : 'none',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{name.replace(/_/g, ' ')}</span>
        <span style={{ fontSize: 11, color: colors.dim }}>{expanded ? 'Collapse' : 'Expand'}</span>
      </div>
      {expanded && (
        <pre style={{
          padding: 14, margin: 0, fontSize: 12, lineHeight: 1.6,
          color: colors.muted, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          fontFamily: "'IBM Plex Mono', monospace", maxHeight: 400, overflow: 'auto',
        }}>
          {content}
        </pre>
      )}
    </div>
  );
}

function PbBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: 'none', border: `1px solid ${disabled ? '#1a1a1a' : '#333'}`, borderRadius: 4,
      padding: '4px 6px', color: disabled ? '#333' : '#999', cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', transition: 'all 0.15s',
    }}>{children}</button>
  );
}
