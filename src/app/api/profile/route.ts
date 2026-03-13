import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { inngest } from '@/inngest/client';
import { createProfileSchema, updateProfileSchema } from '@/lib/schemas';
import type { CreateMemoryProfileInput, RelationshipIntent } from '@/types';

/**
 * GET /api/profile - Get current user's profile
 */
export async function GET() {
  const { user, supabase, error } = await requireAuth();
  if (error) return error;

  try {
    const { data: profile, error: fetchError } = await supabase
      .from('memory_profiles')
      .select(
        `
        *,
        agent_profiles (
          id,
          intent,
          summary,
          talking_points,
          conversation_starters,
          version,
          updated_at
        )
      `
      )
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching profile:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('Profile GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/profile - Create a new profile
 */
export async function POST(request: NextRequest) {
  const { user, supabase, error } = await requireAuth();
  if (error) return error;

  try {
    // Parse and validate body
    const body = await request.json();
    const validation = createProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const input: CreateMemoryProfileInput = validation.data;

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('memory_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Profile already exists. Use PUT to update.' },
        { status: 409 }
      );
    }

    // Create profile
    const adminClient = createAdminClient();
    const { data: profile, error: createError } = await adminClient
      .from('memory_profiles')
      .insert({
        user_id: user.id,
        display_name: input.display_name,
        headline: input.headline,
        location: input.location,
        work_experience: input.work_experience || [],
        skills: input.skills || [],
        can_offer: input.can_offer || [],
        looking_for: input.looking_for || [],
        current_goals: input.current_goals || [],
        interests: input.interests || [],
        values: input.values || [],
        intents: input.intents as RelationshipIntent[],
        is_active: false, // Will be activated after agent generation
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile:', createError);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    // Trigger agent profile generation
    await inngest.send({
      name: 'profile/created',
      data: {
        userId: user.id,
        memoryProfileId: profile.id,
      },
    });

    return NextResponse.json(
      {
        profile,
        message: 'Profile created. Agent profiles are being generated.',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Profile POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/profile - Update existing profile
 */
export async function PUT(request: NextRequest) {
  const { user, supabase, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();

    // Get existing profile
    const { data: existing, error: fetchError } = await supabase
      .from('memory_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Profile not found. Use POST to create.' },
        { status: 404 }
      );
    }

    const adminClient = createAdminClient();

    // Check if this is just a matching toggle (is_active only)
    if (Object.keys(body).length === 1 && 'is_active' in body) {
      const { data: profile, error: updateError } = await adminClient
        .from('memory_profiles')
        .update({
          is_active: body.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating is_active:', updateError);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
      }

      return NextResponse.json({
        profile,
        message: body.is_active ? 'Matching enabled' : 'Matching disabled',
      });
    }

    // Full profile update - validate with schema
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const input = validation.data;

    // Update profile
    const { data: profile, error: updateError } = await adminClient
      .from('memory_profiles')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
        is_active: false, // Deactivate until new agents are generated
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // Trigger agent profile regeneration
    await inngest.send({
      name: 'profile/updated',
      data: {
        userId: user.id,
        memoryProfileId: profile.id,
      },
    });

    return NextResponse.json({
      profile,
      message: 'Profile updated. Agent profiles are being regenerated.',
    });
  } catch (err) {
    console.error('Profile PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
