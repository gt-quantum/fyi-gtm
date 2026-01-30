import { useUpvote } from '../../hooks/useUpvote';

// Variants: 'card' (in ToolCard), 'list' (in ToolListItem), 'detail' (in [slug].astro)
export default function UpvoteButton({ slug, initialUpvotes = 0, variant = 'card' }) {
  const { upvotes, hasVoted, isLoading, handleUpvote } = useUpvote(slug, initialUpvotes);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Common arrow icon - filled when voted
  const ArrowIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill={hasVoted ? 'currentColor' : 'none'}
      stroke={hasVoted ? 'none' : 'currentColor'}
      strokeWidth={hasVoted ? 0 : 16}
      style={styles.icon[variant]}
    >
      {hasVoted ? (
        <path d="M236.78 211.81A24.34 24.34 0 0 1 215.45 224H40.55a24.34 24.34 0 0 1-21.33-12.19a23.51 23.51 0 0 1 0-23.72l87.43-151.87a24.76 24.76 0 0 1 42.7 0l87.45 151.87a23.51 23.51 0 0 1-.02 23.72Z" />
      ) : (
        <path d="M215.45 216H40.55a16.34 16.34 0 0 1-14.29-8.19a15.51 15.51 0 0 1 0-15.64l87.44-151.85a16.76 16.76 0 0 1 28.6 0l87.45 151.85a15.51 15.51 0 0 1 0 15.64a16.34 16.34 0 0 1-14.3 8.19Z" />
      )}
    </svg>
  );

  // Alternative stroke-based arrow for card variant
  const CardArrowIcon = () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      style={styles.icon.card}
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );

  // Use text color for voted state (works in both light and dark mode)
  const baseStyles = {
    card: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      padding: '8px 12px',
      backgroundColor: hasVoted ? 'var(--color-text)' : 'var(--color-background-secondary)',
      border: '1px solid',
      borderColor: hasVoted ? 'var(--color-text)' : 'var(--color-border)',
      cursor: hasVoted ? 'default' : 'pointer',
      color: hasVoted ? 'var(--color-background)' : 'var(--color-text)',
      transition: 'all 0.2s ease',
      opacity: isLoading ? 0.7 : 1,
    },
    list: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
      padding: '10px 14px',
      background: hasVoted ? 'var(--color-text)' : 'transparent',
      border: '1px solid',
      borderColor: hasVoted ? 'var(--color-text)' : 'var(--color-border)',
      cursor: hasVoted ? 'default' : 'pointer',
      transition: 'all 0.2s',
      minWidth: '54px',
      opacity: isLoading ? 0.7 : 1,
    },
    detail: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      padding: '12px 18px',
      background: hasVoted ? 'var(--color-text)' : 'transparent',
      border: '1px solid',
      borderColor: hasVoted ? 'var(--color-text)' : 'var(--color-border)',
      cursor: hasVoted ? 'default' : 'pointer',
      transition: 'all 0.2s',
      minWidth: '60px',
      opacity: isLoading ? 0.7 : 1,
    },
  };

  const countStyles = {
    card: {
      fontSize: '12px',
      fontWeight: 600,
      color: hasVoted ? 'var(--color-background)' : 'var(--color-text)',
      transition: 'color 0.2s',
    },
    list: {
      fontSize: '13px',
      fontWeight: 600,
      color: hasVoted ? 'var(--color-background)' : 'var(--color-text)',
      transition: 'color 0.2s',
    },
    detail: {
      fontSize: '14px',
      fontWeight: 600,
      color: hasVoted ? 'var(--color-background)' : 'var(--color-text)',
      transition: 'color 0.2s',
    },
  };

  return (
    <button
      onClick={handleUpvote}
      disabled={isLoading}
      style={baseStyles[variant]}
      className={`upvote-button ${hasVoted ? 'voted' : ''}`}
      title={hasVoted ? 'Upvoted' : 'Upvote this tool'}
      aria-label={hasVoted ? `Upvoted - ${upvotes} upvotes` : `Upvote - ${upvotes} upvotes`}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {variant === 'card' ? <CardArrowIcon /> : <ArrowIcon />}
      </span>
      <span style={countStyles[variant]}>{formatNumber(upvotes)}</span>

      <style>{`
        .upvote-button:not(.voted):hover {
          background: var(--color-text) !important;
          border-color: var(--color-text) !important;
          color: var(--color-background) !important;
        }
        .upvote-button:not(.voted):hover span {
          color: var(--color-background) !important;
        }
        .upvote-button:not(.voted):hover svg {
          color: var(--color-background) !important;
          stroke: var(--color-background) !important;
        }
      `}</style>
    </button>
  );
}

const styles = {
  icon: {
    card: {
      width: '16px',
      height: '16px',
    },
    list: {
      width: '14px',
      height: '14px',
    },
    detail: {
      width: '14px',
      height: '14px',
    },
  },
};
