import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GroupCategoryFilter, { GROUPS, CATEGORIES } from './GroupCategoryFilter';
import ToolListItem from './ToolListItem';

export default function FilterableToolsList({ tools, defaultSort = 'newest' }) {
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [sortBy, setSortBy] = useState(defaultSort);
  const [searchQuery, setSearchQuery] = useState('');

  // Listen for search input from the page
  useEffect(() => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      const handleInput = (e) => setSearchQuery(e.target.value.toLowerCase());
      searchInput.addEventListener('input', handleInput);
      return () => searchInput.removeEventListener('input', handleInput);
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = (group, category) => {
    setActiveGroup(group);
    setActiveCategory(category);
  };

  // Filter and sort tools
  const filteredTools = useMemo(() => {
    let result = [...tools];

    // Filter by search query
    if (searchQuery) {
      result = result.filter(tool => {
        const searchFields = [
          tool.name,
          tool.description,
          tool.primaryCategory,
          ...(tool.categories || []),
          ...(tool.integrations || []),
        ].filter(Boolean).join(' ').toLowerCase();
        return searchFields.includes(searchQuery);
      });
    }

    // Filter by group
    if (activeGroup) {
      const groupCats = CATEGORIES.filter(c => c.group === activeGroup).map(c => c.value);
      result = result.filter(tool =>
        tool.categories?.some(tc => groupCats.includes(tc)) || groupCats.includes(tool.primaryCategory)
      );
    }

    // Filter by category
    if (activeCategory) {
      result = result.filter(tool =>
        tool.categories?.includes(activeCategory) || tool.primaryCategory === activeCategory
      );
    }

    // Sort
    switch (sortBy) {
      case 'upvotes':
        result.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        break;
      case 'alphabetical':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
      default:
        result.sort((a, b) => {
          const dateA = a.publishedAt || a.dateAdded || '1970-01-01';
          const dateB = b.publishedAt || b.dateAdded || '1970-01-01';
          return new Date(dateB) - new Date(dateA);
        });
        break;
    }

    return result;
  }, [tools, activeGroup, activeCategory, sortBy, searchQuery]);

  // Get current filter label for display
  const filterLabel = useMemo(() => {
    if (activeCategory) {
      const cat = CATEGORIES.find(c => c.value === activeCategory);
      return cat?.label || activeCategory;
    }
    if (activeGroup) {
      const group = GROUPS.find(g => g.value === activeGroup);
      return group?.label || activeGroup;
    }
    return 'All Tools';
  }, [activeGroup, activeCategory]);

  return (
    <div className="filterable-tools-list">
      {/* Group/Category Filter */}
      <GroupCategoryFilter
        tools={tools}
        onFilterChange={handleFilterChange}
        initialGroup={activeGroup}
        initialCategory={activeCategory}
      />

      {/* Results header with sort */}
      <div className="results-header">
        <div className="results-info">
          <span className="results-count">{filteredTools.length}</span>
          <span className="results-label">
            {filteredTools.length === 1 ? 'tool' : 'tools'}
            {(activeGroup || searchQuery) && (
              <span className="results-filter"> in {filterLabel}</span>
            )}
          </span>
        </div>

        <div className="sort-options">
          <button
            className={`sort-btn ${sortBy === 'newest' ? 'active' : ''}`}
            onClick={() => setSortBy('newest')}
          >
            Newest
          </button>
          <button
            className={`sort-btn ${sortBy === 'upvotes' ? 'active' : ''}`}
            onClick={() => setSortBy('upvotes')}
          >
            Most Upvoted
          </button>
          <button
            className={`sort-btn ${sortBy === 'alphabetical' ? 'active' : ''}`}
            onClick={() => setSortBy('alphabetical')}
          >
            A-Z
          </button>
        </div>
      </div>

      {/* Tools List */}
      <div className="tools-list">
        <AnimatePresence mode="popLayout">
          {filteredTools.length > 0 ? (
            filteredTools.map((tool, index) => (
              <motion.div
                key={tool.slug}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
              >
                <ToolListItem tool={tool} />
              </motion.div>
            ))
          ) : (
            <motion.div
              className="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="no-results-icon">🔍</div>
              <h3>No tools found</h3>
              <p>
                {searchQuery
                  ? `No tools match "${searchQuery}" in this category.`
                  : 'No tools in this category yet.'}
              </p>
              {(activeGroup || activeCategory) && (
                <button
                  className="clear-filters-btn"
                  onClick={() => {
                    setActiveGroup(null);
                    setActiveCategory(null);
                    handleFilterChange(null, null);
                  }}
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .filterable-tools-list {
          width: 100%;
        }

        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--color-border);
        }

        .results-info {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .results-count {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .results-label {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .results-filter {
          color: var(--color-text-muted);
        }

        .sort-options {
          display: flex;
          gap: 4px;
        }

        .sort-btn {
          padding: 6px 12px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .sort-btn:hover {
          color: var(--color-text);
          background: var(--color-background-secondary);
        }

        .sort-btn.active {
          color: var(--color-text);
          background: var(--color-background-secondary);
          border-color: var(--color-border);
        }

        .tools-list {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: var(--color-border);
          border: 1px solid var(--color-border);
        }

        .no-results {
          padding: 48px 24px;
          text-align: center;
          background: var(--color-background);
        }

        .no-results-icon {
          font-size: 2rem;
          margin-bottom: 12px;
        }

        .no-results h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 8px;
        }

        .no-results p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0 0 16px;
        }

        .clear-filters-btn {
          padding: 8px 16px;
          background: var(--color-background-secondary);
          border: 1px solid var(--color-border);
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .clear-filters-btn:hover {
          background: var(--color-background-tertiary);
          border-color: var(--color-border-hover);
        }

        @media (max-width: 640px) {
          .results-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .sort-options {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
