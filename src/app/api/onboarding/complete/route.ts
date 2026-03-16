import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrichTimelineEvents } from '@/lib/ai/enrich-timeline';
import { inngest } from '@/inngest/client';
import type { CreateTimelineEventInput } from '@/types/database';

interface CompleteOnboardingInput {
  linkedinUrl?: string;
  birthDate?: string;
  birthProvince?: string;
  birthCity?: string;
  timelineEvents: CreateTimelineEventInput[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CompleteOnboardingInput = await request.json();

    // Enrich timeline events with AI (if available)
    let enrichedEvents = body.timelineEvents;
    let enrichmentWarning: string | null = null;

    try {
      enrichedEvents = await enrichTimelineEvents(body.timelineEvents);
    } catch (enrichError) {
      console.error('Failed to enrich timeline events:', enrichError);
      enrichmentWarning = 'AI enrichment skipped due to an error';
      // Continue without enrichment
    }

    // Prepare events for RPC call
    const eventsForRpc = enrichedEvents.map((event) => ({
      event_type: event.event_type,
      start_year: event.start_year,
      start_month: event.start_month,
      start_day: event.start_day,
      end_year: event.end_year,
      end_month: event.end_month,
      is_current: event.is_current || false,
      province: event.province,
      city: event.city,
      title: event.title,
      institution: event.institution,
      position: event.position,
      description: event.description,
    }));

    // Call RPC function for atomic operation
    const { data: rpcResult, error: rpcError } = await supabase.rpc('complete_onboarding', {
      p_user_id: user.id,
      p_linkedin_url: body.linkedinUrl || null,
      p_birth_date: body.birthDate || null,
      p_birth_province: body.birthProvince || null,
      p_birth_city: body.birthCity || null,
      p_timeline_events: eventsForRpc,
    });

    if (rpcError) {
      console.error('Failed to complete onboarding:', rpcError);
      return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
    }

    // Handle idempotent response
    if (rpcResult.already_completed) {
      return NextResponse.json({
        success: true,
        message: 'Onboarding already completed',
        timelineEvents: [],
        warning: enrichmentWarning,
      });
    }

    // Trigger profile/created event for agent generation and matching
    try {
      await inngest.send({
        name: 'profile/created',
        data: {
          userId: user.id,
          memoryProfileId: rpcResult.profile_id,
        },
      });
    } catch (inngestError) {
      console.error('Failed to trigger profile/created event:', inngestError);
      // Don't fail the request - onboarding is complete, agent generation can be retried
    }

    // Fetch the inserted timeline events for the response
    const { data: insertedEvents } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('source', 'onboarding')
      .order('start_year', { ascending: true });

    return NextResponse.json({
      success: true,
      timelineEvents: insertedEvents || [],
      warning: enrichmentWarning,
    });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
