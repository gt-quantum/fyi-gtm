import { defineCollection, z } from 'astro:content';
import {
  categories,
  groups,
  aiAutomationTags,
  pricingTags,
  companySizeTags,
} from '../lib/taxonomy';

const toolsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // Basic Info
    name: z.string(),
    description: z.string(),
    url: z.string().url(),
    logo: z.string().optional(),

    // Categorization
    primaryCategory: z.enum(categories),
    categories: z.array(z.enum(categories)).min(1),

    // Structured Tags
    aiAutomation: z.array(z.enum(aiAutomationTags)).default([]),
    pricingTags: z.array(z.enum(pricingTags)).default([]),
    companySize: z.array(z.enum(companySizeTags)).default([]),
    integrations: z.array(z.string()).default([]),

    // Pricing display
    pricing: z.enum(['free', 'freemium', 'paid', 'enterprise']).optional(),
    priceNote: z.string().optional(),

    // Meta
    featured: z.boolean().default(false),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),

    // Operational
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

const categoriesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    group: z.enum(groups),
    description: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    order: z.number().default(0),
  }),
});

const groupsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
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
