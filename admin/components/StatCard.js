import { colors } from '../lib/theme';

export default function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: colors.surface,
      padding: '16px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '1.6rem',
        fontWeight: 700,
        color: color || colors.text,
        letterSpacing: '-0.03em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11,
        color: colors.dim,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontWeight: 500,
        marginTop: 2,
      }}>
        {label}
      </div>
    </div>
  );
}

export function StatRow({ stats }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
      gap: 1,
      background: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
      border: `1px solid ${colors.border}`,
      marginBottom: 24,
    }}>
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
}
