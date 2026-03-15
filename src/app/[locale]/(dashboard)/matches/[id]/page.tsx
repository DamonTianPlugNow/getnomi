'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface MatchData {
  id: string;
  intent: string;
  status: string;
  match_score: number;
  match_reasons: Array<{ type: string; description: string; weight: number }>;
  user_a_id: string;
  user_b_id: string;
  user_a_approved: boolean | null;
  user_b_approved: boolean | null;
  expires_at: string;
  user_a: { id: string; name: string; avatar_url: string | null };
  user_b: { id: string; name: string; avatar_url: string | null };
  agent_a: { summary: string; talking_points: string[]; conversation_starters: string[] };
  agent_b: { summary: string; talking_points: string[]; conversation_starters: string[] };
  meeting?: Array<{ id: string; status: string; scheduled_at: string; meeting_url: string }>;
}

export default function MatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [match, setMatch] = useState<MatchData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatch = async () => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          user_a:users!user_a_id(id, name, avatar_url),
          user_b:users!user_b_id(id, name, avatar_url),
          agent_a:agent_profiles!agent_a_id(summary, talking_points, conversation_starters),
          agent_b:agent_profiles!agent_b_id(summary, talking_points, conversation_starters),
          meeting:meetings(id, status, scheduled_at, meeting_url)
        `)
        .eq('id', matchId)
        .single();

      if (error || !data) {
        setError('Match not found');
        setLoading(false);
        return;
      }

      // Verify user is part of this match
      if (data.user_a_id !== user.id && data.user_b_id !== user.id) {
        setError('Not authorized');
        setLoading(false);
        return;
      }

      setMatch(data);
      setLoading(false);
    };

    fetchMatch();
  }, [matchId, router]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!match) return;

    setActionLoading(true);
    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: match.id, action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update match');
      }

      // Refresh match data
      const supabase = createClient();
      const { data: updatedMatch } = await supabase
        .from('matches')
        .select(`
          *,
          user_a:users!user_a_id(id, name, avatar_url),
          user_b:users!user_b_id(id, name, avatar_url),
          agent_a:agent_profiles!agent_a_id(summary, talking_points, conversation_starters),
          agent_b:agent_profiles!agent_b_id(summary, talking_points, conversation_starters),
          meeting:meetings(id, status, scheduled_at, meeting_url)
        `)
        .eq('id', matchId)
        .single();

      if (updatedMatch) {
        setMatch(updatedMatch);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">{error || 'Match not found'}</h1>
          <Link href="/matches" className="text-blue-600 hover:underline">
            Back to matches
          </Link>
        </div>
      </div>
    );
  }

  const isUserA = match.user_a_id === currentUserId;
  const otherUser = isUserA ? match.user_b : match.user_a;
  const otherAgent = isUserA ? match.agent_b : match.agent_a;
  const myApproved = isUserA ? match.user_a_approved : match.user_b_approved;
  const theirApproved = isUserA ? match.user_b_approved : match.user_a_approved;
  const hasMeeting = match.meeting && match.meeting.length > 0;
  const meeting = hasMeeting ? match.meeting![0] : null;

  const canTakeAction =
    ['pending', 'half_approved'].includes(match.status) &&
    myApproved === null;

  const getIntentLabel = (intent: string) => {
    switch (intent) {
      case 'professional': return '💼 Professional';
      case 'dating': return '💕 Dating';
      case 'friendship': return '🤝 Friendship';
      default: return intent;
    }
  };

  const getReasonIcon = (type: string) => {
    switch (type) {
      case 'common_interest': return '🎯';
      case 'complementary_skill': return '🔄';
      case 'shared_goal': return '🎯';
      case 'mutual_value': return '💎';
      default: return '✨';
    }
  };

  const expiresAt = new Date(match.expires_at);
  const isExpired = expiresAt < new Date();
  const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/matches" className="text-slate-500 hover:text-slate-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Match Details</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
              {otherUser?.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.name || ''}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-medium text-slate-500">
                  {otherUser?.name?.[0] || '?'}
                </span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900">
                  {otherUser?.name || 'Unknown'}
                </h2>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                  {getIntentLabel(match.intent)}
                </span>
              </div>

              <p className="text-slate-600 mb-4">{otherAgent?.summary}</p>

              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-600 font-medium">
                  {Math.round(match.match_score * 100)}% match
                </span>
                {!isExpired && canTakeAction && (
                  <span className="text-amber-600">
                    {hoursLeft}h left to respond
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        {match.status === 'matched' && meeting && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-900">Meeting Scheduled!</h3>
                <p className="text-green-700 text-sm">
                  {new Date(meeting.scheduled_at).toLocaleString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <a
                href={meeting.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
              >
                Join Meeting
              </a>
            </div>
          </div>
        )}

        {match.status === 'half_approved' && myApproved && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-amber-900">Waiting for response</h3>
            <p className="text-amber-700 text-sm">
              You&apos;ve approved this match. Waiting for {otherUser?.name} to respond.
            </p>
          </div>
        )}

        {match.status === 'rejected' && (
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-slate-700">Match Declined</h3>
            <p className="text-slate-600 text-sm">
              This match was declined.
            </p>
          </div>
        )}

        {match.status === 'expired' && (
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-slate-700">Match Expired</h3>
            <p className="text-slate-600 text-sm">
              This match expired before both parties responded.
            </p>
          </div>
        )}

        {/* Why We Matched You */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Why we matched you
          </h3>
          <div className="space-y-3">
            {match.match_reasons?.map((reason, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-xl">{getReasonIcon(reason.type)}</span>
                <p className="text-slate-600">{reason.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Talking Points */}
        {otherAgent?.talking_points && otherAgent.talking_points.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Talking Points
            </h3>
            <ul className="space-y-2">
              {otherAgent.talking_points.map((point, index) => (
                <li key={index} className="flex items-start gap-2 text-slate-600">
                  <span className="text-blue-500 mt-1">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Conversation Starters */}
        {otherAgent?.conversation_starters && otherAgent.conversation_starters.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Conversation Starters
            </h3>
            <div className="space-y-2">
              {otherAgent.conversation_starters.map((starter, index) => (
                <div
                  key={index}
                  className="p-3 bg-blue-50 rounded-lg text-blue-700 text-sm"
                >
                  &ldquo;{starter}&rdquo;
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {canTakeAction && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
            <div className="max-w-4xl mx-auto flex gap-4">
              <button
                onClick={() => handleAction('reject')}
                disabled={actionLoading}
                className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition disabled:opacity-50"
              >
                Pass
              </button>
              <button
                onClick={() => handleAction('approve')}
                disabled={actionLoading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Approve Match'}
              </button>
            </div>
          </div>
        )}

        {/* Spacer for fixed bottom bar */}
        {canTakeAction && <div className="h-24" />}
      </main>
    </div>
  );
}
