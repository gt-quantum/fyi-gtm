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
          {value}
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

  // Bulk publish state
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

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

  const handleSaveDraft = async (updatedDraft) => {
    setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
  };

  // Check if a row is selectable (only draft, approved, or published status)
  const isRowSelectable = (row) => {
    return ['draft', 'approved', 'published'].includes(row.status);
  };

  // Handle bulk publish
  const handleBulkPublish = async () => {
    if (selectedIds.length === 0) return;

    const selectedDrafts = drafts.filter(d => selectedIds.includes(d.id));
    const toolNames = selectedDrafts.map(d => d.name || d.slug || 'Unknown').join(', ');

    if (!confirm(`Publish ${selectedIds.length} tool(s) to GitHub?\n\nTools: ${toolNames}\n\nThis will create a single commit with all selected tools.`)) {
      return;
    }

    setBulkPublishing(true);
    setBulkResults(null);
    setBulkModalOpen(true);

    try {
      const response = await fetch('/api/admin/tool-drafts/publish-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const result = await response.json();
      setBulkResults(result);

      // Update local drafts state for successful publishes
      if (result.results) {
        const successIds = result.results.filter(r => r.success).map(r => r.id);
        if (successIds.length > 0) {
          setDrafts(prev => prev.map(d =>
            successIds.includes(d.id)
              ? { ...d, status: 'published', published_at: new Date().toISOString() }
              : d
          ));
        }
      }

      // Clear selection for successful items
      if (result.success) {
        const successIds = result.results.filter(r => r.success).map(r => r.id);
        setSelectedIds(prev => prev.filter(id => !successIds.includes(id)));
      }
    } catch (err) {
      setBulkResults({
        success: false,
        error: err.message,
        totalRequested: selectedIds.length,
        totalSucceeded: 0,
        totalFailed: selectedIds.length,
        results: [],
      });
    } finally {
      setBulkPublishing(false);
    }
  };

  const closeBulkModal = () => {
    setBulkModalOpen(false);
    setBulkResults(null);
    fetchDrafts(); // Refresh to get latest status
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
        startResearchImmediately={viewingDraft._startResearch}
      />
    );
  }

  // Count publishable selected items
  const publishableCount = selectedIds.filter(id => {
    const draft = drafts.find(d => d.id === id);
    return draft && ['draft', 'approved', 'published'].includes(draft.status);
  }).length;

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Tool Drafts</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {selectedIds.length > 0 && (
            <button
              className="btn-primary"
              onClick={handleBulkPublish}
              disabled={bulkPublishing || publishableCount === 0}
              style={{
                backgroundColor: '#10b981',
                borderColor: '#10b981',
              }}
            >
              {bulkPublishing ? 'Publishing...' : `Publish Selected (${publishableCount})`}
            </button>
          )}
          <button className="add-button" onClick={handleAdd}>
            Add Tool
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div style={{ marginBottom: '16px' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Add a tool URL to create a draft. Click on any draft to edit or start research.
          {drafts.filter(d => isRowSelectable(d)).length > 0 && (
            <span style={{ marginLeft: '8px' }}>
              Select multiple tools to publish them all in a single commit.
            </span>
          )}
        </p>
      </div>

      <DataTable
        columns={COLUMNS}
        data={drafts}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No tool drafts yet. Add a tool URL to get started."
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        selectableFilter={isRowSelectable}
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

      {/* Bulk Publish Results Modal */}
      {bulkModalOpen && (
        <div className="modal-overlay" onClick={() => !bulkPublishing && closeBulkModal()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{bulkPublishing ? 'Publishing...' : 'Bulk Publish Results'}</h2>
              {!bulkPublishing && (
                <button className="modal-close" onClick={closeBulkModal}>
                  &times;
                </button>
              )}
            </div>
            <div style={{ padding: '24px' }}>
              {bulkPublishing && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '16px' }}>Publishing {selectedIds.length} tools...</div>
                  <div style={{ color: '#6b7280' }}>Creating a single commit to GitHub</div>
                </div>
              )}

              {bulkResults && (
                <>
                  {/* Summary */}
                  <div style={{
                    padding: '16px',
                    marginBottom: '16px',
                    borderRadius: '8px',
                    backgroundColor: bulkResults.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${bulkResults.success ? '#10b981' : '#ef4444'}`,
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                      {bulkResults.success ? 'Publish Completed' : 'Publish Failed'}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '14px' }}>
                      {bulkResults.totalSucceeded} of {bulkResults.totalRequested} tools published successfully
                      {bulkResults.commitSha && (
                        <span style={{ marginLeft: '8px' }}>
                          (commit: {bulkResults.commitSha.substring(0, 7)})
                        </span>
                      )}
                    </div>
                    {bulkResults.error && (
                      <div style={{ color: '#ef4444', marginTop: '8px', fontSize: '14px' }}>
                        Error: {bulkResults.error}
                      </div>
                    )}
                  </div>

                  {/* Individual Results */}
                  {bulkResults.results && bulkResults.results.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '12px' }}>Individual Results:</div>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {bulkResults.results.map((result, idx) => (
                          <div
                            key={result.id || idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              borderBottom: '1px solid var(--color-border)',
                              backgroundColor: result.success ? 'transparent' : 'rgba(239, 68, 68, 0.05)',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 500 }}>{result.name}</div>
                              {result.error && (
                                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px' }}>
                                  {result.error}
                                </div>
                              )}
                              {result.success && result.filePath && (
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                  {result.filePath}
                                </div>
                              )}
                            </div>
                            <div>
                              {result.success ? (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                }}>
                                  Published
                                </span>
                              ) : (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                }}>
                                  Failed
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '24px', textAlign: 'right' }}>
                    <button className="btn-primary" onClick={closeBulkModal}>
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
