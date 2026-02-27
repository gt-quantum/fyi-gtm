import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import FormModal, { FormField, inputStyle, textareaStyle, selectStyle } from '../../components/FormModal';
import { colors, timeAgo } from '../../lib/theme';

const CATEGORIES = ['general', 'tools', 'automation', 'ai', 'sales', 'marketing', 'productivity'];

export default function Tips() {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ tip: '', context: '', category: 'general' });

  async function loadTips() {
    try {
      const res = await fetch('/api/tips');
      if (res.ok) setTips(await res.json());
    } catch (err) {
      console.error('Failed to load tips:', err);
    }
    setLoading(false);
  }

  useEffect(() => { loadTips(); }, []);

  function openAdd() {
    setEditing(null);
    setForm({ tip: '', context: '', category: 'general' });
    setShowForm(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({ tip: row.tip || '', context: row.context || '', category: row.category || 'general' });
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.tip) return;
    setSubmitting(true);
    try {
      const url = editing ? `/api/tips/${editing.id}` : '/api/tips';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        loadTips();
      }
    } catch (err) {
      alert('Failed to save tip');
    }
    setSubmitting(false);
  }

  async function deleteTip(id) {
    if (!confirm('Delete this tip?')) return;
    try {
      await fetch(`/api/tips/${id}`, { method: 'DELETE' });
      loadTips();
    } catch (err) {
      alert('Failed to delete');
    }
  }

  const columns = [
    { key: 'tip', label: 'Tip', render: (v) => (
      <span style={{ fontWeight: 500, display: 'block', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
    )},
    { key: 'category', label: 'Category', width: 110, render: (v) => (
      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, background: '#1a1a2e', color: '#818cf8' }}>{v || '-'}</span>
    )},
    { key: 'used', label: 'Used', width: 60, render: (v) => (
      <span style={{ color: v ? colors.success : colors.dim, fontSize: 12 }}>{v ? 'Yes' : 'No'}</span>
    )},
    { key: 'created_at', label: 'Created', width: 100, render: (v) => <span style={{ color: colors.dim, fontSize: 12 }}>{timeAgo(v)}</span> },
    { key: '_actions', label: '', width: 100, render: (_, row) => (
      <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(row)} style={smallBtnStyle}>Edit</button>
        <button onClick={() => deleteTip(row.id)} style={{ ...smallBtnStyle, color: colors.error }}>Del</button>
      </div>
    )},
  ];

  if (loading) return <Layout><p style={{ color: colors.dim, marginTop: 40 }}>Loading...</p></Layout>;

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Tips Backlog</h1>
        <button onClick={openAdd} style={primaryBtnStyle}>+ Add Tip</button>
      </div>

      <DataTable columns={columns} data={tips} onRowClick={openEdit} emptyMessage="No tips in the backlog." />

      {showForm && (
        <FormModal
          title={editing ? 'Edit Tip' : 'Add Tip'}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          submitting={submitting}
        >
          <FormField label="Tip">
            <textarea style={textareaStyle} value={form.tip} onChange={(e) => setForm(f => ({ ...f, tip: e.target.value }))} autoFocus />
          </FormField>
          <FormField label="Context (optional)">
            <textarea style={textareaStyle} value={form.context} onChange={(e) => setForm(f => ({ ...f, context: e.target.value }))} />
          </FormField>
          <FormField label="Category">
            <select style={selectStyle} value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
        </FormModal>
      )}
    </Layout>
  );
}

const primaryBtnStyle = {
  padding: '7px 16px', border: '1px solid #3b82f6', borderRadius: 6,
  background: '#3b82f6', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
const smallBtnStyle = {
  padding: '2px 8px', border: `1px solid ${colors.border}`, borderRadius: 4,
  background: 'transparent', color: colors.muted, fontSize: 11, cursor: 'pointer',
};
