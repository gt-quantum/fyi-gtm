// Taxonomy — must match fyigtmdotcom/fyigtm-web/src/lib/taxonomy.ts

export const GROUPS = [
  { value: 'data-intelligence', label: 'Data & Intelligence' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'revenue-operations', label: 'Revenue Operations' },
  { value: 'customer', label: 'Customer' },
  { value: 'partnerships', label: 'Partnerships' },
];

export const CATEGORIES = [
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

export const PRICING_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'paid', label: 'Paid' },
  { value: 'enterprise', label: 'Enterprise' },
];

export const AI_AUTOMATION_TAGS = [
  { value: 'ai-native', label: 'AI Native' },
  { value: 'ai-enhanced', label: 'AI Enhanced' },
  { value: 'automation', label: 'Automation' },
];

export const PRICING_TAGS = [
  { value: 'free-tier', label: 'Free Tier' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'paid-only', label: 'Paid Only' },
  { value: 'enterprise-pricing', label: 'Enterprise Pricing' },
];

export const COMPANY_SIZE_TAGS = [
  { value: 'smb', label: 'SMB' },
  { value: 'mid-market', label: 'Mid-Market' },
  { value: 'enterprise', label: 'Enterprise' },
];

export const GROUP_COLORS = {
  'data-intelligence': '#8B5CF6',
  'marketing': '#EC4899',
  'sales': '#3B82F6',
  'revenue-operations': '#F59E0B',
  'customer': '#10B981',
  'partnerships': '#6366F1',
};

export function getCategoryLabel(slug) {
  return CATEGORIES.find(c => c.value === slug)?.label || slug;
}

export function getGroupLabel(slug) {
  return GROUPS.find(g => g.value === slug)?.label || slug;
}

export function getGroupForCategory(categorySlug) {
  return CATEGORIES.find(c => c.value === categorySlug)?.group || null;
}

export function getCategoriesForGroup(groupSlug) {
  return CATEGORIES.filter(c => c.group === groupSlug);
}
