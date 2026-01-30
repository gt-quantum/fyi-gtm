import { useState, useEffect } from 'react';
import DataTable from './DataTable';
import FormModal from './FormModal';

const COLUMNS = [
  { key: 'topic', label: 'Topic' },
  { key: 'description', label: 'Description' },
  { key: 'priority', label: 'Priority' },
  {
    key: 'active',
    label: 'Active',
    render: (value) => (value ? 'Yes' : 'No'),
  },
  {
    key: 'used_at',
    label: 'Last Used',
    type: 'date',
    render: (value) => (value ? new Date(value).toLocaleDateString() : 'Never'),
  },
];

const FORM_FIELDS = [
  { name: 'topic', label: 'Topic', type: 'text', required: true, placeholder: 'e.g., AI in Sales' },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    rows: 3,
    placeholder: 'Brief description of this topic...',
  },
  { name: 'priority', label: 'Priority', type: 'number', min: 0, max: 10, defaultValue: 0 },
  { name: 'active', label: 'Status', type: 'checkbox', checkboxLabel: 'Active', defaultValue: true },
];

export default function TopicsManager({ token }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/admin/topics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch topics');
      const data = await response.json();
      setTopics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTopic(null);
    setModalOpen(true);
  };

  const handleEdit = (topic) => {
    setEditingTopic(topic);
    setModalOpen(true);
  };

  const handleDelete = async (topic) => {
    if (!confirm(`Are you sure you want to delete "${topic.topic}"?`)) return;

    try {
      const response = await fetch(`/api/admin/topics/${topic.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete topic');
      setTopics((prev) => prev.filter((t) => t.id !== topic.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (topic) => {
    try {
      const response = await fetch(`/api/admin/topics/${topic.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: !topic.active }),
      });
      if (!response.ok) throw new Error('Failed to update topic');
      const updated = await response.json();
      setTopics((prev) => prev.map((t) => (t.id === topic.id ? updated : t)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (formData) => {
    const url = editingTopic ? `/api/admin/topics/${editingTopic.id}` : '/api/admin/topics';
    const method = editingTopic ? 'PUT' : 'POST';

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
      throw new Error(error.error || 'Failed to save topic');
    }

    const saved = await response.json();

    if (editingTopic) {
      setTopics((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    } else {
      setTopics((prev) => [saved, ...prev]);
    }
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Topics</h2>
        <button className="add-button" onClick={handleAdd}>
          Add Topic
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <DataTable
        columns={COLUMNS}
        data={topics}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        emptyMessage="No topics yet. Add your first topic to get started."
      />

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        title={editingTopic ? 'Edit Topic' : 'Add Topic'}
        fields={FORM_FIELDS}
        initialData={editingTopic || {}}
        submitLabel={editingTopic ? 'Save Changes' : 'Add Topic'}
      />
    </div>
  );
}
