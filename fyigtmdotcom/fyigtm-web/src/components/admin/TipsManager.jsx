import { useState, useEffect } from 'react';
import DataTable from './DataTable';
import FormModal from './FormModal';

const COLUMNS = [
  { key: 'tip', label: 'Tip' },
  { key: 'context', label: 'Context' },
  { key: 'category', label: 'Category' },
  {
    key: 'used_at',
    label: 'Last Used',
    type: 'date',
    render: (value) => (value ? new Date(value).toLocaleDateString() : 'Never'),
  },
];

const CATEGORY_OPTIONS = [
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'product', label: 'Product' },
  { value: 'growth', label: 'Growth' },
  { value: 'operations', label: 'Operations' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'other', label: 'Other' },
];

const FORM_FIELDS = [
  {
    name: 'tip',
    label: 'Tip',
    type: 'textarea',
    required: true,
    rows: 3,
    placeholder: 'The tip content...',
  },
  {
    name: 'context',
    label: 'Context',
    type: 'textarea',
    rows: 3,
    placeholder: 'When or why to use this tip...',
  },
  {
    name: 'category',
    label: 'Category',
    type: 'select',
    options: CATEGORY_OPTIONS,
  },
];

export default function TipsManager({ token }) {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTip, setEditingTip] = useState(null);

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      const response = await fetch('/api/admin/tips', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch tips backlog');
      const data = await response.json();
      setTips(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTip(null);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingTip(item);
    setModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (!confirm('Are you sure you want to delete this tip?')) return;

    try {
      const response = await fetch(`/api/admin/tips/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete tip');
      setTips((prev) => prev.filter((t) => t.id !== item.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (formData) => {
    const url = editingTip ? `/api/admin/tips/${editingTip.id}` : '/api/admin/tips';
    const method = editingTip ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save tip');
    }

    const saved = await response.json();

    if (editingTip) {
      setTips((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    } else {
      setTips((prev) => [saved, ...prev]);
    }
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Tips Backlog</h2>
        <button className="add-button" onClick={handleAdd}>
          Add Tip
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <DataTable
        columns={COLUMNS}
        data={tips}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No tips yet. Add your first tip to get started."
      />

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        title={editingTip ? 'Edit Tip' : 'Add Tip'}
        fields={FORM_FIELDS}
        initialData={editingTip || {}}
        submitLabel={editingTip ? 'Save Changes' : 'Add Tip'}
      />
    </div>
  );
}
