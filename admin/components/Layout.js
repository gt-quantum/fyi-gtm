import Link from 'next/link';
import { useRouter } from 'next/router';
import { colors } from '../lib/theme';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: 'grid' },
    ],
  },
  {
    label: 'Directory',
    items: [
      { href: '/tools', label: 'Tools', icon: 'wrench' },
      { href: '/directory', label: 'Entries', icon: 'file' },
    ],
  },
  {
    label: 'Newsletter',
    items: [
      { href: '/newsletter', label: 'Issues', icon: 'mail' },
      { href: '/newsletter/topics', label: 'Topics', icon: 'tag' },
      { href: '/newsletter/tips', label: 'Tips', icon: 'bulb' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/agents', label: 'Agents', icon: 'bot' },
    ],
  },
];

const icons = {
  grid: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" /><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" /><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" /><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" /></svg>,
  wrench: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.7 1.3a4 4 0 0 0-4.5 6.3L2.5 12.3a1 1 0 0 0 0 1.4l.8.8a1 1 0 0 0 1.4 0l4.7-4.7a4 4 0 0 0 6.3-4.5l-2.3 2.3-1.8-.4-.4-1.8 2.3-2.3z" fill="currentColor" /></svg>,
  file: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2h5l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" /><path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.3" /></svg>,
  mail: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M2 5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" /></svg>,
  tag: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8.5V3a1 1 0 011-1h5.5L14 7.5 8.5 13 2 8.5z" stroke="currentColor" strokeWidth="1.3" /><circle cx="5.5" cy="5.5" r="1" fill="currentColor" /></svg>,
  bulb: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a4.5 4.5 0 00-2 8.5V12h4V9.5A4.5 4.5 0 008 1z" stroke="currentColor" strokeWidth="1.2" /><path d="M6 13.5h4M6.5 15h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
  bot: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.2" /><circle cx="6" cy="9" r="1" fill="currentColor" /><circle cx="10" cy="9" r="1" fill="currentColor" /><path d="M8 2v3M5 3h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
};

export default function Layout({ children }) {
  const router = useRouter();
  const path = router.pathname;

  function isActive(href) {
    if (href === '/') return path === '/';
    return path.startsWith(href);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: colors.surface,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 10,
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${colors.border}` }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/mascot.png" alt="FYI GTM" width={28} height={28} style={{ borderRadius: 8 }} />
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>FYI GTM</span>
          </Link>
        </div>

        {/* Nav Groups */}
        <nav style={{ flex: 1, padding: '12px 8px', overflow: 'auto' }}>
          {navGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: colors.subtle, padding: '0 12px',
                marginBottom: 4,
              }}>
                {group.label}
              </div>
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 12px', borderRadius: 6, marginBottom: 1,
                      color: active ? colors.text : colors.dim,
                      background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                      fontSize: 13, fontWeight: active ? 500 : 400,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      <span style={{ display: 'flex', opacity: active ? 1 : 0.6 }}>{icons[item.icon]}</span>
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 220, minWidth: 0 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px 48px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
