import { motion } from 'framer-motion';

export default function CategoryTabs({ categories, activeCategory = 'all' }) {
  return (
    <div className="category-tabs-wrapper">
      <div className="category-tabs">
        <a
          href="/tools"
          className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
        >
          All
        </a>
        {categories.map((category, index) => (
          <motion.a
            key={category.slug}
            href={`/categories/${category.slug}`}
            className={`category-tab ${activeCategory === category.slug ? 'active' : ''}`}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.02 }}
          >
            {category.name}
          </motion.a>
        ))}
      </div>

      <style jsx>{`
        .category-tabs-wrapper {
          margin-bottom: 24px;
          overflow: hidden;
          width: 100%;
        }

        .category-tabs {
          display: flex;
          gap: 0;
          overflow-x: auto;
          padding-bottom: 8px;
          scrollbar-width: none;
          -ms-overflow-style: none;
          width: 100%;
        }

        .category-tabs::-webkit-scrollbar {
          display: none;
        }

        .category-tab {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 16px;
          background: transparent;
          border: 1px solid var(--color-border);
          border-right: none;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-muted);
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.2s ease;
          flex: 1;
          text-align: center;
        }

        .category-tab:first-child {
          border-left: 1px solid var(--color-border);
        }

        .category-tab:last-child {
          border-right: 1px solid var(--color-border);
        }

        .category-tab:hover {
          background: var(--color-background-secondary);
          color: var(--color-text);
        }

        .category-tab.active {
          background: var(--color-text);
          border-color: var(--color-text);
          color: var(--color-background);
        }

        .category-tab.active + .category-tab {
          border-left-color: var(--color-text);
        }

        @media (max-width: 768px) {
          .category-tab {
            flex: none;
          }
        }
      `}</style>
    </div>
  );
}
