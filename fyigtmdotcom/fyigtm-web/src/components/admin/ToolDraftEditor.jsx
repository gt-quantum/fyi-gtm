import { useState, useEffect } from 'react';

const PRICING_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'paid', label: 'Paid' },
  { value: 'trial', label: 'Trial' },
];

export default function ToolDraftEditor({ token, draft: initialDraft, onBack, onSave, onResearch, onPublish }) {
  const [draft, setDraft] = useState(initialDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('content');

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

  return (
    <div>
      <div className="section-header">
        <button className="back-button" onClick={onBack} style={{ marginRight: '16px' }}>
          &larr; Back to Drafts
        </button>
        <h2 className="section-title">{draft.name || draft.slug || 'Edit Draft'}</h2>
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="draft-status-bar" style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ color: '#6b7280' }}>Status:</span>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '13px',
            backgroundColor:
              draft.status === 'approved' ? '#10b981' : draft.status === 'published' ? '#8b5cf6' : draft.status === 'draft' ? '#3b82f6' : '#6b7280',
            color: 'white',
          }}
        >
          {draft.status}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {draft.status === 'pending' && (
            <button className="action-btn" onClick={onResearch} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '8px 16px' }}>
              Start Research
            </button>
          )}
          {(draft.status === 'draft' || draft.status === 'researching') && (
            <button className="action-btn" onClick={handleApprove} style={{ backgroundColor: '#10b981', color: 'white', padding: '8px 16px' }}>
              Approve
            </button>
          )}
          {(draft.status === 'approved' || draft.status === 'draft') && (
            <button className="action-btn" onClick={onPublish} style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '8px 16px' }}>
              Publish to GitHub
            </button>
          )}
        </div>
      </div>

      <div className="draft-tabs" style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }}>
        {['content', 'frontmatter', 'research'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === tab ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === tab ? '600' : '400',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'content' && (
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
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'frontmatter' && (
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
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'research' && (
        <div className="config-form">
          <div className="form-group">
            <label className="form-label">Research Data (JSON)</label>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>
              Raw data gathered from research sources. This is populated by the research script.
            </p>
            <textarea
              className="form-textarea"
              value={draft.research_data ? JSON.stringify(draft.research_data, null, 2) : 'No research data yet. Click "Start Research" to begin.'}
              readOnly
              rows={20}
              style={{ fontFamily: 'monospace', fontSize: '12px', backgroundColor: '#f9fafb' }}
            />
          </div>

          {draft.error_message && (
            <div className="form-group">
              <label className="form-label" style={{ color: '#ef4444' }}>
                Error Message
              </label>
              <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '4px', color: '#dc2626' }}>{draft.error_message}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
