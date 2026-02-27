import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import FormModal, { FormField, inputStyle, textareaStyle } from '../../components/FormModal';
import { colors } from '../../lib/theme';

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ topic: '', description: '', priority: 5, active: true });

  async function loadTopics() {
    try {
      const res = await fetch('/api/newsletter/topics');
      if (res.ok) setTopics(await res.json());
    } catch (err) {
      console.error('Failed to load topics:', err);
    }
    setLoading(false);
  }

  useEffect(() => { loadTopics(); }, []);

  function openAdd() {
    setEditing(null);
    setForm({ topic: '', description: '', priority: 5, active: true });
    setShowForm(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({ topic: row.topic, description: row.description || '', priority: row.priority || 5, active: row.active !== false });
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.topic) return;
    setSubmitting(true);
    try {
      const url = editing ? `/api/newsletter/topics/${editing.id}` : '/api/newsletter/topics';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        loadTopics();
      }
    } catch (err) {
      alert('Failed to save topic');
    }
    setSubmitting(false);
  }

  async function deleteTopic(id) {
    if (!confirm('Delete this topic?')) return;
    try {
      await fetch(`/api/newsletter/topics/${id}`, { method: 'DELETE' });
      loadTopics();
    } catch (err) {
      alert('Failed to delete');
    }
  }

  const columns = [
    { key: 'topic', label: 'Topic', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { key: 'description', label: 'Description', render: (v) => <span style={{ color: colors.dim, fontSize: 12 }}>{v || '-'}</span> },
    { key: 'priority', label: 'Priority', width: 80, render: (v) => (
      <span style={{
        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
        background: v >= 8 ? '#052e16' : v >= 5 ? '#172554' : '#1a1a1a',
        color: v >= 8 ? '#4ade80' : v >= 5 ? '#60a5fa' : '#737373',
      }}>{v}</span>
    )},
    { key: 'active', label: 'Active', width: 70, render: (v) => (
      <span style={{ color: v !== false ? colors.success : colors.dim, fontSize: 12 }}>{v !== false ? 'Yes' : 'No'}</span>
    )},
    { key: '_actions', label: '', width: 100, render: (_, row) => (
      <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(row)} style={smallBtnStyle}>Edit</button>
        <button onClick={() => deleteTopic(row.id)} style={{ ...smallBtnStyle, color: colors.error }}>Del</button>
      </div>
    )},
  ];

  if (loading) return <Layout><p style={{ color: colors.dim, marginTop: 40 }}>Loading...</p></Layout>;

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Newsletter Topics</h1>
        <button onClick={openAdd} style={primaryBtnStyle}>+ Add Topic</button>
      </div>

      <DataTable columns={columns} data={topics} onRowClick={openEdit} emptyMessage="No topics yet." />

      {showForm && (
        <FormModal
          title={editing ? 'Edit Topic' : 'Add Topic'}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          submitting={submitting}
        >
          <FormField label="Topic">
            <input style={inputStyle} value={form.topic} onChange={(e) => setForm(f => ({ ...f, topic: e.target.value }))} autoFocus />
          </FormField>
          <FormField label="Description">
            <textarea style={textareaStyle} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </FormField>
          <FormField label="Priority (0-10)">
            <input type="number" min="0" max="10" style={{ ...inputStyle, width: 80 }}
              value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} />
          </FormField>
          <FormField label="Active">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm(f => ({ ...f, active: e.target.checked }))}
                style={{ accentColor: '#3b82f6', width: 15, height: 15 }} />
              Enabled
            </label>
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
