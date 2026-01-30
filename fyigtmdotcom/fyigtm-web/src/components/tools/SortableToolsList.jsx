import { useState, useEffect } from 'react';
import ToolListItem from './ToolListItem';

export default function SortableToolsList({ tools: initialTools, defaultSort = 'upvotes' }) {
  const [activeSort, setActiveSort] = useState(defaultSort);
  const [tools, setTools] = useState(initialTools);

  useEffect(() => {
    // Check URL for sort param on mount
    const params = new URLSearchParams(window.location.search);
    const sortParam = params.get('sort');
    if (sortParam && ['upvotes', 'alphabetical', 'newest'].includes(sortParam)) {
      setActiveSort(sortParam);
      sortTools(sortParam, initialTools);
    } else {
      sortTools(defaultSort, initialTools);
    }
  }, []);

  const sortTools = (sortType, toolsToSort) => {
    let sorted;
    switch (sortType) {
      case 'upvotes':
        sorted = [...toolsToSort].sort((a, b) => b.upvotes - a.upvotes);
        break;
      case 'alphabetical':
        sorted = [...toolsToSort].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        sorted = [...toolsToSort].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        break;
      default:
        sorted = toolsToSort;
    }
    setTools(sorted);
  };

  const handleSort = (sortType) => {
    setActiveSort(sortType);

    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('sort', sortType);
    window.history.replaceState({}, '', url);

    sortTools(sortType, initialTools);
  };

  return (
    <div className="sortable-tools">
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

      <div className="tools-list">
        {tools.map((tool, index) => (
          <ToolListItem key={tool.slug} tool={tool} index={index} />
        ))}
      </div>

      <style jsx>{`
        .sortable-tools {
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
          border-radius: 6px;
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
