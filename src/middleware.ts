import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { createServerClient } from '@supabase/ssr';

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // First, handle i18n routing
  const intlResponse = intlMiddleware(request);

  // Get the pathname without locale prefix for checking protected routes
  const pathname = request.nextUrl.pathname;
  const localePattern = /^\/(en|zh|ja|ko)(\/|$)/;
  const pathnameWithoutLocale = pathname.replace(localePattern, '/');

  // Skip Supabase session check for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return intlResponse;
  }

  // Create Supabase client for session management
  let supabaseResponse = intlResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Copy cookies to the intl response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes (without locale prefix)
  const protectedPaths = ['/dashboard', '/profile', '/matches', '/meetings', '/onboarding'];
  const isProtectedPath = protectedPaths.some((path) =>
    pathnameWithoutLocale.startsWith(path)
  );

  // Get locale from pathname
  const localeMatch = pathname.match(localePattern);
  const locale = localeMatch ? localeMatch[1] : 'en';

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('redirect', pathnameWithoutLocale);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some((path) =>
    pathnameWithoutLocale.startsWith(path)
  );

  if (isAuthPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/inngest (Inngest webhook)
     * - api/webhook (external webhooks)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/inngest|api/webhook).*)',
  ],
};
