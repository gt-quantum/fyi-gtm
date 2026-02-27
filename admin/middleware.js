import { NextResponse } from 'next/server';

/**
 * Middleware: redirect unauthenticated requests to /login.
 * Skip: /login, /api/auth, /_next, /favicon.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (
    pathname === '/login' ||
    pathname === '/api/auth' ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check session cookie
  const session = request.cookies.get('fyi_admin_session');
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
