import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { TimelineEvent, CreateTimelineEventInput } from '@/types/database';

// GET /api/timeline - Get user's timeline events
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: events, error } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('user_id', user.id)
      .order('start_year', { ascending: true });

    if (error) {
      console.error('Failed to fetch timeline events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({ events: events as TimelineEvent[] });
  } catch (error) {
    console.error('Timeline GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/timeline - Create new timeline event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateTimelineEventInput = await request.json();

    // Validate required fields
    if (!body.event_type || !body.title) {
      return NextResponse.json(
        { error: 'event_type and title are required' },
        { status: 400 }
      );
    }

    const { data: event, error } = await supabase
      .from('timeline_events')
      .insert({
        user_id: user.id,
        event_type: body.event_type,
        start_year: body.start_year,
        start_month: body.start_month,
        start_day: body.start_day,
        end_year: body.end_year,
        end_month: body.end_month,
        is_current: body.is_current || false,
        province: body.province,
        city: body.city,
        title: body.title,
        institution: body.institution,
        position: body.position,
        description: body.description,
        source: body.source || 'manual',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create timeline event:', error);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json({ event: event as TimelineEvent }, { status: 201 });
  } catch (error) {
    console.error('Timeline POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
