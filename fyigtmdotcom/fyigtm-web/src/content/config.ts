import { defineCollection, z } from 'astro:content';

const toolsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string(),
    url: z.string().url(),
    logo: z.string().optional(),
    pricing: z.enum(['free', 'freemium', 'paid', 'trial']),
    priceNote: z.string().optional(),
    category: z.string(),
    subcategory: z.string().optional(),
    tags: z.array(z.string()),
    upvotes: z.number(),
    comments: z.number(),
    views: z.number(),
    featured: z.boolean(),
    isNew: z.boolean(),
    isVerified: z.boolean().optional(),
    hasDeal: z.boolean(),
    dealDescription: z.string().optional(),
    isDiscontinued: z.boolean(),
    dateAdded: z.string(),
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

export const collections = {
  tools: toolsCollection,
  categories: categoriesCollection,
};
