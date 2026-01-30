import { useState, useEffect } from 'react';
import DataTable from './DataTable';
import ToolDraftEditor from './ToolDraftEditor';

const STATUS_CONFIG = {
  pending: { label: 'New', color: '#6b7280' },
  researching: { label: 'Researching...', color: '#f59e0b' },
  draft: { label: 'Ready for Review', color: '#3b82f6' },
  approved: { label: 'Approved', color: '#10b981' },
  published: { label: 'Published', color: '#8b5cf6' },
};

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
      const config = STATUS_CONFIG[value] || { label: value, color: '#6b7280' };
      return (
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: config.color,
            color: 'white',
          }}
        >
          {config.label}
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

export default function ToolDraftsManager({ token }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingDraft, setViewingDraft] = useState(null);

  // Form state
  const [formUrl, setFormUrl] = useState('');
  const [formName, setFormName] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

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
    setFormUrl('');
    setFormName('');
    setFormError('');
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

  const createDraft = async () => {
    const response = await fetch('/api/admin/tool-drafts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: formUrl,
        name: formName || null,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create draft');
    }

    return response.json();
  };

  const handleSaveDraftOnly = async () => {
    if (!formUrl) {
      setFormError('URL is required');
      return;
    }

    setFormSaving(true);
    setFormError('');

    try {
      const saved = await createDraft();
      setDrafts((prev) => [saved, ...prev]);
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSaving(false);
    }
  };

  const handleSaveAndResearch = async () => {
    if (!formUrl) {
      setFormError('URL is required');
      return;
    }

    setFormSaving(true);
    setFormError('');

    try {
      // First create the draft
      const saved = await createDraft();
      setDrafts((prev) => [saved, ...prev]);
      setModalOpen(false);

      // Then open it and start research
      setViewingDraft({ ...saved, _startResearch: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSaving(false);
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
        onPublish={() => handlePublish(viewingDraft)}
        startResearchImmediately={viewingDraft._startResearch}
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
          Add a tool URL to create a draft. Click on any draft to edit or start research.
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

      {/* Custom Add Tool Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => !formSaving && setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Tool</h2>
              <button className="modal-close" onClick={() => !formSaving && setModalOpen(false)} disabled={formSaving}>
                &times;
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {formError && <div className="form-error">{formError}</div>}

              <div className="form-group">
                <label className="form-label">
                  Tool Website URL <span className="required">*</span>
                </label>
                <input
                  type="url"
                  className="form-input"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={formSaving}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tool Name (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Auto-detected if not provided"
                  disabled={formSaving}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={formSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSaveDraftOnly}
                  disabled={formSaving}
                >
                  {formSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveAndResearch}
                  disabled={formSaving}
                >
                  {formSaving ? 'Saving...' : 'Save & Research'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
