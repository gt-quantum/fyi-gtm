// ============================================
// GROUPS (6)
// ============================================
export const groups = [
  'data-intelligence',
  'marketing',
  'sales',
  'revenue-operations',
  'customer',
  'partnerships',
] as const;

export type Group = (typeof groups)[number];

// ============================================
// CATEGORIES (28)
// ============================================
export const categories = [
  // Data & Intelligence (5)
  'contact-company-data',
  'data-enrichment-hygiene',
  'intent-signals',
  'market-competitive-research',
  'ai-data-agents',
  // Marketing (6)
  'marketing-automation-email',
  'abm-demand-gen',
  'content-creative',
  'social-community',
  'seo-organic',
  'ai-marketing-tools',
  // Sales (5)
  'crm',
  'sales-engagement',
  'sales-enablement',
  'cpq-proposals',
  'ai-sales-assistants',
  // Revenue Operations (5)
  'lead-management',
  'pipeline-forecasting',
  'revenue-analytics-attribution',
  'workflow-integration',
  'ai-revops-tools',
  // Customer (4)
  'customer-success',
  'product-analytics-adoption',
  'support-feedback',
  'ai-customer-tools',
  // Partnerships (3)
  'partner-management',
  'affiliates-referrals',
  'ai-partnership-tools',
] as const;

export type Category = (typeof categories)[number];

// ============================================
// CATEGORY TO GROUP MAPPING
// ============================================
export const categoryToGroup: Record<Category, Group> = {
  // Data & Intelligence
  'contact-company-data': 'data-intelligence',
  'data-enrichment-hygiene': 'data-intelligence',
  'intent-signals': 'data-intelligence',
  'market-competitive-research': 'data-intelligence',
  'ai-data-agents': 'data-intelligence',
  // Marketing
  'marketing-automation-email': 'marketing',
  'abm-demand-gen': 'marketing',
  'content-creative': 'marketing',
  'social-community': 'marketing',
  'seo-organic': 'marketing',
  'ai-marketing-tools': 'marketing',
  // Sales
  'crm': 'sales',
  'sales-engagement': 'sales',
  'sales-enablement': 'sales',
  'cpq-proposals': 'sales',
  'ai-sales-assistants': 'sales',
  // Revenue Operations
  'lead-management': 'revenue-operations',
  'pipeline-forecasting': 'revenue-operations',
  'revenue-analytics-attribution': 'revenue-operations',
  'workflow-integration': 'revenue-operations',
  'ai-revops-tools': 'revenue-operations',
  // Customer
  'customer-success': 'customer',
  'product-analytics-adoption': 'customer',
  'support-feedback': 'customer',
  'ai-customer-tools': 'customer',
  // Partnerships
  'partner-management': 'partnerships',
  'affiliates-referrals': 'partnerships',
  'ai-partnership-tools': 'partnerships',
};

// ============================================
// DISPLAY LABELS
// ============================================
export const groupLabels: Record<Group, string> = {
  'data-intelligence': 'Data & Intelligence',
  'marketing': 'Marketing',
  'sales': 'Sales',
  'revenue-operations': 'Revenue Operations',
  'customer': 'Customer',
  'partnerships': 'Partnerships',
};

export const categoryLabels: Record<Category, string> = {
  // Data & Intelligence
  'contact-company-data': 'Contact & Company Data',
  'data-enrichment-hygiene': 'Data Enrichment & Hygiene',
  'intent-signals': 'Intent Signals',
  'market-competitive-research': 'Market & Competitive Research',
  'ai-data-agents': 'AI Data Agents',
  // Marketing
  'marketing-automation-email': 'Marketing Automation & Email',
  'abm-demand-gen': 'ABM & Demand Gen',
  'content-creative': 'Content & Creative',
  'social-community': 'Social & Community',
  'seo-organic': 'SEO & Organic',
  'ai-marketing-tools': 'AI Marketing Tools',
  // Sales
  'crm': 'CRM',
  'sales-engagement': 'Sales Engagement',
  'sales-enablement': 'Sales Enablement',
  'cpq-proposals': 'CPQ & Proposals',
  'ai-sales-assistants': 'AI Sales Assistants',
  // Revenue Operations
  'lead-management': 'Lead Management',
  'pipeline-forecasting': 'Pipeline & Forecasting',
  'revenue-analytics-attribution': 'Revenue Analytics & Attribution',
  'workflow-integration': 'Workflow & Integration',
  'ai-revops-tools': 'AI RevOps Tools',
  // Customer
  'customer-success': 'Customer Success',
  'product-analytics-adoption': 'Product Analytics & Adoption',
  'support-feedback': 'Support & Feedback',
  'ai-customer-tools': 'AI Customer Tools',
  // Partnerships
  'partner-management': 'Partner Management',
  'affiliates-referrals': 'Affiliates & Referrals',
  'ai-partnership-tools': 'AI Partnership Tools',
};

// ============================================
// TAG ENUMS
// ============================================
export const aiAutomationTags = ['ai-native', 'ai-enhanced', 'automation'] as const;
export const pricingTags = ['free-tier', 'freemium', 'paid-only', 'enterprise-pricing'] as const;
export const companySizeTags = ['smb', 'mid-market', 'enterprise'] as const;

export type AiAutomationTag = (typeof aiAutomationTags)[number];
export type PricingTag = (typeof pricingTags)[number];
export type CompanySizeTag = (typeof companySizeTags)[number];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the parent group for a category
 */
export function getGroupForCategory(category: Category): Group {
  return categoryToGroup[category];
}

/**
 * Get all unique groups for a list of categories (useful for tools with multiple categories)
 */
export function getToolGroups(categoryList: Category[]): Group[] {
  const groupSet = new Set(categoryList.map((c) => categoryToGroup[c]));
  return Array.from(groupSet);
}

/**
 * Get all categories within a group
 */
export function getCategoriesForGroup(group: Group): Category[] {
  return (Object.entries(categoryToGroup) as [Category, Group][])
    .filter(([_, g]) => g === group)
    .map(([c]) => c);
}

/**
 * Get display label for a category
 */
export function getCategoryLabel(category: Category): string {
  return categoryLabels[category];
}

/**
 * Get display label for a group
 */
export function getGroupLabel(group: Group): string {
  return groupLabels[group];
}
