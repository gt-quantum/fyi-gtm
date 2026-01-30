import { useState } from 'react';

export default function DataTable({
  columns,
  data,
  onEdit,
  onDelete,
  onToggleActive,
  onMarkUnused,
  loading,
  emptyMessage = 'No data available',
}) {
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    const comparison = aVal < bVal ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return <div className="table-loading">Loading...</div>;
  }

  if (data.length === 0) {
    return <div className="table-empty">{emptyMessage}</div>;
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable !== false && handleSort(col.key)}
                className={col.sortable !== false ? 'sortable' : ''}
              >
                {col.label}
                {sortField === col.key && (
                  <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : formatValue(row[col.key], col.type)}
                </td>
              ))}
              <td className="actions-cell">
                {onEdit && (
                  <button className="action-btn edit-btn" onClick={() => onEdit(row)}>
                    Edit
                  </button>
                )}
                {onToggleActive && 'active' in row && (
                  <button
                    className={`action-btn toggle-btn ${row.active ? 'active' : 'inactive'}`}
                    onClick={() => onToggleActive(row)}
                  >
                    {row.active ? 'Deactivate' : 'Activate'}
                  </button>
                )}
                {onMarkUnused && row.used_at && (
                  <button
                    className="action-btn reuse-btn"
                    onClick={() => onMarkUnused(row)}
                  >
                    Reuse
                  </button>
                )}
                {onDelete && (
                  <button className="action-btn delete-btn" onClick={() => onDelete(row)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatValue(value, type) {
  if (value === null || value === undefined) return '-';
  if (type === 'date' && value) {
    return new Date(value).toLocaleDateString();
  }
  if (type === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 100) + '...';
  }
  return String(value);
}
