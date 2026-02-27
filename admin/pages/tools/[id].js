import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import TabBar from '../../components/TabBar';
import StatusBadge from '../../components/StatusBadge';
import DataTable from '../../components/DataTable';
import { colors, timeAgo } from '../../lib/theme';
import {
  GROUPS, CATEGORIES, PRICING_OPTIONS, AI_AUTOMATION_TAGS,
  PRICING_TAGS, COMPANY_SIZE_TAGS, GROUP_COLORS,
  getCategoryLabel, getGroupLabel, getGroupForCategory, getCategoriesForGroup,
} from '../../lib/taxonomy';
import { NEWSLETTER_STATUSES } from '../../lib/statuses';

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'research', label: 'Research Data' },
  { key: 'directory', label: 'Directory Entry' },
  { key: 'newsletter', label: 'Newsletter' },
];

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export default function ToolDetail() {
  const router = useRouter();
  const { id, tab } = router.query;
  const [tool, setTool] = useState(null);
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);
  const [linkedIssues, setLinkedIssues] = useState([]);
  const [publishingEntry, setPublishingEntry] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // Basic info fields
  const [toolName, setToolName] = useState('');
  const [toolSlug, setToolSlug] = useState('');
  const [toolUrl, setToolUrl] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [summary, setSummary] = useState('');

  // Classification fields
  const [primaryCategory, setPrimaryCategory] = useState('');
  const [groupName, setGroupName] = useState('');
  const [categories, setCategories] = useState([]);
  const [pricing, setPricing] = useState('');
  const [priceNote, setPriceNote] = useState('');
  const [companySize, setCompanySize] = useState([]);
  const [aiAutomation, setAiAutomation] = useState([]);
  const [pricingTags, setPricingTags] = useState([]);
  const [tags, setTags] = useState('');
  const [integrations, setIntegrations] = useState('');

  // Directory content
  const [editContent, setEditContent] = useState('');

  // Newsletter
  const [nlStatus, setNlStatus] = useState('none');
  const [nlPriority, setNlPriority] = useState(0);

  // Original snapshots for dirty tracking
  const [origBasic, setOrigBasic] = useState(null);
  const [origClassification, setOrigClassification] = useState(null);
  const [origContent, setOrigContent] = useState('');
  const [origNewsletter, setOrigNewsletter] = useState(null);

  // Set initial tab from query param
  const tabInitialized = useRef(false);
  useEffect(() => {
    if (tab && !tabInitialized.current && tabs.some(t => t.key === tab)) {
      setActiveTab(tab);
      tabInitialized.current = true;
    }
  }, [tab]);

  useEffect(() => {
    if (!id) return;
    loadTool();
  }, [id]);

  function snapshotBasic(data) {
    return {
      name: data.name || '',
      slug: data.slug || '',
      url: data.url || '',
      screenshotUrl: data.screenshot_url || '',
      summary: data.summary || '',
    };
  }

  function applyBasic(snap) {
    setToolName(snap.name);
    setToolSlug(snap.slug);
    setToolUrl(snap.url);
    setScreenshotUrl(snap.screenshotUrl);
    setSummary(snap.summary);
  }

  function snapshotClassification(data) {
    return {
      primaryCategory: data.primary_category || '',
      groupName: data.group_name || '',
      categories: Array.isArray(data.categories) ? data.categories : [],
      pricing: data.pricing || '',
      priceNote: data.price_note || '',
      companySize: Array.isArray(data.company_size) ? data.company_size : [],
      aiAutomation: Array.isArray(data.ai_automation) ? data.ai_automation : [],
      pricingTags: Array.isArray(data.pricing_tags) ? data.pricing_tags : [],
      tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
      integrations: Array.isArray(data.integrations) ? data.integrations.join(', ') : '',
    };
  }

  function applyClassification(snap) {
    setPrimaryCategory(snap.primaryCategory);
    setGroupName(snap.groupName);
    setCategories(snap.categories);
    setPricing(snap.pricing);
    setPriceNote(snap.priceNote);
    setCompanySize(snap.companySize);
    setAiAutomation(snap.aiAutomation);
    setPricingTags(snap.pricingTags);
    setTags(snap.tags);
    setIntegrations(snap.integrations);
  }

  async function loadTool() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/${id}`);
      if (!res.ok) { router.push('/tools'); return; }
      const data = await res.json();
      setTool(data);

      // Basic info
      const bSnap = snapshotBasic(data);
      applyBasic(bSnap);
      setOrigBasic(bSnap);

      // Classification
      const cSnap = snapshotClassification(data);
      applyClassification(cSnap);
      setOrigClassification(cSnap);

      // Newsletter
      const nlSnap = { status: data.newsletter_status || 'none', priority: data.newsletter_priority || 0 };
      setNlStatus(nlSnap.status);
      setNlPriority(nlSnap.priority);
      setOrigNewsletter(nlSnap);

      // Load directory entry
      const dirRes = await fetch('/api/directory');
      if (dirRes.ok) {
        const entries = await dirRes.json();
        const match = entries.find(e => e.tool_id === data.id);
        if (match) {
          const fullRes = await fetch(`/api/directory/${match.id}`);
          if (fullRes.ok) {
            const full = await fullRes.json();
            setEntry(full);
            setEditContent(full.content || '');
            setOrigContent(full.content || '');
          }
        }
      }

      // Load linked newsletter issues
      const nlRes = await fetch('/api/newsletter/issues');
      if (nlRes.ok) {
        const allIssues = await nlRes.json();
        setLinkedIssues(allIssues.filter(i => i.tool_id === data.id));
      }
    } catch (err) {
      console.error('Failed to load tool:', err);
    }
    setLoading(false);
  }

  // --- Dirty state ---
  const basicDirty = useMemo(() => {
    if (!origBasic) return false;
    return toolName !== origBasic.name || toolSlug !== origBasic.slug ||
      toolUrl !== origBasic.url || screenshotUrl !== origBasic.screenshotUrl ||
      summary !== origBasic.summary;
  }, [toolName, toolSlug, toolUrl, screenshotUrl, summary, origBasic]);

  const classificationDirty = useMemo(() => {
    if (!origClassification) return false;
    return (
      primaryCategory !== origClassification.primaryCategory ||
      groupName !== origClassification.groupName ||
      !arraysEqual(categories, origClassification.categories) ||
      pricing !== origClassification.pricing ||
      priceNote !== origClassification.priceNote ||
      !arraysEqual(companySize, origClassification.companySize) ||
      !arraysEqual(aiAutomation, origClassification.aiAutomation) ||
      !arraysEqual(pricingTags, origClassification.pricingTags) ||
      tags !== origClassification.tags ||
      integrations !== origClassification.integrations
    );
  }, [primaryCategory, groupName, categories, pricing, priceNote, companySize, aiAutomation, pricingTags, tags, integrations, origClassification]);

  const contentDirty = useMemo(() => editContent !== origContent, [editContent, origContent]);

  const newsletterDirty = useMemo(() => {
    if (!origNewsletter) return false;
    return nlStatus !== origNewsletter.status || nlPriority !== origNewsletter.priority;
  }, [nlStatus, nlPriority, origNewsletter]);

  // --- Discard ---
  function discardBasic() { if (origBasic) applyBasic(origBasic); }
  function discardClassification() { if (origClassification) applyClassification(origClassification); }
  function discardContent() { setEditContent(origContent); }
  function discardNewsletter() {
    if (origNewsletter) { setNlStatus(origNewsletter.status); setNlPriority(origNewsletter.priority); }
  }

  // Auto-set group when primary category changes
  function handlePrimaryCategoryChange(val) {
    setPrimaryCategory(val);
    if (val) {
      const inferredGroup = getGroupForCategory(val);
      if (inferredGroup) setGroupName(inferredGroup);
      // Auto-add to categories if not present
      if (!categories.includes(val)) setCategories([...categories, val]);
    }
  }

  function toggleMulti(arr, setArr, val) {
    if (arr.includes(val)) setArr(arr.filter(v => v !== val));
    else setArr([...arr, val]);
  }

  function toggleCategory(catValue) {
    // Don't allow removing the primary category from the multi-list
    if (catValue === primaryCategory && categories.includes(catValue)) return;
    if (categories.includes(catValue)) {
      setCategories(categories.filter(c => c !== catValue));
    } else {
      setCategories([...categories, catValue]);
    }
  }

  // Demote entry status from published → staged
  async function demoteEntryIfPublished() {
    if (entry && entry.status === 'published') {
      try {
        const res = await fetch(`/api/directory/${entry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'staged' }),
        });
        if (res.ok) {
          const updated = await res.json();
          setEntry(updated);
        }
      } catch (err) {
        console.error('Failed to demote entry status:', err);
      }
    }
  }

  async function saveBasic() {
    setSaving(true);
    try {
      const body = {
        name: toolName,
        slug: toolSlug,
        url: toolUrl,
        screenshot_url: screenshotUrl,
        summary: summary || null,
      };
      const res = await fetch(`/api/tools/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setTool(updated);
        const snap = snapshotBasic(updated);
        setOrigBasic(snap);
        await demoteEntryIfPublished();
      }
    } catch (err) {
      alert('Failed to save');
    }
    setSaving(false);
  }

  async function saveClassification() {
    setSaving(true);
    try {
      const body = {
        primary_category: primaryCategory || null,
        group_name: groupName || null,
        categories: categories,
        pricing: pricing || null,
        price_note: priceNote || null,
        ai_automation: aiAutomation,
        company_size: companySize,
        pricing_tags: pricingTags,
        tags: tags ? tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        integrations: integrations ? integrations.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      const res = await fetch(`/api/tools/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setTool(updated);
        const snap = snapshotClassification(updated);
        setOrigClassification(snap);
        await demoteEntryIfPublished();
      }
    } catch (err) {
      alert('Failed to save');
    }
    setSaving(false);
  }

  async function saveContent() {
    if (!entry) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/directory/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent,
          status: entry.status === 'published' ? 'staged' : entry.status,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEntry(updated);
        setOrigContent(editContent);
      }
    } catch (err) {
      alert('Failed to save content');
    }
    setSaving(false);
  }

  async function publishEntry() {
    if (!entry) return;
    setPublishingEntry(true);
    setPublishResult(null);
    try {
      const res = await fetch('/api/directory/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: [entry.id] }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishResult({ ok: true, message: `Published. Commit: ${data.commitSha?.slice(0, 7)}` });
        loadTool();
      } else {
        setPublishResult({ ok: false, message: data.error });
      }
    } catch (err) {
      setPublishResult({ ok: false, message: err.message });
    }
    setPublishingEntry(false);
  }

  async function triggerResearch() {
    setResearching(true);
    try {
      const res = await fetch(`/api/tools/${id}/research`, { method: 'POST' });
      const data = await res.json();
      if (data.success) setTool(prev => ({ ...prev, research_status: 'researching' }));
    } catch (err) {
      alert('Failed to trigger research');
    }
    setResearching(false);
  }

  async function saveNewsletter() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tools/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsletter_status: nlStatus, newsletter_priority: nlPriority }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTool(updated);
        setOrigNewsletter({ status: nlStatus, priority: nlPriority });
      }
    } catch (err) {
      alert('Failed to save newsletter settings');
    }
    setSaving(false);
  }

  if (loading) return <Layout><p style={{ color: colors.dim, marginTop: 40 }}>Loading...</p></Layout>;
  if (!tool) return <Layout><p style={{ color: colors.error, marginTop: 40 }}>Tool not found</p></Layout>;

  const filteredCategories = groupName ? getCategoriesForGroup(groupName) : CATEGORIES;

  return (
    <Layout>
      <Link href="/tools" style={{ color: colors.dim, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        All Tools
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>{tool.name}</h1>
        <StatusBadge status={tool.research_status} />
        {tool.url && (
          <a href={tool.url} target="_blank" rel="noopener" style={{ color: colors.accent, fontSize: 12 }}>
            {(() => { try { return new URL(tool.url).hostname; } catch { return tool.url; } })()} &#8599;
          </a>
        )}
      </div>
      {tool.summary && (
        <p style={{ color: colors.muted, fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{tool.summary}</p>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(tool.research_status === 'queued' || tool.research_status === 'failed' || tool.research_status === 'complete') && (
          <button onClick={triggerResearch} disabled={researching} style={actionBtnStyle}>
            {researching ? 'Starting...' : tool.research_status === 'complete' ? 'Re-Research' : 'Research'}
          </button>
        )}
        {tool.research_status === 'researching' && (
          <span style={{ padding: '5px 12px', fontSize: 12, color: colors.warning }}>Research in progress...</span>
        )}
      </div>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pipeline stages */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <PipelineStage label="Research" status={tool.research_status}
              statusColor={tool.research_status === 'complete' ? '#22c55e' : tool.research_status === 'researching' ? '#f59e0b' : tool.research_status === 'failed' ? '#ef4444' : colors.dim}
              detail={tool.research_completed_at ? `Completed ${new Date(tool.research_completed_at).toLocaleDateString()}` : null} />
            <PipelineStage label="Directory" status={entry ? entry.status : 'no entry'}
              statusColor={entry?.status === 'published' ? '#22c55e' : entry?.status === 'staged' ? '#f59e0b' : entry?.status === 'approved' ? '#3b82f6' : entry ? '#818cf8' : colors.dim}
              detail={entry ? `${entry.status} entry` : 'Not created yet'} />
            <PipelineStage label="Newsletter" status={tool.newsletter_status || 'none'}
              statusColor={tool.newsletter_status === 'sent' ? '#22c55e' : tool.newsletter_status === 'scheduled' ? '#3b82f6' : tool.newsletter_status === 'queued' ? '#f59e0b' : colors.dim}
              detail={tool.newsletter_priority > 0 ? `Priority: ${tool.newsletter_priority}/10` : null} />
          </div>

          {/* Basic Info */}
          <SectionCard title="Basic Info"
            dirty={basicDirty} saving={saving}
            onSave={saveBasic} onDiscard={discardBasic}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input value={toolName} onChange={(e) => setToolName(e.target.value)} style={fieldInputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Slug</label>
                <input value={toolSlug} onChange={(e) => setToolSlug(e.target.value)} style={fieldInputStyle} placeholder="auto-generated-slug" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Website URL</label>
                <input value={toolUrl} onChange={(e) => setToolUrl(e.target.value)} style={fieldInputStyle} placeholder="https://..." />
              </div>
              <div>
                <label style={labelStyle}>Screenshot / Icon URL</label>
                <input value={screenshotUrl} onChange={(e) => setScreenshotUrl(e.target.value)} style={fieldInputStyle} placeholder="https://..." />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Summary</label>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3}
                style={{ ...fieldInputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                placeholder="Brief summary of the tool" />
            </div>
          </SectionCard>

          {/* Classification */}
          <SectionCard title="Classification"
            dirty={classificationDirty} saving={saving}
            onSave={saveClassification} onDiscard={discardClassification}
          >
            {/* Primary Group + Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Primary Group</label>
                <select value={groupName} onChange={(e) => { setGroupName(e.target.value); setPrimaryCategory(''); }} style={selectStyle}>
                  <option value="">— Select group —</option>
                  {GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Primary Category</label>
                <select value={primaryCategory} onChange={(e) => handlePrimaryCategoryChange(e.target.value)} style={selectStyle}>
                  <option value="">— Select category —</option>
                  {filteredCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Additional Categories (multi-select grouped by group) */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Additional Categories</label>
              <p style={{ fontSize: 11, color: colors.subtle, marginBottom: 8 }}>
                Select all categories that apply. Primary category is auto-included.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {GROUPS.map(group => (
                  <div key={group.value}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: GROUP_COLORS[group.value] || colors.muted, marginBottom: 4 }}>
                      {group.label}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {getCategoriesForGroup(group.value).map(cat => {
                        const isPrimary = cat.value === primaryCategory;
                        const isSelected = categories.includes(cat.value);
                        return (
                          <button key={cat.value} onClick={() => toggleCategory(cat.value)}
                            title={isPrimary ? 'Primary category (cannot remove)' : ''}
                            style={{
                              padding: '3px 10px', borderRadius: 16, fontSize: 11, fontWeight: 500,
                              cursor: isPrimary ? 'default' : 'pointer',
                              border: `1px solid ${isSelected ? (GROUP_COLORS[group.value] || '#3b82f6') : colors.border}`,
                              background: isSelected ? (GROUP_COLORS[group.value] || '#3b82f6') + '22' : 'transparent',
                              color: isSelected ? (GROUP_COLORS[group.value] || '#60a5fa') : colors.dim,
                              opacity: isPrimary ? 1 : undefined,
                              transition: 'all 0.15s',
                            }}>
                            {isPrimary && <span style={{ marginRight: 3 }}>*</span>}
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing + Price Note */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Pricing</label>
                <select value={pricing} onChange={(e) => setPricing(e.target.value)} style={selectStyle}>
                  <option value="">— Select —</option>
                  {PRICING_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Price Note</label>
                <input value={priceNote} onChange={(e) => setPriceNote(e.target.value)} placeholder="e.g. Starts at $49/mo" style={fieldInputStyle} />
              </div>
            </div>

            {/* Company Size */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Company Size</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COMPANY_SIZE_TAGS.map(t => (
                  <ChipToggle key={t.value} label={t.label} active={companySize.includes(t.value)}
                    onClick={() => toggleMulti(companySize, setCompanySize, t.value)} />
                ))}
              </div>
            </div>

            {/* AI/Automation */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>AI / Automation</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {AI_AUTOMATION_TAGS.map(t => (
                  <ChipToggle key={t.value} label={t.label} active={aiAutomation.includes(t.value)}
                    onClick={() => toggleMulti(aiAutomation, setAiAutomation, t.value)} />
                ))}
              </div>
            </div>

            {/* Pricing Tags */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Pricing Tags</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PRICING_TAGS.map(t => (
                  <ChipToggle key={t.value} label={t.label} active={pricingTags.includes(t.value)}
                    onClick={() => toggleMulti(pricingTags, setPricingTags, t.value)} />
                ))}
              </div>
            </div>

            {/* Tags + Integrations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Tags (comma-separated)</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. lead-gen, ai, crm" style={fieldInputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Integrations (comma-separated)</label>
                <input value={integrations} onChange={(e) => setIntegrations(e.target.value)} placeholder="e.g. hubspot, salesforce, slack" style={fieldInputStyle} />
              </div>
            </div>
          </SectionCard>

          {/* Newsletter settings */}
          <SectionCard title="Newsletter Pipeline"
            dirty={newsletterDirty} saving={saving}
            onSave={saveNewsletter} onDiscard={discardNewsletter}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Newsletter Status</label>
                <select value={nlStatus} onChange={(e) => setNlStatus(e.target.value)} style={selectStyle}>
                  {NEWSLETTER_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Newsletter Priority (0-10)</label>
                <input type="number" min="0" max="10" value={nlPriority}
                  onChange={(e) => setNlPriority(parseInt(e.target.value) || 0)} style={fieldInputStyle} />
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ===== RESEARCH DATA TAB ===== */}
      {activeTab === 'research' && (
        <div>
          {tool.website_data || tool.research_blob ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {tool.website_data && <JsonViewer title="Scraped Website Data" data={tool.website_data} />}
              {tool.research_blob && <TextViewer title="AI Research Summary" text={tool.research_blob} />}
              {tool.review_data && <JsonViewer title="Review Data & Citations" data={tool.review_data} />}
            </div>
          ) : (
            <EmptyState message="No research data available." detail="Trigger research to populate this tab." />
          )}
        </div>
      )}

      {/* ===== DIRECTORY ENTRY TAB ===== */}
      {activeTab === 'directory' && (
        <div>
          {entry ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <StatusBadge status={entry.status || 'draft'} />
                  {entry.published_at && (
                    <span style={{ fontSize: 12, color: colors.dim }}>
                      Published {new Date(entry.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {contentDirty && <button onClick={discardContent} style={discardBtnStyle}>Discard</button>}
                  <button onClick={saveContent} disabled={saving || !contentDirty}
                    style={contentDirty ? saveBtnStyle : saveBtnDisabledStyle}>
                    {saving ? 'Saving...' : 'Save Content'}
                  </button>
                  <button onClick={publishEntry} disabled={publishingEntry || contentDirty} style={{
                    ...actionBtnStyle,
                    borderColor: contentDirty ? colors.border : '#166534',
                    color: contentDirty ? colors.dim : '#4ade80',
                    background: contentDirty ? 'transparent' : '#052e16',
                    cursor: contentDirty ? 'not-allowed' : 'pointer',
                  }} title={contentDirty ? 'Save changes before publishing' : 'Publish to GitHub'}>
                    {publishingEntry ? 'Publishing...' : 'Publish to GitHub'}
                  </button>
                </div>
              </div>

              {publishResult && (
                <div style={{
                  padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 12,
                  background: publishResult.ok ? '#052e16' : '#450a0a',
                  color: publishResult.ok ? '#4ade80' : '#f87171',
                  border: `1px solid ${publishResult.ok ? '#14532d' : '#7f1d1d'}`,
                }}>
                  {publishResult.message}
                </div>
              )}

              {contentDirty && entry.status === 'published' && (
                <div style={{
                  padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 12,
                  background: '#422006', color: '#fbbf24', border: '1px solid #78350f',
                }}>
                  Unsaved changes will set entry status to &quot;staged&quot; until republished.
                </div>
              )}

              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                style={{
                  width: '100%', minHeight: 400, padding: 16,
                  background: colors.surface, border: `1px solid ${contentDirty ? '#3b82f6' : colors.border}`,
                  borderRadius: 8, color: colors.text, fontSize: 13,
                  fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.6,
                  resize: 'vertical', outline: 'none', transition: 'border-color 0.15s',
                }} />
            </>
          ) : (
            <EmptyState message="No directory entry yet." detail="Run the directory agent to generate content from research data." />
          )}
        </div>
      )}

      {/* ===== NEWSLETTER TAB ===== */}
      {activeTab === 'newsletter' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionCard title="Newsletter Settings"
            dirty={newsletterDirty} saving={saving}
            onSave={saveNewsletter} onDiscard={discardNewsletter}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={nlStatus} onChange={(e) => setNlStatus(e.target.value)} style={selectStyle}>
                  {NEWSLETTER_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority (0-10)</label>
                <input type="number" min="0" max="10" value={nlPriority}
                  onChange={(e) => setNlPriority(parseInt(e.target.value) || 0)} style={fieldInputStyle} />
              </div>
            </div>
          </SectionCard>

          <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Linked Newsletter Issues</h3>
            {linkedIssues.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <p style={{ color: colors.dim, fontSize: 13 }}>This tool hasn&apos;t been featured in a newsletter yet.</p>
              </div>
            ) : (
              <DataTable
                columns={[
                  { key: 'issue_number', label: 'Issue', width: 80, render: (v) => <span style={{ fontWeight: 500 }}>#{v}</span> },
                  { key: 'newsletter_topics', label: 'Topic', render: (v) => <span style={{ color: colors.muted, fontSize: 13 }}>{v?.topic || '-'}</span> },
                  { key: 'status', label: 'Status', width: 100, render: (v) => <StatusBadge status={v || 'draft'} small /> },
                  { key: 'sent_at', label: 'Sent', width: 110, render: (v) => <span style={{ color: colors.dim, fontSize: 12 }}>{v ? timeAgo(v) : '-'}</span> },
                ]}
                data={linkedIssues}
                emptyMessage="No linked issues."
              />
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

// --- Components ---

function SectionCard({ title, children, dirty, saving, onSave, onDiscard }) {
  return (
    <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>{title}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {dirty && <button onClick={onDiscard} style={discardBtnStyle}>Discard</button>}
          <button onClick={onSave} disabled={saving || !dirty} style={dirty ? saveBtnStyle : saveBtnDisabledStyle}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message, detail }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}` }}>
      <p style={{ color: colors.dim }}>{message}</p>
      {detail && <p style={{ color: colors.subtle, fontSize: 12, marginTop: 4 }}>{detail}</p>}
    </div>
  );
}

function ChipToggle({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
      border: `1px solid ${active ? '#3b82f6' : colors.border}`,
      background: active ? '#1e3a5f' : 'transparent',
      color: active ? '#60a5fa' : colors.dim,
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );
}

function JsonViewer({ title, data }) {
  return (
    <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${colors.border}` }}>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>{title}</h3>
      </div>
      <pre style={{
        padding: 16, margin: 0, overflow: 'auto', maxHeight: 400,
        fontSize: 12, lineHeight: 1.5, color: colors.muted,
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function TextViewer({ title, text }) {
  return (
    <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${colors.border}` }}>
        <h3 style={{ fontSize: 13, fontWeight: 600 }}>{title}</h3>
      </div>
      <div style={{
        padding: 16, maxHeight: 400, overflow: 'auto',
        fontSize: 13, lineHeight: 1.7, color: colors.muted, whiteSpace: 'pre-wrap',
      }}>
        {text}
      </div>
    </div>
  );
}

function PipelineStage({ label, status, statusColor, detail }) {
  return (
    <div style={{
      background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: 11, color: colors.dim, fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{status}</span>
      </div>
      {detail && <div style={{ fontSize: 11, color: colors.dim }}>{detail}</div>}
    </div>
  );
}

// --- Styles ---

const actionBtnStyle = {
  padding: '6px 14px', border: `1px solid ${colors.border}`, borderRadius: 6,
  background: colors.surface, color: colors.muted, fontSize: 12, fontWeight: 500, cursor: 'pointer',
};

const saveBtnStyle = {
  padding: '6px 14px', border: '1px solid #3b82f6', borderRadius: 6,
  background: '#3b82f6', color: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer',
};

const saveBtnDisabledStyle = {
  padding: '6px 14px', border: `1px solid ${colors.border}`, borderRadius: 6,
  background: colors.surface, color: colors.dim, fontSize: 12, fontWeight: 500, cursor: 'not-allowed',
  opacity: 0.5,
};

const discardBtnStyle = {
  padding: '6px 14px', border: `1px solid ${colors.border}`, borderRadius: 6,
  background: 'transparent', color: colors.muted, fontSize: 12, fontWeight: 500, cursor: 'pointer',
};

const labelStyle = {
  display: 'block', fontSize: 11, color: colors.dim, marginBottom: 3, fontWeight: 500,
};

const selectStyle = {
  width: '100%', padding: '7px 10px',
  border: `1px solid ${colors.border}`, borderRadius: 6,
  background: colors.bg, color: colors.text, fontSize: 13, outline: 'none',
};

const fieldInputStyle = {
  width: '100%', padding: '7px 10px',
  border: `1px solid ${colors.border}`, borderRadius: 6,
  background: colors.bg, color: colors.text, fontSize: 13, outline: 'none',
};
