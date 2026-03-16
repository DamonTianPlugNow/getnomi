import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { TimelineEvent, UpdateTimelineEventInput } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/timeline/[id] - Update timeline event
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateTimelineEventInput = await request.json();

    // First check if the event exists and belongs to the user
    const { data: existingEvent } = await supabase
      .from('timeline_events')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.event_type !== undefined) updateData.event_type = body.event_type;
    if (body.start_year !== undefined) updateData.start_year = body.start_year;
    if (body.start_month !== undefined) updateData.start_month = body.start_month;
    if (body.start_day !== undefined) updateData.start_day = body.start_day;
    if (body.end_year !== undefined) updateData.end_year = body.end_year;
    if (body.end_month !== undefined) updateData.end_month = body.end_month;
    if (body.is_current !== undefined) updateData.is_current = body.is_current;
    if (body.province !== undefined) updateData.province = body.province;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.institution !== undefined) updateData.institution = body.institution;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.description !== undefined) updateData.description = body.description;

    const { data: event, error } = await supabase
      .from('timeline_events')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update timeline event:', error);
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    return NextResponse.json({ event: event as TimelineEvent });
  } catch (error) {
    console.error('Timeline PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/timeline/[id] - Delete timeline event
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('timeline_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete timeline event:', error);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Timeline DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
