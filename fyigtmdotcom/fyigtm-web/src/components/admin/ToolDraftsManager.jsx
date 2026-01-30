import { useState, useEffect } from 'react';
import DataTable from './DataTable';
import FormModal from './FormModal';
import ToolDraftEditor from './ToolDraftEditor';

const COLUMNS = [
  { key: 'name', label: 'Name', render: (value, row) => value || row.slug || 'Untitled' },
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
    key: 'status',
    label: 'Status',
    render: (value) => {
      const colors = {
        pending: '#6b7280',
        researching: '#f59e0b',
        draft: '#3b82f6',
        approved: '#10b981',
        published: '#8b5cf6',
      };
      return (
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: colors[value] || '#6b7280',
            color: 'white',
          }}
        >
          {value}
        </span>
      );
    },
  },
  {
    key: 'created_at',
    label: 'Created',
    type: 'date',
    render: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
  },
];

const FORM_FIELDS = [
  { name: 'url', label: 'Tool Website URL', type: 'url', required: true, placeholder: 'https://example.com' },
  { name: 'name', label: 'Tool Name (optional)', type: 'text', placeholder: 'Auto-detected if not provided' },
  {
    name: 'extra_sources',
    label: 'Extra Research URLs (optional)',
    type: 'textarea',
    rows: 3,
    placeholder: 'One URL per line for additional research...',
  },
];

export default function ToolDraftsManager({ token }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [viewingDraft, setViewingDraft] = useState(null);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      const response = await fetch('/api/admin/tool-drafts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch tool drafts');
      const data = await response.json();
      setDrafts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDraft(null);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setViewingDraft(item);
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete "${item.name || item.slug || 'this draft'}"?`)) return;

    try {
      const response = await fetch(`/api/admin/tool-drafts/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete draft');
      setDrafts((prev) => prev.filter((d) => d.id !== item.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (formData) => {
    // Parse extra_sources from newline-separated text to array
    let extraSources = null;
    if (formData.extra_sources) {
      extraSources = formData.extra_sources
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    const response = await fetch('/api/admin/tool-drafts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: formData.url,
        name: formData.name || null,
        extra_sources: extraSources,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create draft');
    }

    const saved = await response.json();
    setDrafts((prev) => [saved, ...prev]);
  };

  const handleResearch = async (draft) => {
    if (!confirm(`Start AI research for "${draft.name || draft.slug || 'this tool'}"? This will call the Claude API.`)) return;

    try {
      const response = await fetch(`/api/admin/tool-drafts/${draft.id}/research`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to trigger research');

      const result = await response.json();
      setDrafts((prev) => prev.map((d) => (d.id === result.draft.id ? result.draft : d)));
      alert(result.message);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePublish = async (draft) => {
    if (!confirm(`Publish "${draft.name || draft.slug}" to GitHub? This will create a new tool page.`)) return;

    try {
      const response = await fetch(`/api/admin/tool-drafts/${draft.id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to publish');
      }

      setDrafts((prev) => prev.map((d) => (d.id === result.draft.id ? result.draft : d)));
      alert(`Published successfully: ${result.message}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveDraft = async (updatedDraft) => {
    setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
  };

  if (viewingDraft) {
    return (
      <ToolDraftEditor
        token={token}
        draft={viewingDraft}
        onBack={() => {
          setViewingDraft(null);
          fetchDrafts();
        }}
        onSave={handleSaveDraft}
        onResearch={() => handleResearch(viewingDraft)}
        onPublish={() => handlePublish(viewingDraft)}
      />
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Tool Drafts</h2>
        <button className="add-button" onClick={handleAdd}>
          Add Tool
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div style={{ marginBottom: '16px' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Submit a tool URL to start the review process. Click on a draft to edit its content.
        </p>
      </div>

      <DataTable
        columns={COLUMNS}
        data={drafts}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No tool drafts yet. Add a tool URL to get started."
      />

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        title="Add New Tool"
        fields={FORM_FIELDS}
        initialData={{}}
        submitLabel="Create Draft"
      />
    </div>
  );
}
