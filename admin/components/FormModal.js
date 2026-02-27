import { colors } from '../lib/theme';

export default function FormModal({ title, onClose, onSubmit, children, submitLabel = 'Save', submitting = false }) {
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 480,
        maxHeight: '85vh',
        overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          {children}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ ...submitBtnStyle, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FormField({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: colors.dim, marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  background: colors.bg,
  color: colors.text,
  fontSize: 13,
  outline: 'none',
};

export const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer',
  paddingRight: 28,
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2371717a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
};

export const textareaStyle = {
  ...inputStyle,
  minHeight: 80,
  resize: 'vertical',
  fontFamily: 'inherit',
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: colors.dim,
  fontSize: 20,
  cursor: 'pointer',
  padding: '0 4px',
  lineHeight: 1,
};

const cancelBtnStyle = {
  padding: '7px 16px',
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  background: 'transparent',
  color: colors.muted,
  fontSize: 13,
  cursor: 'pointer',
};

const submitBtnStyle = {
  padding: '7px 16px',
  border: '1px solid #3b82f6',
  borderRadius: 6,
  background: '#3b82f6',
  color: 'white',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};
