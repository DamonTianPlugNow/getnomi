import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * GET /api/meeting - Get current user's meetings
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('meetings')
      .select(
        `
        *,
        user_a:users!user_a_id(id, name, avatar_url, email),
        user_b:users!user_b_id(id, name, avatar_url, email),
        match:matches(id, intent, match_reasons)
      `,
        { count: 'exact' }
      )
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (upcoming) {
      query = query
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString());
    }

    const { data: meetings, error, count } = await query;

    if (error) {
      console.error('Error fetching meetings:', error);
      return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
    }

    // Transform meetings to include "other user" perspective
    const transformedMeetings = meetings?.map((meeting) => {
      const isUserA = meeting.user_a_id === user.id;
      return {
        ...meeting,
        other_user: isUserA ? meeting.user_b : meeting.user_a,
        my_brief: isUserA ? meeting.brief?.user_a_summary : meeting.brief?.user_b_summary,
        their_brief: isUserA ? meeting.brief?.user_b_summary : meeting.brief?.user_a_summary,
      };
    });

    return NextResponse.json({
      meetings: transformedMeetings,
      total: count,
      limit,
      offset,
    });
  } catch (err) {
    console.error('Meeting GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Schema for time slot submission
const timeSlotSchema = z.object({
  match_id: z.string().uuid(),
  available_times: z.array(z.string().datetime()).min(1).max(20),
  timezone: z.string().default('UTC'),
});

/**
 * POST /api/meeting/timeslots - Submit available time slots for a match
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
    const validation = timeSlotSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { match_id, available_times, timezone } = validation.data;

    // Verify user is part of this match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.user_a_id !== user.id && match.user_b_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this match' }, { status: 403 });
    }

    if (match.status !== 'matched') {
      return NextResponse.json(
        { error: 'Can only submit time slots for confirmed matches' },
        { status: 400 }
      );
    }

    // Upsert time slots
    const adminClient = createAdminClient();
    const { data: timeSlot, error: slotError } = await adminClient
      .from('time_slots')
      .upsert(
        {
          match_id,
          user_id: user.id,
          available_times,
          timezone,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'match_id,user_id',
        }
      )
      .select()
      .single();

    if (slotError) {
      console.error('Error saving time slots:', slotError);
      return NextResponse.json({ error: 'Failed to save time slots' }, { status: 500 });
    }

    // Check if both users have submitted time slots
    const { data: allSlots } = await adminClient
      .from('time_slots')
      .select('*')
      .eq('match_id', match_id);

    const bothSubmitted = allSlots?.length === 2;
    let commonTimes: string[] = [];

    if (bothSubmitted && allSlots) {
      const otherSlot = allSlots.find((s) => s.user_id !== user.id);
      if (otherSlot) {
        // Find intersection
        commonTimes = available_times.filter((t) =>
          otherSlot.available_times.some(
            (ot: string) => new Date(t).getTime() === new Date(ot).getTime()
          )
        );
      }
    }

    return NextResponse.json({
      timeSlot,
      bothSubmitted,
      commonTimes,
      message: bothSubmitted
        ? commonTimes.length > 0
          ? 'Common times found! Meeting will be scheduled.'
          : 'No common times found. Please coordinate with your match.'
        : 'Time slots saved. Waiting for the other party.',
    });
  } catch (err) {
    console.error('Meeting POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Schema for feedback submission
const feedbackSchema = z.object({
  meeting_id: z.string().uuid(),
  overall_rating: z.number().int().min(1).max(5),
  would_meet_again: z.boolean(),
  highlights: z.string().max(1000).optional(),
  improvements: z.string().max(1000).optional(),
  no_show: z.boolean().default(false),
});

/**
 * PUT /api/meeting - Submit feedback for a meeting
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
    const validation = feedbackSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { meeting_id, overall_rating, would_meet_again, highlights, improvements, no_show } =
      validation.data;

    // Verify user is part of this meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meeting_id)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (meeting.user_a_id !== user.id && meeting.user_b_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this meeting' }, { status: 403 });
    }

    const targetUserId = meeting.user_a_id === user.id ? meeting.user_b_id : meeting.user_a_id;

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('feedback')
      .select('id')
      .eq('meeting_id', meeting_id)
      .eq('user_id', user.id)
      .single();

    if (existingFeedback) {
      return NextResponse.json({ error: 'Feedback already submitted' }, { status: 409 });
    }

    // Submit feedback
    const adminClient = createAdminClient();
    const { data: feedback, error: feedbackError } = await adminClient
      .from('feedback')
      .insert({
        meeting_id,
        user_id: user.id,
        target_user_id: targetUserId,
        overall_rating,
        would_meet_again,
        highlights,
        improvements,
        no_show,
      })
      .select()
      .single();

    if (feedbackError) {
      console.error('Error submitting feedback:', feedbackError);
      return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
    }

    // Update meeting status if this is the first feedback and it indicates completion
    if (!no_show && meeting.status === 'scheduled') {
      await adminClient
        .from('meetings')
        .update({ status: 'completed' })
        .eq('id', meeting_id);
    } else if (no_show) {
      await adminClient
        .from('meetings')
        .update({ status: 'no_show' })
        .eq('id', meeting_id);
    }

    return NextResponse.json({
      feedback,
      message: 'Feedback submitted successfully. Thank you!',
    });
  } catch (err) {
    console.error('Meeting PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
