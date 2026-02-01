import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NewsletterListItem from './NewsletterListItem';

export default function NewsletterList() {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  async function fetchNewsletters(page = 1) {
    try {
      setLoading(true);
      const response = await fetch(`/api/newsletter/runs?page=${page}`);
      if (!response.ok) {
        throw new Error('Failed to fetch newsletters');
      }
      const data = await response.json();
      setNewsletters(data.newsletters);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNewsletters(1);
  }, []);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= (pagination?.totalPages || 1)) {
      fetchNewsletters(page);
      // Scroll to top of list
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    if (!pagination) return [];
    const { totalPages } = pagination;
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);

      // Calculate middle pages
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if at the beginning
      if (currentPage <= 2) {
        end = 4;
      }
      // Adjust if at the end
      if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }

      // Add ellipsis if needed
      if (start > 2) pages.push('...');

      // Add middle pages
      for (let i = start; i <= end; i++) pages.push(i);

      // Add ellipsis if needed
      if (end < totalPages - 1) pages.push('...');

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (loading && newsletters.length === 0) {
    return (
      <div className="newsletter-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading newsletters...</p>

        <style jsx>{`
          .newsletter-list-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 48px 24px;
            color: var(--color-text-muted);
          }

          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 2px solid var(--color-border);
            border-top-color: var(--color-primary);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 16px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="newsletter-list-error">
        <p>Error loading newsletters: {error}</p>

        <style jsx>{`
          .newsletter-list-error {
            padding: 48px 24px;
            text-align: center;
            color: var(--color-text-muted);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="newsletter-list">
      {/* Results header */}
      <div className="results-header">
        <div className="results-info">
          <span className="results-count">{pagination?.total || newsletters.length}</span>
          <span className="results-label">
            {(pagination?.total || newsletters.length) === 1 ? 'newsletter' : 'newsletters'}
          </span>
        </div>
      </div>

      {/* Newsletter List */}
      <div className={`newsletters-container ${loading ? 'loading' : ''}`}>
        <AnimatePresence mode="popLayout">
          {newsletters.length > 0 ? (
            newsletters.map((newsletter, index) => (
              <motion.div
                key={newsletter.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
              >
                <NewsletterListItem newsletter={newsletter} index={index} />
              </motion.div>
            ))
          ) : (
            <motion.div
              className="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="no-results-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h3>No newsletters yet</h3>
              <p>Published newsletters will appear here.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn pagination-arrow"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
            ) : (
              <button
                key={page}
                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            )
          ))}

          <button
            className="pagination-btn pagination-arrow"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.totalPages}
            aria-label="Next page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      <style jsx>{`
        .newsletter-list {
          width: 100%;
          margin: 0;
          padding: 0;
        }

        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 0 16px 0;
          padding: 0 0 12px 0;
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

        .newsletters-container {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: var(--color-border);
          border: 1px solid var(--color-border);
          transition: opacity 0.2s;
        }

        .newsletters-container.loading {
          opacity: 0.6;
        }

        .no-results {
          padding: 48px 24px;
          text-align: center;
          background: var(--color-background);
        }

        .no-results-icon {
          color: var(--color-text-muted);
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
          margin: 0;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 4px;
          margin-top: 24px;
        }

        .pagination-btn {
          min-width: 36px;
          height: 36px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-background-secondary);
          border: 1px solid var(--color-border);
          border-radius: 0;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pagination-btn:hover:not(:disabled):not(.active) {
          background: var(--color-background-tertiary);
          border-color: var(--color-border-hover);
        }

        .pagination-btn.active {
          background: var(--color-text);
          border-color: var(--color-text);
          color: var(--color-background);
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-arrow {
          padding: 0 8px;
        }

        .pagination-ellipsis {
          min-width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          font-size: 14px;
        }

        @media (max-width: 480px) {
          .pagination-btn {
            min-width: 32px;
            height: 32px;
            padding: 0 8px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
