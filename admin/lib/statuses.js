// Canonical status values — must match Postgres CHECK constraints
// tools.research_status CHECK (queued, researching, researched, analyzing, complete, failed)
// tools.analysis_status CHECK (pending, queued, analyzing, complete, failed)
// tools.newsletter_status CHECK (none, queued, scheduled, sent)
// directory_entries.status CHECK (draft, staged, approved, published)
// newsletter_issues.status CHECK (draft, scheduled, sent, failed)

export const RESEARCH_STATUSES = [
  { value: 'queued', label: 'Queued' },
  { value: 'researching', label: 'Researching' },
  { value: 'researched', label: 'Researched' },
  { value: 'analyzing', label: 'Analyzing' },
  { value: 'complete', label: 'Complete' },
  { value: 'failed', label: 'Failed' },
];

export const ENTRY_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'staged', label: 'Staged' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
];

export const NEWSLETTER_STATUSES = [
  { value: 'none', label: 'None' },
  { value: 'queued', label: 'Queued' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sent', label: 'Sent' },
];

export const NEWSLETTER_ISSUE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
];

// For filters that need a "no entry" virtual status
export const ENTRY_FILTER_STATUSES = [
  ...ENTRY_STATUSES,
  { value: 'no_entry', label: 'No Entry' },
];
