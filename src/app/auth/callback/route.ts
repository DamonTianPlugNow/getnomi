import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawRedirect = searchParams.get('redirect') || '/dashboard';
  // Validate redirect is a safe relative path (prevents open redirect attacks)
  const isValidRedirect = rawRedirect.startsWith('/') &&
                          !rawRedirect.startsWith('//') &&
                          !rawRedirect.includes('://');
  const redirectPath = isValidRedirect ? rawRedirect : '/dashboard';
  const localeParam = searchParams.get('locale');

  const cookieStore = await cookies();

  // Get locale from URL param first, then cookie, then default to 'en'
  const localeCookie = cookieStore.get('NEXT_LOCALE');
  const locale = localeParam || localeCookie?.value || 'en';
  const redirect = `/${locale}${redirectPath}`;

  console.log('Auth callback:', { code: !!code, redirectPath, locale, redirect });

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log('Auth exchange result:', { hasUser: !!data?.user, error: error?.message });

    if (!error && data.user) {
      // Save OAuth provider data to users table
      const user = data.user;
      const provider = user.app_metadata?.provider;

      if (provider === 'linkedin_oidc' || provider === 'google') {
        try {
          const updateData: Record<string, unknown> = {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.user_metadata?.full_name,
            avatar_url: user.user_metadata?.picture || user.user_metadata?.avatar_url,
          };

          if (provider === 'linkedin_oidc') {
            updateData.linkedin_id = user.user_metadata?.sub;
            updateData.linkedin_data = {
              name: user.user_metadata?.name,
              given_name: user.user_metadata?.given_name,
              family_name: user.user_metadata?.family_name,
              email: user.user_metadata?.email,
              picture: user.user_metadata?.picture,
              locale: user.user_metadata?.locale,
            };
          } else if (provider === 'google') {
            updateData.google_id = user.user_metadata?.sub;
          }

          // Use upsert to handle case where users table record doesn't exist
          const { error: upsertError } = await supabase
            .from('users')
            .upsert(updateData, { onConflict: 'id' });

          if (upsertError) {
            console.error(JSON.stringify({
              timestamp: new Date().toISOString(),
              service: 'auth',
              action: 'oauth_user_upsert_failed',
              userId: user.id,
              provider,
              error: upsertError.message,
            }));
            // Don't fail the auth flow - user can still proceed
          }
        } catch (err) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            service: 'auth',
            action: 'oauth_user_upsert_error',
            userId: user.id,
            provider,
            error: err instanceof Error ? err.message : String(err),
          }));
          // Don't fail the auth flow - user can still proceed
        }
      }

      console.log('Redirecting to:', `${origin}${redirect}`);
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // Return to login with error
  console.log('Auth failed, redirecting to login');
  return NextResponse.redirect(`${origin}/${locale}/login?error=auth_failed`);
}
