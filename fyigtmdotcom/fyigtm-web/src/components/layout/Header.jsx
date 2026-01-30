import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';

const navItems = [
  { label: 'All', href: '/' },
  { label: 'New', href: '/new' },
  { label: 'Featured', href: '/featured' },
  { label: 'Top', href: '/top' },
  { label: 'Deals', href: '/deals' },
  { label: 'Categories', href: '/categories' },
  { label: 'Newsletter', href: '/newsletter' },
];

const Header = () => {
  const [currentPath, setCurrentPath] = useState('/');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    setCurrentPath(window.location.pathname);
    document.addEventListener('astro:after-swap', () => {
      setCurrentPath(window.location.pathname);
      setMobileMenuOpen(false);
    });
  }, []);

  return (
    <>
      <header style={styles.header}>
        <div style={styles.container}>
          {/* Logo */}
          <a href="/" style={styles.logo}>
            <img
              src="/fyigtm-logo.png"
              alt="FYI GTM"
              style={{
                ...styles.logoImage,
                filter: isDarkMode ? 'none' : 'invert(1)',
              }}
            />
          </a>

          {/* Desktop Nav */}
          <nav style={styles.nav} className="header-nav">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  ...styles.navLink,
                  color: currentPath === item.href
                    ? 'var(--color-text)'
                    : 'var(--color-text-muted)',
                  fontWeight: currentPath === item.href ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  setHoveredItem(item.href);
                  e.target.style.color = 'var(--color-text)';
                }}
                onMouseLeave={(e) => {
                  setHoveredItem(null);
                  e.target.style.color = currentPath === item.href
                    ? 'var(--color-text)'
                    : 'var(--color-text-muted)';
                }}
              >
                {item.label}
                <span style={{
                  ...styles.navUnderline,
                  transform: (currentPath === item.href || hoveredItem === item.href)
                    ? 'scaleX(1)'
                    : 'scaleX(0)',
                }} />
              </a>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div style={styles.actions}>
            <button
              onClick={toggleTheme}
              style={styles.themeToggle}
              title="Toggle theme"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              {isDarkMode ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20 }}>
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20 }}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <a
              href="/submit"
              style={styles.submitBtn}
              className="header-submit"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-text)';
                e.currentTarget.style.color = 'var(--color-background)';
              }}
            >
              <span style={styles.submitText}>Submit</span>
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={styles.menuButton}
              className="header-menu-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 24, height: 24 }}>
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={styles.mobileMenu}
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  ...styles.mobileNavLink,
                  color: currentPath === item.href
                    ? 'var(--color-text)'
                    : 'var(--color-text-muted)',
                }}
              >
                {item.label}
              </a>
            ))}
            <a href="/submit" style={styles.mobileSubmitBtn}>
              Submit Tool
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const styles = {
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 'var(--header-height)',
    backgroundColor: 'var(--color-background)',
    borderBottom: '1px solid var(--color-border)',
    zIndex: 1000,
  },
  container: {
    maxWidth: 'var(--container-max-width)',
    margin: '0 auto',
    padding: '0 24px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    flexShrink: 0,
  },
  logoImage: {
    height: '24px',
    width: 'auto',
    transition: 'filter 0.2s ease',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    justifyContent: 'center',
  },
  navLink: {
    position: 'relative',
    padding: '8px 14px',
    fontSize: '14px',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    whiteSpace: 'nowrap',
  },
  navUnderline: {
    position: 'absolute',
    bottom: '4px',
    left: '14px',
    right: '14px',
    height: '1px',
    backgroundColor: 'var(--color-text)',
    transformOrigin: 'left',
    transition: 'transform 0.3s ease',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  themeToggle: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-muted)',
    transition: 'color 0.2s ease',
  },
  submitBtn: {
    padding: '8px 16px',
    backgroundColor: 'var(--color-text)',
    color: 'var(--color-background)',
    border: '1px solid var(--color-text)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    fontSize: '14px',
    fontWeight: 500,
  },
  submitText: {
    lineHeight: 1,
  },
  menuButton: {
    display: 'none',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    color: 'var(--color-text)',
  },
  mobileMenu: {
    position: 'fixed',
    top: 'var(--header-height)',
    left: 0,
    right: 0,
    backgroundColor: 'var(--color-background)',
    borderBottom: '1px solid var(--color-border)',
    padding: '16px 24px',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  mobileNavLink: {
    padding: '16px 0',
    fontSize: '16px',
    textDecoration: 'none',
    borderBottom: '1px solid var(--color-border)',
    transition: 'color 0.2s ease',
  },
  mobileSubmitBtn: {
    marginTop: '16px',
    padding: '14px 16px',
    backgroundColor: 'var(--color-text)',
    color: 'var(--color-background)',
    fontSize: '16px',
    fontWeight: 500,
    textDecoration: 'none',
    textAlign: 'center',
    border: '1px solid var(--color-text)',
    transition: 'all 0.2s ease',
  },
};

// Add responsive styles via CSS
if (typeof window !== 'undefined') {
  const existingStyle = document.getElementById('header-responsive-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'header-responsive-styles';
    style.textContent = `
      @media (max-width: 1024px) {
        .header-nav { display: none !important; }
      }
      @media (max-width: 768px) {
        .header-submit { display: none !important; }
        .header-menu-btn { display: flex !important; }
      }
    `;
    document.head.appendChild(style);
  }
}

export default Header;
