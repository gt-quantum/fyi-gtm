import { useState, useEffect } from 'react';
import DataTable from './DataTable';
import FormModal from './FormModal';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'why_relevant', label: 'Why Relevant' },
  {
    key: 'url',
    label: 'URL',
    render: (value) =>
      value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Link
        </a>
      ) : (
        '-'
      ),
  },
  {
    key: 'used_at',
    label: 'Last Used',
    type: 'date',
    render: (value) => (value ? new Date(value).toLocaleDateString() : 'Never'),
  },
];

const FORM_FIELDS = [
  { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g., GPT-4 Vision' },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    rows: 3,
    placeholder: 'What is this technology...',
  },
  {
    name: 'why_relevant',
    label: 'Why Relevant',
    type: 'textarea',
    rows: 3,
    placeholder: 'Why is this relevant to GTM...',
  },
  { name: 'url', label: 'URL', type: 'url', placeholder: 'https://...' },
];

export default function TechManager({ token }) {
  const [tech, setTech] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState(null);

  useEffect(() => {
    fetchTech();
  }, []);

  const fetchTech = async () => {
    try {
      const response = await fetch('/api/admin/tech', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch tech backlog');
      const data = await response.json();
      setTech(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTech(null);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingTech(item);
    setModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      const response = await fetch(`/api/admin/tech/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete tech item');
      setTech((prev) => prev.filter((t) => t.id !== item.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (formData) => {
    const url = editingTech ? `/api/admin/tech/${editingTech.id}` : '/api/admin/tech';
    const method = editingTech ? 'PUT' : 'POST';

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
      throw new Error(error.error || 'Failed to save tech item');
    }

    const saved = await response.json();

    if (editingTech) {
      setTech((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    } else {
      setTech((prev) => [saved, ...prev]);
    }
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Tech Backlog</h2>
        <button className="add-button" onClick={handleAdd}>
          Add Tech
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <DataTable
        columns={COLUMNS}
        data={tech}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No tech items yet. Add your first tech item to get started."
      />

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        title={editingTech ? 'Edit Tech Item' : 'Add Tech Item'}
        fields={FORM_FIELDS}
        initialData={editingTech || {}}
        submitLabel={editingTech ? 'Save Changes' : 'Add Tech'}
      />
    </div>
  );
}
