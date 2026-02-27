import { useState, useMemo } from 'react';
import { colors } from '../lib/theme';

export default function DataTable({
  columns,       // [{ key, label, width?, render? }]
  data,          // Array of row objects
  onRowClick,    // (row) => void
  selectable,    // boolean — show checkboxes
  selectedIds,   // Set of selected IDs
  onSelect,      // (id, checked) => void
  onSelectAll,   // (checked) => void
  emptyMessage = 'No data found.',
  sortable = true,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const sorted = useMemo(() => {
    if (!sortKey || !sortable) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, sortable]);

  function toggleSort(key) {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const allSelected = selectable && data.length > 0 && selectedIds?.size === data.length;

  return (
    <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {selectable && (
                <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    style={checkboxStyle}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  style={{ ...thStyle, width: col.width, cursor: sortable ? 'pointer' : 'default', userSelect: 'none' }}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span style={{ marginLeft: 4, opacity: 0.5 }}>{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ textAlign: 'center', padding: 40, color: colors.dim, fontSize: 13 }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : sorted.map((row, i) => (
              <tr
                key={row.id || i}
                onClick={() => onRowClick?.(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default', transition: 'background 0.1s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {selectable && (
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(row.id) || false}
                      onChange={(e) => { e.stopPropagation(); onSelect?.(row.id, e.target.checked); }}
                      style={checkboxStyle}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} style={{ ...tdStyle, width: col.width }}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#71717a',
  borderBottom: '1px solid #27272a',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '10px 14px',
  borderBottom: '1px solid #27272a',
  color: '#fafafa',
  verticalAlign: 'middle',
};

const checkboxStyle = {
  accentColor: '#3b82f6',
  cursor: 'pointer',
  width: 14,
  height: 14,
};
