import { useState, useEffect, useRef } from 'react';

// Taxonomy - must match src/lib/taxonomy.ts
const CATEGORIES = [
  // Data & Intelligence
  { value: 'contact-company-data', label: 'Contact & Company Data', group: 'data-intelligence' },
  { value: 'data-enrichment-hygiene', label: 'Data Enrichment & Hygiene', group: 'data-intelligence' },
  { value: 'intent-signals', label: 'Intent Signals', group: 'data-intelligence' },
  { value: 'market-competitive-research', label: 'Market & Competitive Research', group: 'data-intelligence' },
  { value: 'ai-data-agents', label: 'AI Data Agents', group: 'data-intelligence' },
  // Marketing
  { value: 'marketing-automation-email', label: 'Marketing Automation & Email', group: 'marketing' },
  { value: 'abm-demand-gen', label: 'ABM & Demand Gen', group: 'marketing' },
  { value: 'content-creative', label: 'Content & Creative', group: 'marketing' },
  { value: 'social-community', label: 'Social & Community', group: 'marketing' },
  { value: 'seo-organic', label: 'SEO & Organic', group: 'marketing' },
  { value: 'ai-marketing-tools', label: 'AI Marketing Tools', group: 'marketing' },
  // Sales
  { value: 'crm', label: 'CRM', group: 'sales' },
  { value: 'sales-engagement', label: 'Sales Engagement', group: 'sales' },
  { value: 'sales-enablement', label: 'Sales Enablement', group: 'sales' },
  { value: 'cpq-proposals', label: 'CPQ & Proposals', group: 'sales' },
  { value: 'ai-sales-assistants', label: 'AI Sales Assistants', group: 'sales' },
  // Revenue Operations
  { value: 'lead-management', label: 'Lead Management', group: 'revenue-operations' },
  { value: 'pipeline-forecasting', label: 'Pipeline & Forecasting', group: 'revenue-operations' },
  { value: 'revenue-analytics-attribution', label: 'Revenue Analytics & Attribution', group: 'revenue-operations' },
  { value: 'workflow-integration', label: 'Workflow & Integration', group: 'revenue-operations' },
  { value: 'ai-revops-tools', label: 'AI RevOps Tools', group: 'revenue-operations' },
  // Customer
  { value: 'customer-success', label: 'Customer Success', group: 'customer' },
  { value: 'product-analytics-adoption', label: 'Product Analytics & Adoption', group: 'customer' },
  { value: 'support-feedback', label: 'Support & Feedback', group: 'customer' },
  { value: 'ai-customer-tools', label: 'AI Customer Tools', group: 'customer' },
  // Partnerships
  { value: 'partner-management', label: 'Partner Management', group: 'partnerships' },
  { value: 'affiliates-referrals', label: 'Affiliates & Referrals', group: 'partnerships' },
  { value: 'ai-partnership-tools', label: 'AI Partnership Tools', group: 'partnerships' },
];

const GROUPS = {
  'data-intelligence': 'Data & Intelligence',
  'marketing': 'Marketing',
  'sales': 'Sales',
  'revenue-operations': 'Revenue Operations',
  'customer': 'Customer',
  'partnerships': 'Partnerships',
};

const AI_AUTOMATION_TAGS = [
  { value: 'ai-native', label: 'AI Native' },
  { value: 'ai-enhanced', label: 'AI Enhanced' },
  { value: 'automation', label: 'Automation' },
];

const PRICING_TAGS = [
  { value: 'free-tier', label: 'Free Tier' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'paid-only', label: 'Paid Only' },
  { value: 'enterprise-pricing', label: 'Enterprise Pricing' },
];

const COMPANY_SIZE_TAGS = [
  { value: 'smb', label: 'SMB' },
  { value: 'mid-market', label: 'Mid-Market' },
  { value: 'enterprise', label: 'Enterprise' },
];

const PRICING_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'paid', label: 'Paid' },
  { value: 'enterprise', label: 'Enterprise' },
];

const STATUS_CONFIG = {
  pending: { label: 'New', color: '#6b7280' },
  researching: { label: 'Researching...', color: '#f59e0b' },
  draft: { label: 'Ready for Review', color: '#3b82f6' },
  approved: { label: 'Approved', color: '#10b981' },
  published: { label: 'Published', color: '#8b5cf6' },
};

