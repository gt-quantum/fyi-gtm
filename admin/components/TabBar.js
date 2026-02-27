import { colors } from '../lib/theme';

export default function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex',
      gap: 0,
      borderBottom: `1px solid ${colors.border}`,
      marginBottom: 20,
    }}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? colors.text : colors.dim,
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${isActive ? colors.accent : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
