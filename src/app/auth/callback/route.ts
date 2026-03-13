import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') || '/dashboard';

  if (code) {
    const cookieStore = await cookies();

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
            // Log error but don't block login (Issue 6)
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
          // Log error but don't block login
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

      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
