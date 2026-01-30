import { useState, useEffect, useMemo } from 'react';
import ToolListItem from './ToolListItem';

export default function SearchableToolsList({ tools: initialTools, defaultSort = 'upvotes' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSort, setActiveSort] = useState(defaultSort);

  // Filter tools based on search query
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return initialTools;

    const query = searchQuery.toLowerCase();
    return initialTools.filter(tool =>
      tool.name.toLowerCase().includes(query) ||
      tool.description?.toLowerCase().includes(query) ||
      tool.category?.toLowerCase().includes(query) ||
      tool.subcategory?.toLowerCase().includes(query) ||
      tool.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [initialTools, searchQuery]);

  // Sort filtered tools
  const sortedTools = useMemo(() => {
    let sorted;
    switch (activeSort) {
      case 'upvotes':
        sorted = [...filteredTools].sort((a, b) => b.upvotes - a.upvotes);
        break;
      case 'alphabetical':
        sorted = [...filteredTools].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        sorted = [...filteredTools].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        break;
      default:
        sorted = filteredTools;
    }
    return sorted;
  }, [filteredTools, activeSort]);

  // Check URL for sort param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sortParam = params.get('sort');
    if (sortParam && ['upvotes', 'alphabetical', 'newest'].includes(sortParam)) {
      setActiveSort(sortParam);
    }
  }, []);

  // Listen to search input from Astro
  useEffect(() => {
    // Small delay to ensure DOM is fully ready after hydration
    const timer = setTimeout(() => {
      const searchInput = document.getElementById('search-input');
      if (!searchInput) {
        console.warn('Search input not found');
        return;
      }

      const handleInput = (e) => {
        setSearchQuery(e.target.value);
      };

      searchInput.addEventListener('input', handleInput);

      // Sync initial value if user typed before React hydration
      if (searchInput.value) {
        setSearchQuery(searchInput.value);
      }

      // Store cleanup function
      searchInput._cleanup = () => searchInput.removeEventListener('input', handleInput);
    }, 0);

    return () => {
      clearTimeout(timer);
      const searchInput = document.getElementById('search-input');
      if (searchInput?._cleanup) searchInput._cleanup();
    };
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSort = (sortType) => {
    setActiveSort(sortType);

    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('sort', sortType);
    window.history.replaceState({}, '', url);
  };

  return (
    <div className="searchable-tools">
      <div className="sort-options">
        <span className="sort-label">Sort by:</span>
        <div className="sort-buttons">
          <button
            className={`sort-btn ${activeSort === 'upvotes' ? 'active' : ''}`}
            onClick={() => handleSort('upvotes')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" width="12" height="12">
              <path d="M236.78 211.81A24.34 24.34 0 0 1 215.45 224H40.55a24.34 24.34 0 0 1-21.33-12.19a23.51 23.51 0 0 1 0-23.72l87.43-151.87a24.76 24.76 0 0 1 42.7 0l87.45 151.87a23.51 23.51 0 0 1-.02 23.72Z" />
            </svg>
            Most Upvotes
          </button>
          <button
            className={`sort-btn ${activeSort === 'alphabetical' ? 'active' : ''}`}
            onClick={() => handleSort('alphabetical')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
              <path d="M3 6h18M3 12h12M3 18h6" />
            </svg>
            A-Z
          </button>
          <button
            className={`sort-btn ${activeSort === 'newest' ? 'active' : ''}`}
            onClick={() => handleSort('newest')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Newest
          </button>
        </div>
      </div>

      {sortedTools.length > 0 ? (
        <div className="tools-list">
          {sortedTools.map((tool, index) => (
            <ToolListItem key={tool.slug} tool={tool} index={index} />
          ))}
        </div>
      ) : (
        <div className="no-results">
          <p className="no-results-title">No tools found</p>
          <p className="no-results-text">
            Try a different search term or browse all tools by clearing the search.
          </p>
        </div>
      )}

      <style jsx>{`
        .searchable-tools {
          width: 100%;
        }

        .sort-options {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--color-border);
        }

        .sort-label {
          font-size: 13px;
          color: var(--color-text-muted);
          font-weight: 500;
        }

        .sort-buttons {
          display: flex;
          gap: 8px;
        }

        .sort-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: 0;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .sort-btn:hover {
          color: var(--color-text);
          border-color: var(--color-text-muted);
        }

        .sort-btn.active {
          color: var(--color-primary);
          border-color: var(--color-primary);
          background: rgba(62, 52, 211, 0.1);
        }

        .tools-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .no-results {
          text-align: center;
          padding: 48px 24px;
          background: var(--color-background-secondary);
          border: 1px solid var(--color-border);
          border-radius: 0;
        }

        .no-results-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 8px;
        }

        .no-results-text {
          font-size: 14px;
          color: var(--color-text-muted);
          margin: 0;
        }

        @media (max-width: 600px) {
          .sort-options {
            flex-wrap: wrap;
          }

          .sort-buttons {
            flex-wrap: wrap;
          }

          .sort-btn {
            padding: 5px 10px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
