import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/** Routes that are always public — never redirect to /auth/login. */
const PUBLIC_PREFIXES = [
  '/auth/',      // login, register, forgot-password, callback, confirm
  '/share/',     // shareable form links (lz-string URL param)
  '/f/',         // public form embed routes (future)
  '/_next/',     // Next.js internals
  '/favicon',
];

const PUBLIC_EXACT = new Set(['/', '/auth/login', '/auth/register', '/auth/forgot-password']);

/** Routes that require authentication — redirect guests to /auth/login. */
const PROTECTED_PREFIXES = ['/dashboard', '/forms/'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { response, user } = await updateSession(request);

  // Redirect unauthenticated users away from protected routes.
  if (isProtected(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from the login/register pages.
  if (user && (pathname === '/auth/login' || pathname === '/auth/register')) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    homeUrl.search = '';
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico, and common static extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
