import { useState, useEffect, useRef } from 'react';

const PRICING_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'paid', label: 'Paid' },
  { value: 'trial', label: 'Trial' },
];

const STATUS_CONFIG = {
  pending: { label: 'New', color: '#6b7280' },
  researching: { label: 'Researching...', color: '#f59e0b' },
  draft: { label: 'Ready for Review', color: '#3b82f6' },
  approved: { label: 'Approved', color: '#10b981' },
  published: { label: 'Published', color: '#8b5cf6' },
};

export default function ToolDraftEditor({ token, draft: initialDraft, onBack, onSave, onPublish, startResearchImmediately }) {
  const [draft, setDraft] = useState(initialDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('content');

  // Research state
  const [researching, setResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState('');
  const [researchLogs, setResearchLogs] = useState([]);
  const hasStartedResearch = useRef(false);

  // Determine which tabs to show
  const hasContent = draft.generated_content && draft.generated_content.trim().length > 0;
  const hasResearchData = draft.research_data && Object.keys(draft.research_data).length > 0;

  // Initialize frontmatter if not present
  useEffect(() => {
    if (!draft.frontmatter) {
      setDraft((prev) => ({
        ...prev,
        frontmatter: {
          name: prev.name || '',
          slug: prev.slug || '',
          description: '',
          url: prev.url || '',
          logo: '',
          pricing: 'freemium',
          priceNote: '',
          category: '',
          tags: [],
          featured: false,
          isNew: true,
          dateAdded: new Date().toISOString().split('T')[0],
        },
      }));
    }
  }, []);

  // Auto-start research if requested
  useEffect(() => {
    if (startResearchImmediately && !hasStartedResearch.current && !hasContent) {
      hasStartedResearch.current = true;
      handleResearch();
    }
  }, [startResearchImmediately]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setResearchLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleResearch = async () => {
    setResearching(true);
    setError('');
    setResearchLogs([]);
    setResearchProgress('Starting research...');
    addLog('Starting research process');

    try {
      // Update status to researching
      setResearchProgress('Initializing...');
      addLog('Updating draft status');

      const response = await fetch(`/api/admin/tool-drafts/${draft.id}/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ runResearch: true }),
      });

      // Handle streaming response or regular response
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('text/event-stream')) {
        // Handle streaming updates
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.progress) {
                  setResearchProgress(data.progress);
                  addLog(data.progress);
                }
                if (data.draft) {
                  setDraft(data.draft);
                  onSave(data.draft);
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                // Ignore parse errors for partial data
              }
            }
          }
        }
      } else {
        // Handle regular JSON response
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Research failed');
        }

        if (result.draft) {
          setDraft(result.draft);
          onSave(result.draft);
          addLog('Research completed successfully');
        }

        if (result.logs) {
          result.logs.forEach((log) => addLog(log));
        }
      }

      setResearchProgress('');
      setSuccess('Research completed! Review the generated content.');
      setActiveTab('content');
    } catch (err) {
      setError(err.message);
      addLog(`Error: ${err.message}`);
      setResearchProgress('');
    } finally {
      setResearching(false);
    }
  };

  const handleChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setSuccess('');
  };

  const handleFrontmatterChange = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      frontmatter: { ...prev.frontmatter, [field]: value },
    }));
    setSuccess('');
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/tool-drafts/${draft.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: draft.name,
          slug: draft.slug,
          generated_content: draft.generated_content,
          frontmatter: draft.frontmatter,
          logo_url: draft.logo_url,
          status: draft.status === 'pending' ? 'draft' : draft.status,
        }),
      });

      if (!response.ok) throw new Error('Failed to save draft');

      const updated = await response.json();
      setDraft(updated);
      onSave(updated);
      setSuccess('Draft saved successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setError('');
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/tool-drafts/${draft.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (!response.ok) throw new Error('Failed to approve draft');

      const updated = await response.json();
      setDraft(updated);
      onSave(updated);
      setSuccess('Draft approved! Ready to publish.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const frontmatter = draft.frontmatter || {};
  const statusConfig = STATUS_CONFIG[draft.status] || { label: draft.status, color: '#6b7280' };

  // Build available tabs based on data
  const tabs = [];
  if (hasContent) {
    tabs.push({ id: 'content', label: 'Content' });
    tabs.push({ id: 'frontmatter', label: 'Metadata' });
  }
  if (hasResearchData) {
    tabs.push({ id: 'research', label: 'Research Data' });
  }
  tabs.push({ id: 'logs', label: 'Logs' });

  // Default to appropriate tab
  useEffect(() => {
    if (!hasContent && !researching && activeTab === 'content') {
      setActiveTab('logs');
    }
  }, [hasContent, researching]);

  return (
    <div>
      <div className="section-header">
        <button className="back-button" onClick={onBack} style={{ marginRight: '16px' }}>
          &larr; Back
        </button>
        <h2 className="section-title">{draft.name || draft.slug || draft.url}</h2>
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Status and Action Bar */}
      <div className="draft-status-bar" style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#6b7280' }}>Status:</span>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '13px',
            backgroundColor: statusConfig.color,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {researching && (
            <span className="spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          )}
          {researching ? researchProgress || 'Researching...' : statusConfig.label}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!hasContent && !researching && (
            <button
              className="action-btn"
              onClick={handleResearch}
              style={{ backgroundColor: '#f59e0b', color: 'white', padding: '8px 16px', border: 'none' }}
            >
              Start Research
            </button>
          )}
          {hasContent && !researching && (
            <button
              className="action-btn"
              onClick={handleResearch}
              style={{ backgroundColor: '#6b7280', color: 'white', padding: '8px 16px', border: 'none' }}
            >
              Re-run Research
            </button>
          )}
          {hasContent && (draft.status === 'draft' || draft.status === 'pending') && (
            <button
              className="action-btn"
              onClick={handleApprove}
              disabled={saving}
              style={{ backgroundColor: '#10b981', color: 'white', padding: '8px 16px', border: 'none' }}
            >
              Approve
            </button>
          )}
          {hasContent && (draft.status === 'approved' || draft.status === 'draft') && (
            <button
              className="action-btn"
              onClick={onPublish}
              style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '8px 16px', border: 'none' }}
            >
              Publish to GitHub
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="draft-tabs" style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === tab.id ? '600' : '400',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && hasContent && (
        <div className="config-form">
          <div className="form-group">
            <label className="form-label">Tool Name</label>
            <input
              type="text"
              className="form-input"
              value={draft.name || ''}
              onChange={(e) => {
                handleChange('name', e.target.value);
                handleFrontmatterChange('name', e.target.value);
              }}
              placeholder="e.g., Notion"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Slug</label>
            <input
              type="text"
              className="form-input"
              value={draft.slug || ''}
              onChange={(e) => {
                handleChange('slug', e.target.value);
                handleFrontmatterChange('slug', e.target.value);
              }}
              placeholder="e.g., notion"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Review Content (Markdown)</label>
            <textarea
              className="form-textarea"
              value={draft.generated_content || ''}
              onChange={(e) => handleChange('generated_content', e.target.value)}
              rows={20}
              placeholder="## What is {Tool Name}?..."
              style={{ fontFamily: 'monospace', fontSize: '13px' }}
            />
          </div>

          <div className="config-actions">
            <button type="button" className="save-button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Frontmatter/Metadata Tab */}
      {activeTab === 'frontmatter' && hasContent && (
        <div className="config-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Description (SEO)</label>
              <textarea
                className="form-textarea"
                value={frontmatter.description || ''}
                onChange={(e) => handleFrontmatterChange('description', e.target.value)}
                rows={2}
                placeholder="One-line description for meta tags..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tool URL</label>
              <input
                type="url"
                className="form-input"
                value={frontmatter.url || draft.url || ''}
                onChange={(e) => handleFrontmatterChange('url', e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Logo URL</label>
              <input
                type="text"
                className="form-input"
                value={frontmatter.logo || draft.logo_url || ''}
                onChange={(e) => handleFrontmatterChange('logo', e.target.value)}
                placeholder="/logos/tool-name.png"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Pricing</label>
              <select
                className="form-select"
                value={frontmatter.pricing || 'freemium'}
                onChange={(e) => handleFrontmatterChange('pricing', e.target.value)}
              >
                {PRICING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Price Note</label>
              <input
                type="text"
                className="form-input"
                value={frontmatter.priceNote || ''}
                onChange={(e) => handleFrontmatterChange('priceNote', e.target.value)}
                placeholder="Free tier, paid from $X/mo"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                type="text"
                className="form-input"
                value={frontmatter.category || ''}
                onChange={(e) => handleFrontmatterChange('category', e.target.value)}
                placeholder="e.g., Productivity"
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Tags (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={Array.isArray(frontmatter.tags) ? frontmatter.tags.join(', ') : ''}
                onChange={(e) =>
                  handleFrontmatterChange(
                    'tags',
                    e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter((t) => t)
                  )
                }
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={frontmatter.featured || false}
                  onChange={(e) => handleFrontmatterChange('featured', e.target.checked)}
                />
                <span style={{ marginLeft: '8px' }}>Featured</span>
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={frontmatter.isNew !== false}
                  onChange={(e) => handleFrontmatterChange('isNew', e.target.checked)}
                />
                <span style={{ marginLeft: '8px' }}>Mark as New</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Date Added</label>
              <input
                type="date"
                className="form-input"
                value={frontmatter.dateAdded || ''}
                onChange={(e) => handleFrontmatterChange('dateAdded', e.target.value)}
              />
            </div>
          </div>

          <div className="config-actions" style={{ marginTop: '16px' }}>
            <button type="button" className="save-button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Research Data Tab */}
      {activeTab === 'research' && hasResearchData && (
        <div className="config-form">
          <div className="form-group">
            <label className="form-label">Research Data</label>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>
              Raw data gathered during research. This was used to generate the content.
            </p>
            <textarea
              className="form-textarea"
              value={JSON.stringify(draft.research_data, null, 2)}
              readOnly
              rows={20}
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                backgroundColor: '#1e1e2e',
                color: '#a0a0a0',
                border: '1px solid #333'
              }}
            />
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="config-form">
          <div className="form-group">
            <label className="form-label">Activity Log</label>
            <div
              style={{
                backgroundColor: '#1a1a2e',
                color: '#a0a0a0',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '12px',
                minHeight: '300px',
                maxHeight: '500px',
                overflowY: 'auto',
                borderRadius: '4px',
              }}
            >
              {researchLogs.length === 0 && !researching && (
                <div style={{ color: '#6b7280' }}>
                  No activity yet. Click "Start Research" to begin.
                </div>
              )}
              {researchLogs.map((log, i) => (
                <div key={i} style={{ marginBottom: '4px' }}>
                  {log}
                </div>
              ))}
              {researching && (
                <div style={{ color: '#f59e0b' }}>
                  {researchProgress || 'Processing...'}
                  <span className="blink">_</span>
                </div>
              )}
            </div>
          </div>

          {draft.error_message && (
            <div className="form-group">
              <label className="form-label" style={{ color: '#ef4444' }}>
                Last Error
              </label>
              <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '4px', color: '#dc2626', fontSize: '13px' }}>
                {draft.error_message}
              </div>
            </div>
          )}

          {!hasContent && !researching && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                This tool hasn't been researched yet.
              </p>
              <button
                className="btn-primary"
                onClick={handleResearch}
                style={{ padding: '12px 24px' }}
              >
                Start Research
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .blink {
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
