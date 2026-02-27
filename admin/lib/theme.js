// Zinc-based dark theme palette
export const colors = {
  bg: '#09090b',
  surface: '#18181b',
  surfaceHover: '#1f1f23',
  border: '#27272a',
  borderHover: '#3f3f46',
  text: '#fafafa',
  muted: '#a1a1aa',
  dim: '#71717a',
  subtle: '#52525b',
  accent: '#3b82f6',
  accentHover: '#2563eb',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  purple: '#a78bfa',
};

export const statusColors = {
  queued: { bg: '#1e3a5f', text: '#60a5fa' },
  researching: { bg: '#422006', text: '#fbbf24' },
  researched: { bg: '#1a2e05', text: '#a3e635' },
  analyzing: { bg: '#2e1065', text: '#c084fc' },
  complete: { bg: '#052e16', text: '#4ade80' },
  failed: { bg: '#450a0a', text: '#f87171' },
  success: { bg: '#052e16', text: '#4ade80' },
  running: { bg: '#172554', text: '#60a5fa' },
  published: { bg: '#052e16', text: '#4ade80' },
  draft: { bg: '#1a1a2e', text: '#818cf8' },
  approved: { bg: '#1e3a5f', text: '#60a5fa' },
  active: { bg: '#052e16', text: '#4ade80' },
  paused: { bg: '#422006', text: '#fbbf24' },
  none: { bg: '#1a1a1a', text: '#71717a' },
  scheduled: { bg: '#1e3a5f', text: '#60a5fa' },
  sent: { bg: '#052e16', text: '#4ade80' },
  'no entry': { bg: '#1a1a1a', text: '#71717a' },
  staged: { bg: '#422006', text: '#fbbf24' },
  agent: { bg: '#2e1065', text: '#c084fc' },
  railway: { bg: '#1e3a5f', text: '#60a5fa' },
};

export const typeColors = {
  trigger: { bg: '#1e1b4b', text: '#a5b4fc', border: '#312e81' },
  action: { bg: '#172554', text: '#60a5fa', border: '#1e3a8a' },
  ai: { bg: '#2e1065', text: '#c084fc', border: '#4c1d95' },
  condition: { bg: '#451a03', text: '#fbbf24', border: '#78350f' },
  output: { bg: '#052e16', text: '#4ade80', border: '#14532d' },
  external: { bg: '#1a1a1a', text: '#737373', border: '#333333' },
};

export function cronToHuman(cron) {
  if (!cron || cron === 'manual') return 'Manual';
  if (cron === 'triggered') return 'Triggered by agent';
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [min, hour, dom, mon, dow] = parts;
  if (min.startsWith('*/') && hour === '*') return `Every ${min.slice(2)}m`;
  if (min !== '*' && hour.startsWith('*/')) return `Every ${hour.slice(2)}h`;
  if (min !== '*' && hour !== '*' && dom === '*' && mon === '*' && dow === '*')
    return `Daily ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (dow !== '*' && dom === '*')
    return `${dayNames[parseInt(dow)] || dow} ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  return cron;
}

export function timeAgo(ts) {
  if (!ts) return null;
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDuration(ms) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
