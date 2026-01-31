// Re-export taxonomy for backwards compatibility
export {
  categories,
  groups,
  categoryLabels,
  groupLabels,
  categoryToGroup,
  getGroupForCategory,
  getToolGroups,
  getCategoriesForGroup,
  getCategoryLabel,
  getGroupLabel,
  aiAutomationTags,
  pricingTags,
  companySizeTags,
} from '../lib/taxonomy';

export type {
  Category,
  Group,
  AiAutomationTag,
  PricingTag,
  CompanySizeTag,
} from '../lib/taxonomy';

import {
  categories,
  categoryLabels,
  categoryToGroup,
  type Category,
  type Group,
} from '../lib/taxonomy';

// Legacy interface for backwards compatibility
export interface CategoryObject {
  slug: Category;
  name: string;
  group: Group;
  order: number;
}

// Generate category objects from taxonomy
export const categoryObjects: CategoryObject[] = categories.map((slug, index) => ({
  slug,
  name: categoryLabels[slug],
  group: categoryToGroup[slug],
  order: index + 1,
}));
