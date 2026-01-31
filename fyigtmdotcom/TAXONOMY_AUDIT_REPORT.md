# GTM Tool Directory Taxonomy Audit Report

**Generated:** January 31, 2026
**Repository:** fyigtm-web

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Schema Comparison](#schema-comparison)
4. [Taxonomy & Mapping Analysis](#taxonomy--mapping-analysis)
5. [Content Inventory](#content-inventory)
6. [Routing Analysis](#routing-analysis)
7. [Gap Analysis](#gap-analysis)
8. [Migration Plan](#migration-plan)
9. [Action Items](#action-items)

---

## Executive Summary

### Critical Finding
**The current implementation is an AI tool directory, not a GTM tool directory.** The existing categories (Image Generation, Chat, Writing, Video, Audio, Code, etc.) are AI/ML focused. Only 2 tool markdown files in the content collection (`gong.md`, `vector.md`) are actual GTM tools.

### High-Level Gaps

| Area | Current State | Target Spec | Gap Severity |
|------|---------------|-------------|--------------|
| Categories | 12 AI-focused categories | 28 GTM categories | 🔴 Critical |
| Groups | Not implemented | 6 groups | 🔴 Critical |
| Multi-category | Single category per tool | Multiple categories | 🟡 Medium |
| Structured tags | Freeform string array | Typed tag fields | 🟡 Medium |
| Taxonomy files | None exist | categoryToGroup, labels | 🔴 Critical |
| primaryCategory | Not implemented | Required field | 🟡 Medium |
| Date fields | String format | Date objects | 🟢 Low |

---

## Current State Analysis

### 1. Repository Structure

```
fyigtm-web/
├── src/
│   ├── content/
│   │   ├── config.ts              # Schema definitions
│   │   ├── categories/            # 12 category markdown files
│   │   │   ├── audio.md
│   │   │   ├── business.md
│   │   │   ├── chat.md
│   │   │   ├── code.md
│   │   │   ├── design.md
│   │   │   ├── education.md
│   │   │   ├── image-generation.md
│   │   │   ├── marketing.md
│   │   │   ├── productivity.md
│   │   │   ├── search.md
│   │   │   ├── video.md
│   │   │   └── writing.md
│   │   └── tools/                 # 2 GTM tool markdown files
│   │       ├── gong.md
│   │       └── vector.md
│   ├── data/
│   │   ├── categories.ts          # Category array (mirrors content)
│   │   └── tools.ts               # 22 AI tool objects (NOT GTM)
│   ├── pages/
│   │   ├── index.astro
│   │   ├── tools/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── categories/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── featured.astro
│   │   ├── new.astro
│   │   ├── top.astro
│   │   ├── deals.astro
│   │   └── graveyard.astro
│   ├── components/
│   │   └── tools/
│   │       ├── ToolCard.jsx
│   │       ├── ToolListItem.jsx
│   │       ├── UpvoteButton.jsx
│   │       ├── SortableToolsList.jsx
│   │       ├── SearchableToolsList.jsx
│   │       ├── CategoryTabs.jsx
│   │       ├── CategoryCard.jsx
│   │       └── Sidebar.jsx
│   └── lib/
│       ├── theme.ts               # Design tokens
│       └── supabase.ts            # Database client
```

### 2. Current Content Schema

**File:** `src/content/config.ts`

```typescript
const toolsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string(),
    url: z.string().url(),
    logo: z.string().optional(),
    pricing: z.enum(['free', 'freemium', 'paid', 'trial']),
    priceNote: z.string().optional(),
    category: z.string(),                    // Single, freeform
    subcategory: z.string().optional(),
    tags: z.array(z.string()),               // Freeform array
    upvotes: z.number(),
    comments: z.number(),
    views: z.number(),
    featured: z.boolean(),
    isNew: z.boolean(),
    isVerified: z.boolean().optional(),
    hasDeal: z.boolean(),
    dealDescription: z.string().optional(),
    isDiscontinued: z.boolean(),
    dateAdded: z.string(),                   // String, not Date
    dateUpdated: z.string().optional(),
  }),
});

const categoriesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    icon: z.string().optional(),
    color: z.string().optional(),
    toolCount: z.number(),
    featured: z.boolean(),
    order: z.number(),
  }),
});
```

### 3. Current Categories (12 AI-focused)

| # | Category | Slug | Color | Featured |
|---|----------|------|-------|----------|
| 1 | Image Generation | image-generation | #8B5CF6 | ✅ |
| 2 | Chat | chat | #3B82F6 | ✅ |
| 3 | Writing | writing | #10B981 | ✅ |
| 4 | Video | video | #EF4444 | ✅ |
| 5 | Audio | audio | #F59E0B | ✅ |
| 6 | Code | code | #06B6D4 | ✅ |
| 7 | Productivity | productivity | #8B5CF6 | ❌ |
| 8 | Search | search | #3B82F6 | ❌ |
| 9 | Marketing | marketing | #EC4899 | ❌ |
| 10 | Design | design | #F97316 | ✅ |
| 11 | Business | business | #14B8A6 | ❌ |
| 12 | Education | education | #6366F1 | ❌ |

**Problem:** These are NOT the 28 GTM categories from the target spec.

---

## Schema Comparison

### Tool Schema: Current vs Target

| Field | Current | Target | Status |
|-------|---------|--------|--------|
| `name` | `z.string()` | `z.string()` | ✅ Match |
| `description` | `z.string()` | `z.string()` | ✅ Match |
| `url` | `z.string().url()` | — | ⚠️ Named `website` in target |
| `website` | — | `z.string().url()` | ❌ Missing |
| `logo` | `z.string().optional()` | `z.string().optional()` | ✅ Match |
| `primaryCategory` | — | `z.enum(categories)` | ❌ Missing |
| `categories` | — | `z.array(z.enum(categories)).min(1)` | ❌ Missing |
| `category` | `z.string()` | — | ⚠️ Replace with above |
| `subcategory` | `z.string().optional()` | — | ⚠️ Remove (use categories) |
| `aiAutomation` | — | `z.array(z.enum(['ai-native', 'ai-enhanced', 'automation'])).default([])` | ❌ Missing |
| `pricing` (tags) | — | `z.array(z.enum(['free-tier', 'freemium', 'paid-only', 'enterprise-pricing'])).default([])` | ❌ Missing |
| `companySize` | — | `z.array(z.enum(['smb', 'mid-market', 'enterprise'])).default([])` | ❌ Missing |
| `integrations` | — | `z.array(z.string()).default([])` | ❌ Missing |
| `pricing` (current) | `z.enum(['free', 'freemium', 'paid', 'trial'])` | — | ⚠️ Enum mismatch |
| `priceNote` | `z.string().optional()` | — | ⚠️ Keep or remove? |
| `tags` | `z.array(z.string())` | — | ⚠️ Replace with structured tags |
| `featured` | `z.boolean()` | `z.boolean().default(false)` | ✅ Match (add default) |
| `publishedAt` | — | `z.date()` | ❌ Missing |
| `updatedAt` | — | `z.date().optional()` | ❌ Missing |
| `dateAdded` | `z.string()` | — | ⚠️ Replace with publishedAt |
| `dateUpdated` | `z.string().optional()` | — | ⚠️ Replace with updatedAt |
| `upvotes` | `z.number()` | — | ⚠️ Keep? (not in target) |
| `comments` | `z.number()` | — | ⚠️ Keep? (not in target) |
| `views` | `z.number()` | — | ⚠️ Keep? (not in target) |
| `isNew` | `z.boolean()` | — | ⚠️ Keep? (not in target) |
| `isVerified` | `z.boolean().optional()` | — | ⚠️ Keep? (not in target) |
| `hasDeal` | `z.boolean()` | — | ⚠️ Keep? (not in target) |
| `dealDescription` | `z.string().optional()` | — | ⚠️ Keep? (not in target) |
| `isDiscontinued` | `z.boolean()` | — | ⚠️ Keep? (not in target) |

### Pricing Enum Comparison

| Current Value | Target Value | Mapping |
|---------------|--------------|---------|
| `free` | `free-tier` | Rename |
| `freemium` | `freemium` | ✅ Match |
| `paid` | `paid-only` | Rename |
| `trial` | — | Remove or map to `free-tier`? |
| — | `enterprise-pricing` | Add |

---

## Taxonomy & Mapping Analysis

### Current State: NO TAXONOMY FILES EXIST

The grep for `categoryToGroup`, `groupLabels`, `categoryLabels`, or `taxonomy` returned **no results**.

### Required Taxonomy Structure (Target)

**File needed:** `src/lib/taxonomy.ts` or `src/data/taxonomy.ts`

```typescript
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

export type Group = typeof groups[number];

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

export type Category = typeof categories[number];

// ============================================
// CATEGORY TO GROUP MAPPING
// ============================================
export const categoryToGroup: Record<Category, Group> = {
  'contact-company-data': 'data-intelligence',
  'data-enrichment-hygiene': 'data-intelligence',
  'intent-signals': 'data-intelligence',
  'market-competitive-research': 'data-intelligence',
  'ai-data-agents': 'data-intelligence',
  'marketing-automation-email': 'marketing',
  'abm-demand-gen': 'marketing',
  'content-creative': 'marketing',
  'social-community': 'marketing',
  'seo-organic': 'marketing',
  'ai-marketing-tools': 'marketing',
  'crm': 'sales',
  'sales-engagement': 'sales',
  'sales-enablement': 'sales',
  'cpq-proposals': 'sales',
  'ai-sales-assistants': 'sales',
  'lead-management': 'revenue-operations',
  'pipeline-forecasting': 'revenue-operations',
  'revenue-analytics-attribution': 'revenue-operations',
  'workflow-integration': 'revenue-operations',
  'ai-revops-tools': 'revenue-operations',
  'customer-success': 'customer',
  'product-analytics-adoption': 'customer',
  'support-feedback': 'customer',
  'ai-customer-tools': 'customer',
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
  'contact-company-data': 'Contact & Company Data',
  'data-enrichment-hygiene': 'Data Enrichment & Hygiene',
  'intent-signals': 'Intent Signals',
  'market-competitive-research': 'Market & Competitive Research',
  'ai-data-agents': 'AI Data Agents',
  'marketing-automation-email': 'Marketing Automation & Email',
  'abm-demand-gen': 'ABM & Demand Gen',
  'content-creative': 'Content & Creative',
  'social-community': 'Social & Community',
  'seo-organic': 'SEO & Organic',
  'ai-marketing-tools': 'AI Marketing Tools',
  'crm': 'CRM',
  'sales-engagement': 'Sales Engagement',
  'sales-enablement': 'Sales Enablement',
  'cpq-proposals': 'CPQ & Proposals',
  'ai-sales-assistants': 'AI Sales Assistants',
  'lead-management': 'Lead Management',
  'pipeline-forecasting': 'Pipeline & Forecasting',
  'revenue-analytics-attribution': 'Revenue Analytics & Attribution',
  'workflow-integration': 'Workflow & Integration',
  'ai-revops-tools': 'AI RevOps Tools',
  'customer-success': 'Customer Success',
  'product-analytics-adoption': 'Product Analytics & Adoption',
  'support-feedback': 'Support & Feedback',
  'ai-customer-tools': 'AI Customer Tools',
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

export type AiAutomationTag = typeof aiAutomationTags[number];
export type PricingTag = typeof pricingTags[number];
export type CompanySizeTag = typeof companySizeTags[number];

// ============================================
// HELPER FUNCTIONS
// ============================================
export function getGroupForCategory(category: Category): Group {
  return categoryToGroup[category];
}

export function getGroupsForCategories(categoryList: Category[]): Group[] {
  const groups = new Set(categoryList.map(c => categoryToGroup[c]));
  return Array.from(groups);
}

export function getCategoriesForGroup(group: Group): Category[] {
  return Object.entries(categoryToGroup)
    .filter(([_, g]) => g === group)
    .map(([c, _]) => c as Category);
}
```

---

## Content Inventory

### Tool Entries

#### Content Collection (`src/content/tools/`)
**Count: 2 files**

| Tool | Category | Tags | Pricing | Issues |
|------|----------|------|---------|--------|
| Gong | "Sales Intelligence" | conversation intelligence, sales analytics, revenue operations, AI coaching | paid | Category doesn't exist in current schema |
| Vector | "Marketing Automation" | advertising, lead-generation, crm, ai, b2b-marketing | freemium | Category doesn't exist in current schema |

#### Data File (`src/data/tools.ts`)
**Count: 22 AI tools (NOT GTM)**

These are AI/ML tools (ChatGPT, Midjourney, Claude, DALL-E 3, etc.) that don't fit the GTM taxonomy.

### Sample Frontmatter: `gong.md`

```yaml
---
name: "Gong"
description: "AI-powered revenue intelligence platform..."
url: "https://www.gong.io/"
pricing: "paid"
category: "Sales Intelligence"        # Freeform, not in enum
tags: ["conversation intelligence", "sales analytics", "revenue operations", "AI coaching"]
upvotes: 0
comments: 0
views: 0
featured: false
isNew: true
hasDeal: false
isDiscontinued: false
dateAdded: "2026-01-30"
logo: "https://www.google.com/s2/favicons?domain=gong.io&sz=128"
priceNote: "$108-250/month per user, annual commitment required"
---
```

### Frontmatter Issues Identified

1. **Category mismatch:** "Sales Intelligence" and "Marketing Automation" are freeform strings not matching any defined category
2. **Missing fields:**
   - No `primaryCategory`
   - No `categories` array
   - No `aiAutomation` tags
   - No `companySize` tags
   - No `integrations`
3. **Wrong field types:**
   - `dateAdded` is string, should be date
   - `pricing` uses old enum values
4. **Extra fields not in target:**
   - `upvotes`, `comments`, `views`, `isNew`, `isVerified`, `hasDeal`, `dealDescription`, `isDiscontinued`

### Sample Frontmatter: `vector.md`

```yaml
---
url: "https://www.vector.co/"
logo: "https://www.google.com/s2/favicons?domain=vector.co&sz=128"
name: "Vector"
slug: "vector"                        # Extra field
tags: ["advertising", "lead-generation", "crm", "ai", "b2b-marketing"]
isNew: true
pricing: "freemium"
category: "Marketing Automation"
featured: false
dateAdded: "2026-01-30"
priceNote: "Free tier available..."
description: "AI-powered contact-level advertising platform..."
upvotes: 0
comments: 0
views: 0
hasDeal: false
isDiscontinued: false
---
```

---

## Routing Analysis

### Current Routes

| Route | File | Purpose |
|-------|------|---------|
| `/` | `index.astro` | Homepage |
| `/tools` | `tools/index.astro` | All tools listing |
| `/tools/[slug]` | `tools/[slug].astro` | Individual tool page |
| `/categories` | `categories/index.astro` | Category listing |
| `/categories/[slug]` | `categories/[slug].astro` | Category tools page |
| `/featured` | `featured.astro` | Featured tools |
| `/new` | `new.astro` | New tools |
| `/top` | `top.astro` | Top upvoted tools |
| `/deals` | `deals.astro` | Tools with deals |
| `/graveyard` | `graveyard.astro` | Discontinued tools |

### Missing Routes for Target Spec

| Route | Purpose | Priority |
|-------|---------|----------|
| `/groups` | Group listing | 🟡 Medium |
| `/groups/[slug]` | Group tools page | 🟡 Medium |
| `/groups/[group]/[category]` | Nested group/category | 🟢 Low (optional) |
| `/tags/[tagType]/[tagValue]` | Tag filtering | 🟢 Low (or use query params) |

### Filtering Strategy

**Current:** Client-side filtering in React components (SearchableToolsList, SortableToolsList)

**Recommendation:** Keep client-side filtering but add:
- URL query params for shareable filtered views
- Consider `/tools?category=crm&companySize=enterprise` pattern
- Group pages at `/groups/[slug]` that show all categories within

---

## Gap Analysis

### 🔴 Critical Gaps

1. **Wrong category taxonomy:** 12 AI categories vs 28 GTM categories
2. **No groups layer:** Groups don't exist, categories are flat
3. **No taxonomy mapping file:** No categoryToGroup, labels, or helpers
4. **Data sources conflict:** tools.ts has 22 AI tools, content collection has 2 GTM tools

### 🟡 Medium Gaps

1. **Schema mismatch:**
   - Missing `primaryCategory` field
   - Missing `categories` array (multi-category support)
   - Missing structured tag fields (`aiAutomation`, `companySize`, `integrations`)
   - Wrong pricing enum values

2. **Field type issues:**
   - Date fields are strings, not Date objects

3. **Missing category content files:**
   - Need 28 new category markdown files to replace 12 existing ones

### 🟢 Low Priority Gaps

1. **Field naming:** `url` vs `website` (minor, can keep `url`)
2. **Extra operational fields:** `upvotes`, `comments`, `views` etc. are useful, keep them
3. **Group-level routes:** Can be added incrementally

---

## Migration Plan

### Phase 1: Create Taxonomy Foundation

#### 1.1 Create taxonomy file

**File:** `src/lib/taxonomy.ts`

```typescript
// Groups
export const groups = [
  'data-intelligence',
  'marketing',
  'sales',
  'revenue-operations',
  'customer',
  'partnerships',
] as const;

export type Group = typeof groups[number];

// Categories (28)
export const categories = [
  'contact-company-data',
  'data-enrichment-hygiene',
  'intent-signals',
  'market-competitive-research',
  'ai-data-agents',
  'marketing-automation-email',
  'abm-demand-gen',
  'content-creative',
  'social-community',
  'seo-organic',
  'ai-marketing-tools',
  'crm',
  'sales-engagement',
  'sales-enablement',
  'cpq-proposals',
  'ai-sales-assistants',
  'lead-management',
  'pipeline-forecasting',
  'revenue-analytics-attribution',
  'workflow-integration',
  'ai-revops-tools',
  'customer-success',
  'product-analytics-adoption',
  'support-feedback',
  'ai-customer-tools',
  'partner-management',
  'affiliates-referrals',
  'ai-partnership-tools',
] as const;

export type Category = typeof categories[number];

// Category to Group mapping
export const categoryToGroup: Record<Category, Group> = {
  'contact-company-data': 'data-intelligence',
  'data-enrichment-hygiene': 'data-intelligence',
  'intent-signals': 'data-intelligence',
  'market-competitive-research': 'data-intelligence',
  'ai-data-agents': 'data-intelligence',
  'marketing-automation-email': 'marketing',
  'abm-demand-gen': 'marketing',
  'content-creative': 'marketing',
  'social-community': 'marketing',
  'seo-organic': 'marketing',
  'ai-marketing-tools': 'marketing',
  'crm': 'sales',
  'sales-engagement': 'sales',
  'sales-enablement': 'sales',
  'cpq-proposals': 'sales',
  'ai-sales-assistants': 'sales',
  'lead-management': 'revenue-operations',
  'pipeline-forecasting': 'revenue-operations',
  'revenue-analytics-attribution': 'revenue-operations',
  'workflow-integration': 'revenue-operations',
  'ai-revops-tools': 'revenue-operations',
  'customer-success': 'customer',
  'product-analytics-adoption': 'customer',
  'support-feedback': 'customer',
  'ai-customer-tools': 'customer',
  'partner-management': 'partnerships',
  'affiliates-referrals': 'partnerships',
  'ai-partnership-tools': 'partnerships',
};

// Display labels
export const groupLabels: Record<Group, string> = {
  'data-intelligence': 'Data & Intelligence',
  'marketing': 'Marketing',
  'sales': 'Sales',
  'revenue-operations': 'Revenue Operations',
  'customer': 'Customer',
  'partnerships': 'Partnerships',
};

export const categoryLabels: Record<Category, string> = {
  'contact-company-data': 'Contact & Company Data',
  'data-enrichment-hygiene': 'Data Enrichment & Hygiene',
  'intent-signals': 'Intent Signals',
  'market-competitive-research': 'Market & Competitive Research',
  'ai-data-agents': 'AI Data Agents',
  'marketing-automation-email': 'Marketing Automation & Email',
  'abm-demand-gen': 'ABM & Demand Gen',
  'content-creative': 'Content & Creative',
  'social-community': 'Social & Community',
  'seo-organic': 'SEO & Organic',
  'ai-marketing-tools': 'AI Marketing Tools',
  'crm': 'CRM',
  'sales-engagement': 'Sales Engagement',
  'sales-enablement': 'Sales Enablement',
  'cpq-proposals': 'CPQ & Proposals',
  'ai-sales-assistants': 'AI Sales Assistants',
  'lead-management': 'Lead Management',
  'pipeline-forecasting': 'Pipeline & Forecasting',
  'revenue-analytics-attribution': 'Revenue Analytics & Attribution',
  'workflow-integration': 'Workflow & Integration',
  'ai-revops-tools': 'AI RevOps Tools',
  'customer-success': 'Customer Success',
  'product-analytics-adoption': 'Product Analytics & Adoption',
  'support-feedback': 'Support & Feedback',
  'ai-customer-tools': 'AI Customer Tools',
  'partner-management': 'Partner Management',
  'affiliates-referrals': 'Affiliates & Referrals',
  'ai-partnership-tools': 'AI Partnership Tools',
};

// Tag enums
export const aiAutomationTags = ['ai-native', 'ai-enhanced', 'automation'] as const;
export const pricingTags = ['free-tier', 'freemium', 'paid-only', 'enterprise-pricing'] as const;
export const companySizeTags = ['smb', 'mid-market', 'enterprise'] as const;

// Helper functions
export function getGroupForCategory(category: Category): Group {
  return categoryToGroup[category];
}

export function getGroupsForCategories(cats: Category[]): Group[] {
  return [...new Set(cats.map(c => categoryToGroup[c]))];
}

export function getCategoriesForGroup(group: Group): Category[] {
  return (Object.entries(categoryToGroup) as [Category, Group][])
    .filter(([_, g]) => g === group)
    .map(([c]) => c);
}
```

### Phase 2: Update Schema

#### 2.1 Update `src/content/config.ts`

```typescript
import { defineCollection, z } from 'astro:content';
import { categories, aiAutomationTags, pricingTags, companySizeTags } from '../lib/taxonomy';

const toolsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // Basic Info
    name: z.string(),
    description: z.string(),
    url: z.string().url(),  // Keep as 'url' for compatibility
    logo: z.string().optional(),

    // Categorization (NEW)
    primaryCategory: z.enum(categories),
    categories: z.array(z.enum(categories)).min(1),

    // Structured Tags (NEW)
    aiAutomation: z.array(z.enum(aiAutomationTags)).default([]),
    pricingTags: z.array(z.enum(pricingTags)).default([]),
    companySize: z.array(z.enum(companySizeTags)).default([]),
    integrations: z.array(z.string()).default([]),

    // Legacy tags (keep for transition, deprecate later)
    tags: z.array(z.string()).default([]),

    // Pricing display (simplified)
    pricing: z.enum(['free', 'freemium', 'paid', 'enterprise']).optional(),
    priceNote: z.string().optional(),

    // Meta
    featured: z.boolean().default(false),
    publishedAt: z.coerce.date(),  // Coerce strings to dates
    updatedAt: z.coerce.date().optional(),

    // Operational (keep existing)
    upvotes: z.number().default(0),
    comments: z.number().default(0),
    views: z.number().default(0),
    isNew: z.boolean().default(false),
    isVerified: z.boolean().default(false),
    hasDeal: z.boolean().default(false),
    dealDescription: z.string().optional(),
    isDiscontinued: z.boolean().default(false),
  }),
});

// Categories collection - simplified, derives from taxonomy
const categoriesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    group: z.string(),  // NEW: parent group
    description: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    order: z.number().default(0),
  }),
});

// NEW: Groups collection
const groupsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    order: z.number().default(0),
  }),
});

export const collections = {
  tools: toolsCollection,
  categories: categoriesCollection,
  groups: groupsCollection,
};
```

### Phase 3: Replace Category Content Files

#### 3.1 Delete old categories

Remove all files in `src/content/categories/`

#### 3.2 Create new category files (28 total)

Example: `src/content/categories/crm.md`

```markdown
---
name: "CRM"
slug: "crm"
group: "sales"
description: "Customer relationship management platforms for managing contacts, deals, and sales pipelines."
icon: "users"
color: "#3B82F6"
order: 1
---

CRM tools help sales teams track customer interactions, manage pipelines, and close more deals.
```

#### 3.3 Create group content files (6)

Example: `src/content/groups/sales.md`

```markdown
---
name: "Sales"
slug: "sales"
description: "Tools for sales teams to prospect, engage, and close deals."
icon: "trending-up"
color: "#10B981"
order: 3
---

Sales tools including CRM, engagement platforms, enablement, and AI assistants.
```

### Phase 4: Update Tool Frontmatter

#### 4.1 Update `gong.md`

```yaml
---
name: "Gong"
description: "AI-powered revenue intelligence platform that analyzes sales conversations to improve team performance and win rates"
url: "https://www.gong.io/"
logo: "https://www.google.com/s2/favicons?domain=gong.io&sz=128"

# Categorization
primaryCategory: "sales-engagement"
categories: ["sales-engagement", "revenue-analytics-attribution", "ai-sales-assistants"]

# Structured Tags
aiAutomation: ["ai-native"]
pricingTags: ["enterprise-pricing"]
companySize: ["mid-market", "enterprise"]
integrations: ["salesforce", "hubspot", "zoom", "slack", "microsoft-teams"]

# Pricing
pricing: "enterprise"
priceNote: "$108-250/month per user, annual commitment required"

# Meta
featured: false
publishedAt: 2026-01-30
isNew: true
hasDeal: false
isDiscontinued: false

# Operational
upvotes: 0
comments: 0
views: 0
---
```

#### 4.2 Update `vector.md`

```yaml
---
name: "Vector"
description: "AI-powered contact-level advertising platform that identifies buyers and creates precise ad audiences from CRM and behavioral data."
url: "https://www.vector.co/"
logo: "https://www.google.com/s2/favicons?domain=vector.co&sz=128"

# Categorization
primaryCategory: "abm-demand-gen"
categories: ["abm-demand-gen", "intent-signals", "contact-company-data"]

# Structured Tags
aiAutomation: ["ai-enhanced"]
pricingTags: ["freemium"]
companySize: ["smb", "mid-market"]
integrations: ["hubspot", "salesforce", "linkedin", "google-ads", "meta"]

# Pricing
pricing: "freemium"
priceNote: "Free tier available with limited integrations, paid plans for advanced features"

# Meta
featured: false
publishedAt: 2026-01-30
isNew: true
hasDeal: false
isDiscontinued: false

# Operational
upvotes: 0
comments: 0
views: 0
---
```

### Phase 5: Clean Up Data Files

#### 5.1 Decision: `src/data/tools.ts`

**Options:**
1. **Delete entirely** - Only use content collection (recommended)
2. **Archive** - Move to `src/data/_archive/tools-ai.ts` for reference
3. **Convert** - Map AI tools to GTM categories (probably doesn't make sense)

**Recommendation:** Archive, then delete after confirming content collection works.

#### 5.2 Update `src/data/categories.ts`

Replace with import from taxonomy:

```typescript
import { categories, categoryLabels, categoryToGroup, groupLabels } from '../lib/taxonomy';

export { categories, categoryLabels, categoryToGroup, groupLabels };

// Generate category objects from taxonomy
export const categoryObjects = categories.map((slug, index) => ({
  slug,
  name: categoryLabels[slug],
  group: categoryToGroup[slug],
  order: index + 1,
}));
```

### Phase 6: Add Group Routes (Optional)

#### 6.1 Create `src/pages/groups/index.astro`

Lists all 6 groups with their category counts.

#### 6.2 Create `src/pages/groups/[slug].astro`

Shows all categories and tools within a group.

---

## Action Items

### Priority 1: Foundation (Do First)

- [ ] **1.1** Create `src/lib/taxonomy.ts` with all groups, categories, mappings, and labels
- [ ] **1.2** Update `src/content/config.ts` with new schema (backwards compatible where possible)
- [ ] **1.3** Verify TypeScript compiles with new taxonomy types

### Priority 2: Category Overhaul

- [ ] **2.1** Create `src/content/groups/` directory
- [ ] **2.2** Create 6 group markdown files
- [ ] **2.3** Delete old category files from `src/content/categories/`
- [ ] **2.4** Create 28 new category markdown files with correct schema

### Priority 3: Tool Content Migration

- [ ] **3.1** Update `gong.md` frontmatter to new schema
- [ ] **3.2** Update `vector.md` frontmatter to new schema
- [ ] **3.3** Create template for new tool entries with all required fields

### Priority 4: Data Cleanup

- [ ] **4.1** Archive `src/data/tools.ts` (it's AI tools, not GTM)
- [ ] **4.2** Update `src/data/categories.ts` to derive from taxonomy
- [ ] **4.3** Remove any hardcoded category references in components

### Priority 5: Component Updates

- [ ] **5.1** Update `CategoryTabs.jsx` to use new categories
- [ ] **5.2** Update `CategoryCard.jsx` to show group relationship
- [ ] **5.3** Update filtering logic for multi-category support
- [ ] **5.4** Update tool detail page to show multiple categories

### Priority 6: Routing (Can Be Deferred)

- [ ] **6.1** Create group listing page at `/groups`
- [ ] **6.2** Create group detail page at `/groups/[slug]`
- [ ] **6.3** Update category pages to show parent group context

### Priority 7: Testing & Validation

- [ ] **7.1** Build site and verify no TypeScript errors
- [ ] **7.2** Verify all category pages render
- [ ] **7.3** Verify tool pages render with new categorization
- [ ] **7.4** Verify filtering still works
- [ ] **7.5** Test tool submission form with new schema

---

## Recommendations

### Keep These Current Fields

The following fields not in the target spec are useful and should be retained:

| Field | Reason to Keep |
|-------|----------------|
| `upvotes` | Community engagement metric |
| `comments` | Community engagement metric |
| `views` | Analytics/popularity |
| `isNew` | Useful for /new page and badges |
| `isVerified` | Trust indicator |
| `hasDeal` / `dealDescription` | Monetization/deals feature |
| `isDiscontinued` | Graveyard feature |
| `priceNote` | Human-readable pricing context |
| `subcategory` | **Remove** - replaced by multi-category |

### Breaking Changes to Plan For

1. **Category pages will break** - URLs change from `/categories/chat` to `/categories/crm`
2. **Tool frontmatter validation will fail** - until all tools are updated
3. **Filtering components may break** - if they rely on old category names
4. **Data file consumers will break** - anything importing from `tools.ts`

### Suggested Migration Strategy

1. Create taxonomy file first (no breaking changes)
2. Update schema with backwards-compatible defaults
3. Create new group/category content files alongside old ones
4. Update tools one by one with new frontmatter
5. Update components to use new taxonomy
6. Delete old category files
7. Delete old data files

---

## Appendix: File Templates

### Tool Template (New Entry)

```yaml
---
name: "Tool Name"
description: "One-line description of what the tool does"
url: "https://example.com"
logo: "https://www.google.com/s2/favicons?domain=example.com&sz=128"

# Categorization
primaryCategory: "crm"
categories: ["crm"]

# Structured Tags
aiAutomation: []  # ai-native, ai-enhanced, automation
pricingTags: ["freemium"]  # free-tier, freemium, paid-only, enterprise-pricing
companySize: ["smb", "mid-market"]  # smb, mid-market, enterprise
integrations: []

# Pricing
pricing: "freemium"
priceNote: ""

# Meta
featured: false
publishedAt: 2026-01-31
isNew: true
hasDeal: false
isDiscontinued: false

# Operational
upvotes: 0
comments: 0
views: 0
---

## What is Tool Name?

Description paragraph...

## Key Features

...

## Pricing

...

## Pros & Cons

### Pros
- Pro 1
- Pro 2

### Cons
- Con 1
- Con 2

## Verdict

...
```

### Category Template

```markdown
---
name: "Category Display Name"
slug: "category-slug"
group: "parent-group-slug"
description: "Brief description of this category"
icon: "icon-name"
color: "#hexcolor"
order: 1
---

Extended description of what tools in this category do...
```

### Group Template

```markdown
---
name: "Group Display Name"
slug: "group-slug"
description: "Brief description of this group"
icon: "icon-name"
color: "#hexcolor"
order: 1
---

Extended description of this group and its categories...
```
