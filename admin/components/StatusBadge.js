import { statusColors } from '../lib/theme';

export default function StatusBadge({ status, small }) {
  const sc = statusColors[status] || { bg: '#1a1a1a', text: '#737373' };
  return (
    <span style={{
      display: 'inline-block',
      padding: small ? '1px 6px' : '2px 10px',
      borderRadius: 12,
      fontSize: small ? 11 : 12,
      fontWeight: 500,
      background: sc.bg,
      color: sc.text,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}
