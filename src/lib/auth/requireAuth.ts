import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

type AuthResult =
  | { user: User; supabase: SupabaseClient; error: null }
  | { user: null; supabase: null; error: NextResponse };

/**
 * Require authentication for API routes
 * Returns the authenticated user and supabase client, or an error response
 *
 * @example
 * export async function GET() {
 *   const { user, supabase, error } = await requireAuth();
 *   if (error) return error;
 *
 *   // user and supabase are guaranteed to be defined here
 *   const { data } = await supabase.from('profiles').select().eq('user_id', user.id);
 * }
 */
export async function requireAuth(): Promise<AuthResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        user: null,
        supabase: null,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    return { user, supabase, error: null };
  } catch (err) {
    console.error('Auth error:', err);
    return {
      user: null,
      supabase: null,
      error: NextResponse.json({ error: 'Authentication failed' }, { status: 500 }),
    };
  }
}
