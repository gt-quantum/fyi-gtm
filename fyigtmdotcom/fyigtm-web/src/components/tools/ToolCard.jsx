import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import UpvoteButton from './UpvoteButton';

// Grayscale pricing indicators
const pricingStyles = {
  free: { bg: 'var(--color-text)', text: 'var(--color-background)' },
  freemium: { bg: 'var(--color-text-muted)', text: 'var(--color-background)' },
  paid: { bg: 'var(--color-text-light)', text: 'var(--color-background)' },
  trial: { bg: 'var(--color-border)', text: 'var(--color-text)' },
};

const ToolCard = ({
  tool,
  index = 0,
  showDescription = true,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.getAttribute('data-theme') === 'dark');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const pricing = pricingStyles[tool.pricing] || pricingStyles.free;

  return (
    <motion.a
      href={`/tools/${tool.slug}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        delay: index * 0.05,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.card,
        backgroundColor: isHovered ? 'var(--color-card-bg-hover)' : 'var(--color-card-bg)',
        borderColor: isHovered ? 'var(--color-border-hover)' : 'var(--color-card-border)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div style={styles.cardHeader}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          {tool.logo ? (
            <img src={tool.logo} alt={tool.name} style={styles.logo} />
          ) : (
            <div style={styles.logoPlaceholder}>
              {tool.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Upvote Button */}
        <div style={styles.upvoteContainer}>
          <UpvoteButton slug={tool.slug} initialUpvotes={tool.upvotes} variant="card" />
        </div>
      </div>

      <div style={styles.cardContent}>
        {/* Title and badges */}
        <div style={styles.titleRow}>
          <h3 style={styles.title}>{tool.name}</h3>
          {tool.isNew && <span style={styles.newBadge}>NEW</span>}
          {tool.hasDeal && <span style={styles.dealBadge}>DEAL</span>}
        </div>

        {/* Description */}
        {showDescription && (
          <p style={styles.description}>{tool.description}</p>
        )}

        {/* Tags */}
        <div style={styles.tagsRow}>
          {/* Pricing Tag */}
          <span style={{
            ...styles.tag,
            backgroundColor: pricing.bg,
            color: pricing.text,
          }}>
            {tool.pricing.charAt(0).toUpperCase() + tool.pricing.slice(1)}
          </span>

          {/* Category Tag */}
          <span style={styles.categoryTag}>
            {tool.category}
          </span>
        </div>

        {/* Footer with metrics */}
        <div style={styles.footer}>
          <div style={styles.metrics}>
            <span style={styles.metric}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={styles.metricIcon}>
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              {tool.comments}
            </span>
          </div>
          <a
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.visitButton}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-text)';
              e.currentTarget.style.color = 'var(--color-background)';
              e.currentTarget.style.borderColor = 'var(--color-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-text)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            Visit
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={styles.visitIcon}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </motion.a>
  );
};

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

const styles = {
  card: {
    display: 'block',
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'all 0.2s ease',
    border: '1px solid var(--color-card-border)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px 16px 0 16px',
  },
  logoContainer: {
    width: '48px',
    height: '48px',
    overflow: 'hidden',
    flexShrink: 0,
    border: '1px solid var(--color-border)',
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-text)',
    color: 'var(--color-background)',
    fontSize: '20px',
    fontWeight: 600,
  },
  upvoteContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  upvoteButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: 'var(--color-background-secondary)',
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    transition: 'all 0.2s ease',
  },
  upvoteIcon: {
    width: '16px',
    height: '16px',
  },
  upvoteCount: {
    fontSize: '12px',
    fontWeight: 600,
  },
  cardContent: {
    padding: '12px 16px 16px 16px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-text)',
    margin: 0,
  },
  newBadge: {
    padding: '2px 6px',
    backgroundColor: 'var(--color-text)',
    color: 'var(--color-background)',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.5px',
  },
  dealBadge: {
    padding: '2px 6px',
    backgroundColor: 'var(--color-text-muted)',
    color: 'var(--color-background)',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.5px',
  },
  description: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    margin: '0 0 12px 0',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  tagsRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  tag: {
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  categoryTag: {
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: 'var(--color-tag-bg)',
    color: 'var(--color-text-muted)',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '12px',
    borderTop: '1px solid var(--color-border)',
  },
  metrics: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  metric: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--color-text-muted)',
  },
  metricIcon: {
    width: '14px',
    height: '14px',
  },
  visitButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--color-text)',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
  },
  visitIcon: {
    width: '12px',
    height: '12px',
  },
};

export default ToolCard;
