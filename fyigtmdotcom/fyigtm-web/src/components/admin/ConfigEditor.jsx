import { useState, useEffect } from 'react';

const DEFAULT_STRUCTURE = `## 1️⃣ Sales Tech Spotlight
Feature ONE sales technology. If a specific tech was provided above, use it. Otherwise, choose something relevant and timely.
Brief description of what it does and why it matters now.

## 2️⃣ Two Tips to Try This Week
Two actionable tips. If specific tips were provided above, expand on them. Otherwise, generate relevant tips based on the newsletter context.
Keep them practical and specific.

## 3️⃣ Three Takeaways
Three quick insights or learnings. These should be observations, stats, or lessons relevant to the audience.`;

export default function ConfigEditor({ token }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch config');
      const data = await response.json();
      setConfig(data);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error('Failed to save config');

      const data = await response.json();
      setConfig(data);
      setSuccess('Configuration saved successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="table-loading">Loading configuration...</div>;
  }

  if (!config) {
    return <div className="form-error">No configuration found. Please ensure the newsletter_config table exists.</div>;
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Newsletter Configuration</h2>
      </div>

      <form className="config-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-group">
          <label className="form-label">Newsletter Name</label>
          <input
            type="text"
            className="form-input"
            value={config.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., FYI GTM Weekly"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            value={config.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            placeholder="Brief description of your newsletter..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Target Audience</label>
          <textarea
            className="form-textarea"
            value={config.audience || ''}
            onChange={(e) => handleChange('audience', e.target.value)}
            rows={3}
            placeholder="Describe your target audience..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Themes</label>
          <textarea
            className="form-textarea"
            value={config.themes || ''}
            onChange={(e) => handleChange('themes', e.target.value)}
            rows={4}
            placeholder="Key themes and topics covered..."
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
          <label className="form-label">Things to Avoid</label>
          <textarea
            className="form-textarea"
            value={config.avoid || ''}
            onChange={(e) => handleChange('avoid', e.target.value)}
            rows={3}
            placeholder="Topics or styles to avoid..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Newsletter Structure</label>
          <p className="form-hint">
            Define the sections and instructions for the newsletter. Use phrases like "If a specific tech was provided above, use it" to enable fallback behavior.
          </p>
          <textarea
            className="form-textarea"
            value={config.structure || DEFAULT_STRUCTURE}
            onChange={(e) => handleChange('structure', e.target.value)}
            rows={20}
            style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </div>

        <div className="config-actions">
          <button type="submit" className="save-button" disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
