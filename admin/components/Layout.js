import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const router = useRouter();
  const path = router.pathname;

  return (
    <>
      <nav className="nav">
        <span className="nav-brand">FYI GTM</span>
        <Link href="/" className={path === '/' ? 'active' : ''}>Dashboard</Link>
        <Link href="/tools" className={path.startsWith('/tools') ? 'active' : ''}>Tools</Link>
      </nav>
      <div className="container">
        {children}
      </div>
    </>
  );
}