export default function ToolDraftEditor({ token, draft: initialDraft, onBack, onSave, startResearchImmediately }) {
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

  // Publishing state
  const [publishing, setPublishing] = useState(false);

  // Determine which tabs to show
  const hasContent = draft.generated_content && draft.generated_content.trim().length > 0;
  const hasResearchData = draft.research_data && Object.keys(draft.research_data).length > 0;

  // Initialize frontmatter if not present (new schema)
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
          // Categorization (new schema)
          group: '',
          primaryCategory: '',
          categories: [],
          // Structured tags (new schema)
          aiAutomation: [],
          pricingTags: [],
          companySize: [],
          integrations: [],
          // Pricing display
          pricing: 'freemium',
          priceNote: '',
          // Meta
          featured: false,
          isNew: true,
          publishedAt: new Date().toISOString().split('T')[0],
        },
      }));
    } else if (draft.frontmatter && !draft.frontmatter.group && draft.frontmatter.primaryCategory) {
      // Auto-detect group from existing primary category
      const categoryObj = CATEGORIES.find(c => c.value === draft.frontmatter.primaryCategory);
      if (categoryObj) {
        setDraft((prev) => ({
          ...prev,
          frontmatter: {
            ...prev.frontmatter,
            group: categoryObj.group,
          },
        }));
      }
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

  const handlePublish = async () => {
    const isRepublish = draft.status === 'published';
    const message = isRepublish
      ? `Republish "${draft.name || draft.slug}" to GitHub? This will update the existing tool page.`
      : `Publish "${draft.name || draft.slug}" to GitHub? This will create a new tool page.`;
    if (!confirm(message)) return;

    setError('');
    setSuccess('');
    setPublishing(true);
    addLog('Starting publish to GitHub...');

    try {
      const response = await fetch(`/api/admin/tool-drafts/${draft.id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to publish');
      }

      setDraft(result.draft);
      onSave(result.draft);
      addLog('Published successfully!');
      setSuccess(`Published successfully: ${result.message}`);
    } catch (err) {
      setError(err.message);
      addLog(`Publish error: ${err.message}`);
    } finally {
      setPublishing(false);
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
        {draft.published_at && (
          <span style={{ color: '#6b7280', fontSize: '13px' }}>
            Last published: {new Date(draft.published_at).toLocaleString()}
          </span>
        )}

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
              onClick={handlePublish}
              disabled={publishing}
              style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '8px 16px', border: 'none', opacity: publishing ? 0.7 : 1 }}
            >
              {publishing ? 'Publishing...' : 'Publish to GitHub'}
            </button>
          )}
          {hasContent && draft.status === 'published' && (
            <button
              className="action-btn"
              onClick={handlePublish}
              disabled={publishing}
              style={{ backgroundColor: '#6366f1', color: 'white', padding: '8px 16px', border: 'none', opacity: publishing ? 0.7 : 1 }}
            >
              {publishing ? 'Republishing...' : 'Republish to GitHub'}
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
              <label className="form-label">Group *</label>
              <select
                className="form-select"
                value={frontmatter.group || ''}
                onChange={(e) => {
                  const newGroup = e.target.value;
                  handleFrontmatterChange('group', newGroup);
                  // Clear primary category if it doesn't belong to new group
                  const currentPrimary = frontmatter.primaryCategory;
                  if (currentPrimary) {
                    const categoryObj = CATEGORIES.find(c => c.value === currentPrimary);
                    if (categoryObj && categoryObj.group !== newGroup) {
                      handleFrontmatterChange('primaryCategory', '');
                      // Also filter out categories not in this group
                      const validCats = (frontmatter.categories || []).filter(catVal => {
                        const cat = CATEGORIES.find(c => c.value === catVal);
                        return cat && cat.group === newGroup;
                      });
                      handleFrontmatterChange('categories', validCats);
                    }
                  }
                }}
              >
                <option value="">Select group</option>
                {Object.entries(GROUPS).map(([groupKey, groupLabel]) => (
                  <option key={groupKey} value={groupKey}>{groupLabel}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Primary Category *</label>
              <select
                className="form-select"
                value={frontmatter.primaryCategory || ''}
                onChange={(e) => {
                  const newPrimary = e.target.value;
                  handleFrontmatterChange('primaryCategory', newPrimary);
                  // Auto-set group based on category
                  if (newPrimary) {
                    const categoryObj = CATEGORIES.find(c => c.value === newPrimary);
                    if (categoryObj && categoryObj.group !== frontmatter.group) {
                      handleFrontmatterChange('group', categoryObj.group);
                    }
                  }
                  // Ensure primary is in categories array
                  const currentCats = frontmatter.categories || [];
                  if (newPrimary && !currentCats.includes(newPrimary)) {
                    handleFrontmatterChange('categories', [newPrimary, ...currentCats]);
                  }
                }}
                disabled={!frontmatter.group}
              >
                <option value="">{frontmatter.group ? 'Select primary category' : 'Select a group first'}</option>
                {frontmatter.group && CATEGORIES.filter(c => c.group === frontmatter.group).map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {!frontmatter.group && (
                <small style={{ color: '#f59e0b', fontSize: '11px' }}>Please select a group first</small>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Additional Categories</label>
              <p className="form-hint" style={{ margin: '0 0 8px', fontSize: '11px', color: '#6b7280' }}>
                Optional: select additional categories within the same group
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--color-background)' }}>
                {frontmatter.group ? (
                  CATEGORIES.filter(c => c.group === frontmatter.group).map(cat => (
                    <label key={cat.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={(frontmatter.categories || []).includes(cat.value)}
                        disabled={cat.value === frontmatter.primaryCategory}
                        onChange={(e) => {
                          const current = frontmatter.categories || [];
                          const updated = e.target.checked
                            ? [...current, cat.value]
                            : current.filter(v => v !== cat.value);
                          handleFrontmatterChange('categories', updated);
                        }}
                      />
                      <span style={{ fontSize: '13px', color: cat.value === frontmatter.primaryCategory ? '#6b7280' : 'inherit' }}>
                        {cat.label}
                        {cat.value === frontmatter.primaryCategory && ' (primary)'}
                      </span>
                    </label>
                  ))
                ) : (
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>Select a group to see available categories</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">AI/Automation Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {AI_AUTOMATION_TAGS.map(tag => (
                  <label key={tag.value} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={(frontmatter.aiAutomation || []).includes(tag.value)}
                      onChange={(e) => {
                        const current = frontmatter.aiAutomation || [];
                        const updated = e.target.checked
                          ? [...current, tag.value]
                          : current.filter(t => t !== tag.value);
                        handleFrontmatterChange('aiAutomation', updated);
                      }}
                    />
                    <span style={{ fontSize: '13px' }}>{tag.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Company Size Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {COMPANY_SIZE_TAGS.map(tag => (
                  <label key={tag.value} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={(frontmatter.companySize || []).includes(tag.value)}
                      onChange={(e) => {
                        const current = frontmatter.companySize || [];
                        const updated = e.target.checked
                          ? [...current, tag.value]
                          : current.filter(t => t !== tag.value);
                        handleFrontmatterChange('companySize', updated);
                      }}
                    />
                    <span style={{ fontSize: '13px' }}>{tag.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Pricing Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {PRICING_TAGS.map(tag => (
                  <label key={tag.value} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={(frontmatter.pricingTags || []).includes(tag.value)}
                      onChange={(e) => {
                        const current = frontmatter.pricingTags || [];
                        const updated = e.target.checked
                          ? [...current, tag.value]
                          : current.filter(t => t !== tag.value);
                        handleFrontmatterChange('pricingTags', updated);
                      }}
                    />
                    <span style={{ fontSize: '13px' }}>{tag.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Integrations (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={Array.isArray(frontmatter.integrations) ? frontmatter.integrations.join(', ') : ''}
                onChange={(e) =>
                  handleFrontmatterChange(
                    'integrations',
                    e.target.value
                      .split(',')
                      .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-'))
                      .filter((t) => t)
                  )
                }
                placeholder="salesforce, hubspot, slack, zoom"
              />
              <small style={{ color: '#6b7280', fontSize: '11px' }}>Platform/tool names this tool integrates with</small>
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
              <label className="form-label">Published At</label>
              <input
                type="date"
                className="form-input"
                value={frontmatter.publishedAt || ''}
                onChange={(e) => handleFrontmatterChange('publishedAt', e.target.value)}
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
