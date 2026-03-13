import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { inngest } from '@/inngest/client';
import { z } from 'zod';
import type { CreateMemoryProfileInput, RelationshipIntent } from '@/types';

// Validation schema
const createProfileSchema = z.object({
  display_name: z.string().min(1).max(100),
  headline: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  work_experience: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        start_date: z.string(),
        end_date: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        is_current: z.boolean().optional(),
      })
    )
    .optional(),
  skills: z.array(z.string()).max(20).optional(),
  can_offer: z.array(z.string()).max(10).optional(),
  looking_for: z.array(z.string()).max(10).optional(),
  current_goals: z.array(z.string()).max(5).optional(),
  interests: z.array(z.string()).max(20).optional(),
  values: z.array(z.string()).max(10).optional(),
  intents: z.array(z.enum(['professional', 'dating', 'friendship'])).min(1),
});

const updateProfileSchema = createProfileSchema.partial();

/**
 * GET /api/profile - Get current user's profile
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
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

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching profile:', error);
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
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const { data: profile, error } = await adminClient
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

    if (error) {
      console.error('Error creating profile:', error);
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
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const input = validation.data;

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

    // Update profile
    const adminClient = createAdminClient();
    const { data: profile, error } = await adminClient
      .from('memory_profiles')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
        is_active: false, // Deactivate until new agents are generated
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
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
