import { useState } from 'react';
import { motion } from 'framer-motion';

const CategoryCard = ({ category, index = 0 }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.a
      href={`/categories/${category.slug}`}
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
      <div style={styles.iconContainer}>
        <span style={styles.icon}>
          {getIcon(category.icon)}
        </span>
      </div>

      <div style={styles.content}>
        <h3 style={styles.title}>{category.name}</h3>
        <p style={styles.count}>{category.toolCount} tools</p>
      </div>

      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{
          ...styles.arrow,
          transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
        }}
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </motion.a>
  );
};

function getIcon(iconName) {
  const icons = {
    'image': '01',
    'message-circle': '02',
    'edit': '03',
    'video': '04',
    'headphones': '05',
    'code': '06',
    'zap': '07',
    'search': '08',
    'trending-up': '09',
    'palette': '10',
    'briefcase': '11',
    'book': '12',
  };
  return icons[iconName] || '00';
}

const styles = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: 'var(--color-card-bg)',
    border: '1px solid var(--color-card-border)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'all 0.2s ease',
  },
  iconContainer: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: 'var(--color-background-tertiary)',
    border: '1px solid var(--color-border)',
  },
  icon: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    fontFamily: 'monospace',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-text)',
    margin: 0,
  },
  count: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    margin: '4px 0 0 0',
  },
  arrow: {
    width: '20px',
    height: '20px',
    color: 'var(--color-text-muted)',
    flexShrink: 0,
    transition: 'transform 0.2s ease',
  },
};

export default CategoryCard;
