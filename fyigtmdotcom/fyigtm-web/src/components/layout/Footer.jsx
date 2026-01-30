import { useState, useEffect } from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [hoveredLink, setHoveredLink] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.getAttribute('data-theme') !== 'light');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const LinkWithHover = ({ href, children, id, external }) => (
    <a
      href={href}
      style={{
        ...styles.link,
        color: hoveredLink === id ? 'var(--color-text)' : 'var(--color-text-muted)',
      }}
      onMouseEnter={() => setHoveredLink(id)}
      onMouseLeave={() => setHoveredLink(null)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.grid} className="footer-grid">
          {/* Brand Column */}
          <div style={styles.brandColumn} className="footer-brand">
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
            <p style={styles.tagline}>
              Your go-to-market intelligence platform. Discover tools, strategies, and insights to accelerate growth.
            </p>
            <div style={styles.social}>
              <a
                href="https://twitter.com/fyigtm"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.socialLink}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-text)';
                  e.currentTarget.style.color = 'var(--color-background)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-background-tertiary)';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" style={styles.socialIcon}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com/company/fyigtm"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.socialLink}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-text)';
                  e.currentTarget.style.color = 'var(--color-background)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-background-tertiary)';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" style={styles.socialIcon}>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div style={styles.linksColumn}>
            <h4 style={styles.columnTitle}>Browse</h4>
            <nav style={styles.links}>
              <LinkWithHover href="/new" id="new">New Tools</LinkWithHover>
              <LinkWithHover href="/featured" id="featured">Featured</LinkWithHover>
              <LinkWithHover href="/top" id="top">Top Rated</LinkWithHover>
              <LinkWithHover href="/deals" id="deals">Deals</LinkWithHover>
              <LinkWithHover href="/categories" id="categories">Categories</LinkWithHover>
            </nav>
          </div>

          <div style={styles.linksColumn}>
            <h4 style={styles.columnTitle}>Company</h4>
            <nav style={styles.links}>
              <LinkWithHover href="/about" id="about">About</LinkWithHover>
              <LinkWithHover href="/submit" id="submit">Submit a Tool</LinkWithHover>
              <LinkWithHover href="/advertise" id="advertise">Advertise</LinkWithHover>
              <LinkWithHover href="mailto:hello@fyigtm.com" id="contact">Contact</LinkWithHover>
            </nav>
          </div>

          <div style={styles.linksColumn}>
            <h4 style={styles.columnTitle}>Legal</h4>
            <nav style={styles.links}>
              <LinkWithHover href="/privacy" id="privacy">Privacy Policy</LinkWithHover>
              <LinkWithHover href="/terms" id="terms">Terms of Service</LinkWithHover>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={styles.bottomBar} className="footer-bottom">
          <p style={styles.copyright}>
            {currentYear} FYI GTM. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    backgroundColor: 'var(--color-background-secondary)',
    borderTop: '1px solid var(--color-border)',
    padding: '48px 0 24px 0',
    marginTop: 'auto',
  },
  container: {
    maxWidth: 'var(--container-max-width)',
    margin: '0 auto',
    padding: '0 24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '48px',
    marginBottom: '48px',
  },
  brandColumn: {
    gridColumn: 'span 1',
  },
  logo: {
    display: 'inline-block',
    marginBottom: '16px',
  },
  logoImage: {
    height: '20px',
    width: 'auto',
    transition: 'filter 0.2s ease',
  },
  tagline: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
    margin: '0 0 16px 0',
  },
  social: {
    display: 'flex',
    gap: '8px',
  },
  socialLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    backgroundColor: 'var(--color-background-tertiary)',
    color: 'var(--color-text-muted)',
    transition: 'all 0.2s ease',
    border: '1px solid var(--color-border)',
  },
  socialIcon: {
    width: '16px',
    height: '16px',
  },
  linksColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  columnTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text)',
    margin: '0 0 16px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  links: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  link: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  },
  bottomBar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: '24px',
    borderTop: '1px solid var(--color-border)',
  },
  copyright: {
    fontSize: '13px',
    color: 'var(--color-text-light)',
    margin: 0,
  },
};

// Add responsive styles
if (typeof window !== 'undefined') {
  const existingStyle = document.getElementById('footer-responsive-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'footer-responsive-styles';
    style.textContent = `
      @media (max-width: 768px) {
        .footer-grid {
          grid-template-columns: 1fr 1fr !important;
          gap: 32px !important;
        }
        .footer-brand {
          grid-column: span 2 !important;
        }
        .footer-bottom {
          flex-direction: column !important;
          gap: 8px !important;
          text-align: center;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

export default Footer;
