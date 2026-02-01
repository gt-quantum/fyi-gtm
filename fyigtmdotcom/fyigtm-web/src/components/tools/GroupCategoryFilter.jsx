import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Taxonomy - must match src/lib/taxonomy.ts
const GROUPS = [
  { value: 'data-intelligence', label: 'Data & Intelligence', color: '#8B5CF6' },
  { value: 'marketing', label: 'Marketing', color: '#EC4899' },
  { value: 'sales', label: 'Sales', color: '#3B82F6' },
  { value: 'revenue-operations', label: 'Revenue Operations', color: '#F59E0B' },
  { value: 'customer', label: 'Customer', color: '#10B981' },
  { value: 'partnerships', label: 'Partnerships', color: '#6366F1' },
];

const CATEGORIES = [
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

export default function GroupCategoryFilter({ tools, onFilterChange, initialGroup = null, initialCategory = null }) {
  const [activeGroup, setActiveGroup] = useState(initialGroup);
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  // Get categories for the active group
  const groupCategories = useMemo(() => {
    if (!activeGroup) return [];
    return CATEGORIES.filter(c => c.group === activeGroup);
  }, [activeGroup]);

  // Calculate tool counts for groups and categories
  const groupCounts = useMemo(() => {
    const counts = {};
    GROUPS.forEach(g => {
      const groupCats = CATEGORIES.filter(c => c.group === g.value).map(c => c.value);
      counts[g.value] = tools.filter(t =>
        t.categories?.some(tc => groupCats.includes(tc)) || groupCats.includes(t.primaryCategory)
      ).length;
    });
    return counts;
  }, [tools]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    CATEGORIES.forEach(c => {
      counts[c.value] = tools.filter(t =>
        t.categories?.includes(c.value) || t.primaryCategory === c.value
      ).length;
    });
    return counts;
  }, [tools]);

  // Handle group selection
  const handleGroupClick = (groupValue) => {
    if (activeGroup === groupValue) {
      // Clicking same group again clears it
      setActiveGroup(null);
      setActiveCategory(null);
      onFilterChange?.(null, null);
    } else {
      setActiveGroup(groupValue);
      setActiveCategory(null);
      onFilterChange?.(groupValue, null);
    }
  };

  // Handle category selection
  const handleCategoryClick = (categoryValue) => {
    if (activeCategory === categoryValue) {
      // Clicking same category shows all in group
      setActiveCategory(null);
      onFilterChange?.(activeGroup, null);
    } else {
      setActiveCategory(categoryValue);
      onFilterChange?.(activeGroup, categoryValue);
    }
  };

  return (
    <div className="group-category-filter">
      {/* Group Pills */}
      <div className="group-tabs">
        <button
          className={`group-tab ${!activeGroup ? 'active' : ''}`}
          onClick={() => {
            setActiveGroup(null);
            setActiveCategory(null);
            onFilterChange?.(null, null);
          }}
        >
          All
          <span className="tab-count">{tools.length}</span>
        </button>
        {GROUPS.map((group) => (
          <button
            key={group.value}
            className={`group-tab ${activeGroup === group.value ? 'active' : ''}`}
            onClick={() => handleGroupClick(group.value)}
            style={{ '--group-color': group.color }}
          >
            <span className="group-dot" />
            {group.label}
            <span className="tab-count">{groupCounts[group.value] || 0}</span>
          </button>
        ))}
      </div>

      {/* Category Pills - shown when a group is selected */}
      <AnimatePresence>
        {activeGroup && groupCategories.length > 0 && (
          <motion.div
            className="category-tabs"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ '--group-color': GROUPS.find(g => g.value === activeGroup)?.color }}
          >
            <button
              className={`category-tab ${!activeCategory ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(null);
                onFilterChange?.(activeGroup, null);
              }}
            >
              All {GROUPS.find(g => g.value === activeGroup)?.label}
            </button>
            {groupCategories.map((category) => (
              <button
                key={category.value}
                className={`category-tab ${activeCategory === category.value ? 'active' : ''}`}
                onClick={() => handleCategoryClick(category.value)}
              >
                {category.label}
                <span className="tab-count">{categoryCounts[category.value] || 0}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .group-category-filter {
          margin: 0 0 24px 0;
          padding: 0;
          width: 100%;
        }

        .group-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 0 0 12px 0;
          padding: 0;
        }

        .group-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: var(--color-background-secondary);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .group-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--group-color);
          flex-shrink: 0;
        }

        .group-tab:hover {
          background: var(--color-background-tertiary);
          border-color: var(--group-color);
          color: var(--color-text);
        }

        .group-tab.active {
          background: var(--group-color);
          border-color: var(--group-color);
          color: white;
        }

        .group-tab.active .group-dot {
          background: white;
        }

        .group-tab.active .tab-count {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .tab-count {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          background: var(--color-background-tertiary);
          border-radius: 10px;
          color: var(--color-text-muted);
        }

        .category-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 12px;
          background: var(--color-background-secondary);
          border: 1px solid var(--color-border);
          border-left: 3px solid var(--group-color);
          border-radius: 8px;
          overflow: hidden;
        }

        .category-tab {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .category-tab:hover {
          border-color: var(--group-color);
          color: var(--color-text);
        }

        .category-tab.active {
          background: var(--group-color);
          border-color: var(--group-color);
          color: white;
        }

        .category-tab.active .tab-count {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .category-tab .tab-count {
          font-size: 10px;
          padding: 1px 5px;
        }

        @media (max-width: 768px) {
          .group-tabs {
            gap: 6px;
          }

          .group-tab {
            padding: 6px 10px;
            font-size: 12px;
          }

          .category-tabs {
            padding: 10px;
          }

          .category-tab {
            padding: 5px 10px;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}

// Export constants for use elsewhere
export { GROUPS, CATEGORIES };
