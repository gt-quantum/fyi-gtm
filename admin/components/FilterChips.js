import { colors } from '../lib/theme';

export default function FilterChips({ options, value, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {label && (
        <span style={{
          fontSize: 10, color: colors.subtle, textTransform: 'uppercase',
          letterSpacing: '0.05em', fontWeight: 500, marginRight: 2,
        }}>
          {label}
        </span>
      )}
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              background: active ? colors.border : 'transparent',
              border: `1px solid ${active ? colors.borderHover : 'transparent'}`,
              borderRadius: 5,
              color: active ? colors.text : colors.dim,
              fontSize: 12,
              fontWeight: 500,
              padding: '3px 10px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span style={{ marginLeft: 4, opacity: 0.6 }}>{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
