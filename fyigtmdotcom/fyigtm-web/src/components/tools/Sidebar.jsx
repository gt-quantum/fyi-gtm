import { motion } from 'framer-motion';

export default function Sidebar({ tools, categories = [] }) {
  const featuredTools = tools.filter(t => t.featured).slice(0, 3);
  const recentlyAdded = [...tools]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3);

  return (
    <aside className="sidebar">
      {/* Featured Section */}
      {featuredTools.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-title">Featured</h3>
          <div className="sidebar-items">
            {featuredTools.map((tool, index) => (
              <SidebarItem key={tool.slug} tool={tool} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Added Section */}
      {recentlyAdded.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-title">Recently Added</h3>
          <div className="sidebar-items">
            {recentlyAdded.map((tool, index) => (
              <SidebarItem key={tool.slug} tool={tool} index={index} />
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .sidebar-section {
          background: var(--color-card-bg);
          border: 1px solid var(--color-card-border);
          padding: 16px;
        }

        .sidebar-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-text-muted);
          margin: 0 0 12px;
        }

        .sidebar-items {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
      `}</style>
    </aside>
  );
}

function SidebarItem({ tool, index }) {
  return (
    <motion.div
      className="sidebar-item"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <a href={`/tools/${tool.slug}`} className="sidebar-item-link">
        <div className="sidebar-item-icon">
          {tool.logo ? (
            <img src={tool.logo} alt={tool.name} loading="lazy" />
          ) : (
            <div className="sidebar-icon-placeholder">
              {tool.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="sidebar-item-content">
          <span className="sidebar-item-name">{tool.name}</span>
          <span className="sidebar-item-desc">{tool.description}</span>
        </div>
      </a>

      <style jsx>{`
        .sidebar-item-link {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 8px;
          text-decoration: none;
          transition: all 0.2s ease;
          border-bottom: 1px solid var(--color-border);
        }

        .sidebar-item-link:hover {
          background: var(--color-background-tertiary);
        }

        .sidebar-item:last-child .sidebar-item-link {
          border-bottom: none;
        }

        .sidebar-item-icon {
          width: 32px;
          height: 32px;
          overflow: hidden;
          flex-shrink: 0;
          background: var(--color-background-secondary);
          border: 1px solid var(--color-border);
        }

        .sidebar-item-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sidebar-icon-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-text);
          color: var(--color-background);
          font-size: 12px;
          font-weight: 600;
        }

        .sidebar-item-content {
          flex: 1;
          min-width: 0;
        }

        .sidebar-item-name {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }

        .sidebar-item-desc {
          display: block;
          font-size: 11px;
          color: var(--color-text-muted);
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </motion.div>
  );
}
