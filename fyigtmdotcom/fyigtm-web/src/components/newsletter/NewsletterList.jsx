import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NewsletterListItem from './NewsletterListItem';

export default function NewsletterList() {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  async function fetchNewsletters(page = 1, append = false) {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`/api/newsletter/runs?page=${page}`);
      if (!response.ok) {
        throw new Error('Failed to fetch newsletters');
      }
      const data = await response.json();

      if (append) {
        setNewsletters(prev => [...prev, ...data.newsletters]);
      } else {
        setNewsletters(data.newsletters);
      }
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchNewsletters();
  }, []);

  const handleLoadMore = () => {
    if (pagination?.hasMore && !loadingMore) {
      fetchNewsletters(pagination.page + 1, true);
    }
  };

  if (loading) {
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
      <div className="newsletters-container">
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

      {/* Load More Button */}
      {pagination?.hasMore && (
        <div className="load-more-wrapper">
          <button
            className="load-more-btn"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
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

        .load-more-wrapper {
          display: flex;
          justify-content: center;
          margin-top: 24px;
        }

        .load-more-btn {
          padding: 12px 32px;
          background: var(--color-background-secondary);
          border: 1px solid var(--color-border);
          border-radius: 0;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .load-more-btn:hover:not(:disabled) {
          background: var(--color-text);
          border-color: var(--color-text);
          color: var(--color-background);
        }

        .load-more-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
