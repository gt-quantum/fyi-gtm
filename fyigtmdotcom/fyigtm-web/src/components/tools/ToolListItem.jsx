import { motion } from 'framer-motion';
import UpvoteButton from './UpvoteButton';

export default function ToolListItem({ tool, index = 0 }) {
  const pricingLabels = {
    free: { label: 'Free', color: '#10B981' },
    freemium: { label: 'Freemium', color: '#3B82F6' },
    paid: { label: 'Paid', color: '#8B5CF6' },
    trial: { label: 'Trial', color: '#F59E0B' },
  };

  const pricing = pricingLabels[tool.pricing] || pricingLabels.freemium;

  const handleRowClick = (e) => {
    // Don't navigate if clicking on interactive elements
    if (e.target.closest('.upvote-button') || e.target.closest('.visit-link') || e.target.closest('.category-link')) {
      return;
    }
    window.location.href = `/tools/${tool.slug}`;
  };

  return (
    <motion.div
      className="tool-list-item"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      onClick={handleRowClick}
    >
      <div className="tool-list-item-inner">
        <div className="tool-content-left">
          {/* Tool Icon */}
          <div className="tool-icon-wrapper">
            {tool.logo ? (
              <img src={tool.logo} alt={`${tool.name} Logo`} className="tool-icon" loading="lazy" />
            ) : (
              <div className="tool-icon-placeholder">
                {tool.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Tool Content */}
          <div className="tool-content">
            <div className="tool-headline">
              <span className="tool-name">
                {tool.name}
              </span>
              {tool.isVerified && (
                <span className="verified-badge" title="Verified">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M4.252 14H4a2 2 0 1 1 0-4h.252c.189-.734.48-1.427.856-2.064l-.18-.179a2 2 0 1 1 2.83-2.828l.178.179A7.952 7.952 0 0 1 10 4.252V4a2 2 0 1 1 4 0v.252c.734.189 1.427.48 2.064.856l.179-.18a2 2 0 1 1 2.828 2.83l-.179.178c.377.637.667 1.33.856 2.064H20a2 2 0 1 1 0 4h-.252a7.952 7.952 0 0 1-.856 2.064l.18.179a2 2 0 1 1-2.83 2.828l-.178-.179a7.952 7.952 0 0 1-2.064.856V20a2 2 0 1 1-4 0v-.252a7.952 7.952 0 0 1-2.064-.856l-.179.18a2 2 0 1 1-2.828-2.83l.179-.178A7.952 7.952 0 0 1 4.252 14ZM9 10l-2 2l4 4l6-6l-2-2l-4 4l-2-2Z" />
                  </svg>
                </span>
              )}
              <a href={tool.url} target="_blank" rel="noopener noreferrer" className="visit-link" title="Visit website" onClick={(e) => e.stopPropagation()}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M6 8h5v2H6v8h8v-5h2v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Zm10.614-2H12V4h8v8h-2V7.442l-5.336 5.336l-1.414-1.414L16.614 6Z" />
                </svg>
              </a>
            </div>
            <p className="tool-description">{tool.description}</p>
            <div className="tool-categories">
              <span className="pricing-tag" style={{ color: pricing.color }}>
                {pricing.label}
              </span>
              <a href={`/categories/${tool.category.toLowerCase().replace(/\s+/g, '-')}`} className="category-link" onClick={(e) => e.stopPropagation()}>
                {tool.category}
              </a>
              {tool.tags?.slice(0, 2).map((tag, i) => (
                <span key={i} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Upvote Count */}
        <div className="upvote-wrapper">
          <UpvoteButton slug={tool.slug} initialUpvotes={tool.upvotes || 0} variant="list" />
        </div>
      </div>

      <style jsx>{`
        .tool-list-item {
          background: var(--color-card-bg);
          border: 1px solid var(--color-card-border);
          border-radius: 12px;
          padding: 16px 20px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .tool-list-item:hover {
          border-color: rgba(99, 102, 241, 0.3);
          background: var(--color-card-bg-hover);
        }

        .tool-list-item-inner {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .tool-content-left {
          display: flex;
          gap: 14px;
          flex: 1;
          min-width: 0;
        }

        .tool-icon-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          overflow: hidden;
          flex-shrink: 0;
          background: var(--color-background-secondary);
          display: block;
        }

        .tool-icon {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .tool-icon-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary);
          color: white;
          font-size: 22px;
          font-weight: 700;
        }

        .tool-content {
          flex: 1;
          min-width: 0;
        }

        .tool-headline {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }

        .tool-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--color-text);
          transition: color 0.2s;
        }

        .tool-list-item:hover .tool-name {
          color: var(--color-primary);
        }

        .verified-badge {
          color: var(--color-primary);
          display: flex;
          align-items: center;
        }

        .visit-link {
          opacity: 0;
          color: var(--color-text-muted);
          transition: all 0.2s;
          display: flex;
          align-items: center;
        }

        .tool-list-item:hover .visit-link {
          opacity: 1;
        }

        .visit-link:hover {
          color: var(--color-primary);
        }

        .tool-description {
          font-size: 13px;
          color: var(--color-text-muted);
          margin: 0 0 8px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .tool-categories {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .pricing-tag {
          font-size: 12px;
          font-weight: 500;
        }

        .category-link {
          font-size: 12px;
          color: var(--color-text-muted);
          text-decoration: none;
          transition: color 0.2s;
        }

        .category-link:hover {
          color: var(--color-primary);
        }

        .tag {
          font-size: 12px;
          color: var(--color-text-muted);
        }

        .upvote-wrapper {
          flex-shrink: 0;
        }

        .upvote-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 10px 14px;
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 54px;
        }

        .upvote-button:not(.voted):hover {
          background: var(--color-text);
          border-color: var(--color-text);
        }

        .upvote-button:not(.voted):hover .upvote-arrow,
        .upvote-button:not(.voted):hover .upvote-count {
          color: var(--color-background);
        }

        .upvote-arrow {
          color: var(--color-text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .upvote-count {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text);
          transition: color 0.2s;
        }

        @media (max-width: 600px) {
          .tool-list-item {
            padding: 14px;
          }

          .tool-icon-wrapper {
            width: 44px;
            height: 44px;
          }

          .tool-name {
            font-size: 14px;
          }

          .tool-description {
            font-size: 12px;
            -webkit-line-clamp: 2;
          }

          .upvote-button {
            padding: 8px 10px;
            min-width: 46px;
          }

          .upvote-count {
            font-size: 12px;
          }
        }
      `}</style>
    </motion.div>
  );
}
