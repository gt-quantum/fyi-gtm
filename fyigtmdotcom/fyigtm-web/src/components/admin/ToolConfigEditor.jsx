import { useState, useEffect, useCallback } from 'react';

export default function ToolConfigEditor({ token }) {
  const [config, setConfig] = useState(null);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if config has been modified from original
  const hasUnsavedChanges = useCallback(() => {
    if (!config || !originalConfig) return false;

    // Compare relevant fields (excluding raw JSON editing fields)
    const fieldsToCompare = [
      'review_template',
      'sections',
      'default_sources',
      'tone',
      'emphasize',
      'avoid',
      'word_count_target',
    ];

    for (const field of fieldsToCompare) {
      const current = config[field];
      const original = originalConfig[field];

      // Handle arrays/objects by comparing JSON strings
      if (typeof current === 'object' || typeof original === 'object') {
        if (JSON.stringify(current) !== JSON.stringify(original)) {
          return true;
        }
      } else if (current !== original) {
        return true;
      }
    }

    return false;
  }, [config, originalConfig]);

  useEffect(() => {
    fetchConfig();
  }, []);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/tool-config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch tool config');
      const data = await response.json();
      setConfig(data);
      setOriginalConfig(JSON.parse(JSON.stringify(data))); // Deep clone for comparison
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setSuccess('');
  };

  const handleJsonChange = (field, value) => {
    try {
      const parsed = JSON.parse(value);
      setConfig((prev) => ({ ...prev, [field]: parsed }));
      setSuccess('');
    } catch {
      // Allow invalid JSON during editing, it will be validated on save
      setConfig((prev) => ({ ...prev, [`_${field}_raw`]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/admin/tool-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error('Failed to save tool config');

      const data = await response.json();
      setConfig(data);
      setOriginalConfig(JSON.parse(JSON.stringify(data))); // Update original after successful save
      setSuccess('Tool configuration saved successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="table-loading">Loading tool configuration...</div>;
  }

  if (!config) {
    return <div className="form-error">No tool configuration found. Please run the database migration.</div>;
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Tool Review Configuration</h2>
      </div>

      <form className="config-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-group">
          <label className="form-label">Review Template</label>
          <p className="form-hint">Markdown template structure for generated reviews. Use {'{Tool Name}'} as placeholder.</p>
          <textarea
            className="form-textarea"
            value={config.review_template || ''}
            onChange={(e) => handleChange('review_template', e.target.value)}
            rows={15}
            placeholder="## What is {Tool Name}?..."
            style={{ fontFamily: 'monospace', fontSize: '13px' }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Sections (JSON array)</label>
          <p className="form-hint">Required sections for each review.</p>
          <textarea
            className="form-textarea"
            value={config._sections_raw || JSON.stringify(config.sections, null, 2)}
            onChange={(e) => handleJsonChange('sections', e.target.value)}
            rows={4}
            placeholder='["intro", "features", "pricing", "pros_cons", "verdict"]'
            style={{ fontFamily: 'monospace', fontSize: '13px' }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Default Research Sources (JSON array)</label>
          <p className="form-hint">Sources to scrape for each tool review.</p>
          <textarea
            className="form-textarea"
            value={config._default_sources_raw || JSON.stringify(config.default_sources, null, 2)}
            onChange={(e) => handleJsonChange('default_sources', e.target.value)}
            rows={3}
            placeholder='["g2", "trustpilot", "capterra", "reddit", "producthunt"]'
            style={{ fontFamily: 'monospace', fontSize: '13px' }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tone</label>
          <textarea
            className="form-textarea"
            value={config.tone || ''}
            onChange={(e) => handleChange('tone', e.target.value)}
            rows={3}
            placeholder="Describe the writing tone and style..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Emphasize</label>
          <p className="form-hint">What to highlight in reviews (positive preferences).</p>
          <textarea
            className="form-textarea"
            value={config.emphasize || ''}
            onChange={(e) => handleChange('emphasize', e.target.value)}
            rows={3}
            placeholder="Real user feedback, practical use cases..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Avoid</label>
          <p className="form-hint">What to avoid in reviews (negative preferences).</p>
          <textarea
            className="form-textarea"
            value={config.avoid || ''}
            onChange={(e) => handleChange('avoid', e.target.value)}
            rows={3}
            placeholder="Overly promotional language, unverified claims..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Word Count Target</label>
          <input
            type="number"
            className="form-input"
            value={config.word_count_target || ''}
            onChange={(e) => handleChange('word_count_target', e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g., 1500"
            min={100}
            max={10000}
          />
        </div>

        <div className="config-actions">
          {hasUnsavedChanges() && (
            <span className="unsaved-indicator">
              You have unsaved changes
            </span>
          )}
          <button
            type="submit"
            className={`save-button ${hasUnsavedChanges() ? 'save-button--unsaved' : ''}`}
            disabled={saving}
          >
            {saving ? 'Saving...' : hasUnsavedChanges() ? 'Save Changes' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
