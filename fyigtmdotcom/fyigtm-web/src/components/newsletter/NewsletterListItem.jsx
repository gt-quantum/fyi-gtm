import { motion } from 'framer-motion';

export default function NewsletterListItem({ newsletter, index = 0 }) {
  // Format the date
  const formattedDate = new Date(newsletter.run_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Use title from API (already built from issue_number + topic)
  const title = newsletter.title || 'Newsletter';

  // Create a preview of the content (strip markdown, limit to ~150 chars)
  const contentPreview = newsletter.newsletter_content
    ? newsletter.newsletter_content
        .replace(/#{1,6}\s/g, '') // Remove headers
        .replace(/\*\*/g, '') // Remove bold
        .replace(/\*/g, '') // Remove italic
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .trim()
        .substring(0, 150) + (newsletter.newsletter_content.length > 150 ? '...' : '')
    : '';

  const handleRowClick = () => {
    window.location.href = `/newsletter/${newsletter.id}`;
  };

  return (
    <motion.div
      className="newsletter-list-item"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      onClick={handleRowClick}
    >
      <div className="newsletter-content">
        <div className="newsletter-header">
          <h3 className="newsletter-title">{title}</h3>
          <span className="newsletter-date">{formattedDate}</span>
        </div>
        {contentPreview && (
          <p className="newsletter-preview">{contentPreview}</p>
        )}
      </div>

      <div className="newsletter-arrow">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>

      <style jsx>{`
        .newsletter-list-item {
          background: var(--color-card-bg);
          border: 1px solid var(--color-card-border);
          border-radius: 0;
          padding: 16px 20px;
          transition: all 0.2s ease;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .newsletter-list-item:hover {
          border-color: rgba(99, 102, 241, 0.3);
          background: var(--color-card-bg-hover);
        }

        .newsletter-content {
          flex: 1;
          min-width: 0;
        }

        .newsletter-header {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .newsletter-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
          transition: color 0.2s;
        }

        .newsletter-list-item:hover .newsletter-title {
          color: var(--color-primary);
        }

        .newsletter-date {
          font-size: 13px;
          color: var(--color-text-muted);
        }

        .newsletter-preview {
          font-size: 13px;
          color: var(--color-text-muted);
          margin: 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .newsletter-arrow {
          flex-shrink: 0;
          color: var(--color-text-muted);
          opacity: 0;
          transition: all 0.2s;
        }

        .newsletter-list-item:hover .newsletter-arrow {
          opacity: 1;
          color: var(--color-primary);
        }

        @media (max-width: 600px) {
          .newsletter-list-item {
            padding: 14px;
          }

          .newsletter-header {
            flex-direction: column;
            gap: 4px;
          }

          .newsletter-title {
            font-size: 14px;
          }

          .newsletter-date {
            font-size: 12px;
          }

          .newsletter-preview {
            font-size: 12px;
          }
        }
      `}</style>
    </motion.div>
  );
}
