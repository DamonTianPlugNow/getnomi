import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectPath = searchParams.get('redirect') || '/dashboard';
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
          const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          const updateData: Record<string, unknown> = {
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

          const { error: updateError } = await adminClient
            .from('users')
            .update(updateData)
            .eq('id', user.id);

          if (updateError) {
            console.error(JSON.stringify({
              timestamp: new Date().toISOString(),
              service: 'auth',
              action: 'oauth_user_update_failed',
              userId: user.id,
              provider,
              error: updateError.message,
            }));
          }
        } catch (err) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            service: 'auth',
            action: 'oauth_user_update_error',
            userId: user.id,
            provider,
            error: err instanceof Error ? err.message : String(err),
          }));
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
