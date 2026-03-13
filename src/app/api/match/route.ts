import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { inngest } from '@/inngest/client';
import { z } from 'zod';

/**
 * GET /api/match - Get current user's matches
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
    const intent = searchParams.get('intent');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('matches')
      .select(
        `
        *,
        user_a:users!user_a_id(id, name, avatar_url),
        user_b:users!user_b_id(id, name, avatar_url),
        agent_a:agent_profiles!agent_a_id(id, summary, talking_points),
        agent_b:agent_profiles!agent_b_id(id, summary, talking_points),
        meeting:meetings(id, status, scheduled_at, meeting_url)
      `,
        { count: 'exact' }
      )
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (intent) {
      query = query.eq('intent', intent);
    }

    const { data: matches, error, count } = await query;

    if (error) {
      console.error('Error fetching matches:', error);
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    // Transform matches to include "other user" perspective
    const transformedMatches = matches?.map((match) => {
      const isUserA = match.user_a_id === user.id;
      return {
        ...match,
        other_user: isUserA ? match.user_b : match.user_a,
        other_agent: isUserA ? match.agent_b : match.agent_a,
        my_approved: isUserA ? match.user_a_approved : match.user_b_approved,
        their_approved: isUserA ? match.user_b_approved : match.user_a_approved,
      };
    });

    return NextResponse.json({
      matches: transformedMatches,
      total: count,
      limit,
      offset,
    });
  } catch (err) {
    console.error('Match GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Schema for match actions
const matchActionSchema = z.object({
  match_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
});

/**
 * POST /api/match - Approve or reject a match
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
    const validation = matchActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { match_id, action } = validation.data;

    // Get the match
    const { data: match, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single();

    if (fetchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Verify user is part of this match
    const isUserA = match.user_a_id === user.id;
    const isUserB = match.user_b_id === user.id;

    if (!isUserA && !isUserB) {
      return NextResponse.json({ error: 'Not authorized for this match' }, { status: 403 });
    }

    // Check if match is still actionable
    if (!['pending', 'half_approved'].includes(match.status)) {
      return NextResponse.json(
        { error: `Match is already ${match.status}` },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(match.expires_at) < new Date()) {
      // Update status to expired
      await supabase.from('matches').update({ status: 'expired' }).eq('id', match_id);
      return NextResponse.json({ error: 'Match has expired' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    if (action === 'reject') {
      // Reject the match
      const { error: updateError } = await adminClient
        .from('matches')
        .update({
          status: 'rejected',
          ...(isUserA
            ? { user_a_approved: false, user_a_approved_at: new Date().toISOString() }
            : { user_b_approved: false, user_b_approved_at: new Date().toISOString() }),
        })
        .eq('id', match_id);

      if (updateError) {
        console.error('Error rejecting match:', updateError);
        return NextResponse.json({ error: 'Failed to reject match' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Match rejected', status: 'rejected' });
    }

    // Approve the match
    const otherApproved = isUserA ? match.user_b_approved : match.user_a_approved;
    const newStatus = otherApproved === true ? 'matched' : 'half_approved';

    const { data: updatedMatch, error: updateError } = await adminClient
      .from('matches')
      .update({
        status: newStatus,
        ...(isUserA
          ? { user_a_approved: true, user_a_approved_at: new Date().toISOString() }
          : { user_b_approved: true, user_b_approved_at: new Date().toISOString() }),
      })
      .eq('id', match_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error approving match:', updateError);
      return NextResponse.json({ error: 'Failed to approve match' }, { status: 500 });
    }

    // If both approved, trigger meeting creation
    if (newStatus === 'matched') {
      await inngest.send({
        name: 'match/confirmed',
        data: {
          matchId: match_id,
          userAId: match.user_a_id,
          userBId: match.user_b_id,
        },
      });
    }

    return NextResponse.json({
      message: newStatus === 'matched' ? 'Match confirmed! Meeting will be created.' : 'Waiting for other party to approve.',
      status: newStatus,
      match: updatedMatch,
    });
  } catch (err) {
    console.error('Match POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
